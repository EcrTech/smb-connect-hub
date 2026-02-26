import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SHA-256 hash for token verification
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { token, password, first_name, last_name } = body;

    // Validate inputs
    if (!token || !password) {
      throw new Error('Missing required fields: token and password');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    console.log('Completing member invitation');

    // Hash token to match database
    const tokenHash = await hashToken(token);

    // Fetch invitation with status='pending' and not expired
    const { data: invitation, error: inviteError } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      console.log('Invalid or expired invitation');
      throw new Error('Invalid or expired invitation');
    }

    console.log('Found valid invitation:', invitation.id);

    // Check if user already exists
    const { data: { users: existingUsersList } } = await supabase.auth.admin.listUsers({
      filter: `email.eq.${invitation.email}`,
      page: 1,
      perPage: 1,
    });
    const existingUser = existingUsersList?.[0] || null;

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
          code: 'user_exists',
          existing_user: true
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase Auth user with auto-confirmed email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: first_name || invitation.first_name,
        last_name: last_name || invitation.last_name,
      }
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      
      // Check if it's a duplicate email error
      if (authError?.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'An account with this email already exists. Please sign in instead.',
            code: 'user_exists',
            existing_user: true
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`Failed to create user account: ${authError?.message || 'Unknown error'}`);
    }

    console.log('Auth user created:', authData.user.id);

    try {
      // Create member record
      if (invitation.organization_type === 'company') {
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            user_id: authData.user.id,
            company_id: invitation.organization_id,
            role: invitation.role,
            designation: invitation.designation,
            department: invitation.department,
            is_active: true,
          });

        if (memberError) {
          console.error('Error creating member:', memberError);
          // Rollback: Delete auth user
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Failed to create member record: ${memberError.message}`);
        }

        console.log('Member record created');
      } else if (invitation.organization_type === 'association') {
        // Only create association_managers record for admin/manager roles
        if (['admin', 'manager'].includes(invitation.role)) {
          const { error: managerError } = await supabase
            .from('association_managers')
            .insert({
              user_id: authData.user.id,
              association_id: invitation.organization_id,
              is_active: true,
            });

          if (managerError) {
            console.error('Error creating association manager:', managerError);
            // Rollback: Delete auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(`Failed to create association manager record: ${managerError.message}`);
          }

          console.log('Association manager record created for admin/manager role');
        }

        // Create a member record for ALL association invitees (for general platform access)
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            user_id: authData.user.id,
            role: invitation.role, // Use the actual role from invitation
            is_active: true,
          });

        if (memberError) {
          console.error('Error creating member:', memberError);
          // Rollback: Delete auth user
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Failed to create member record: ${memberError.message}`);
        }

        console.log('Member record created for association invitee with role:', invitation.role);
      }

      // Update invitation status to 'accepted' (atomic operation for single-use enforcement)
      const { error: updateError, count } = await supabase
        .from('member_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: authData.user.id,
        })
        .eq('id', invitation.id)
        .eq('status', 'pending'); // Critical: only update if still pending

      if (updateError || count === 0) {
        console.error('Error updating invitation status or already used:', updateError);
        // Rollback: Delete auth user and member record
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('This invitation has already been used or was modified');
      }

      console.log('Invitation marked as accepted');

      // Log audit trail
      await supabase
        .from('member_invitation_audit')
        .insert({
          invitation_id: invitation.id,
          action: 'accepted',
          performed_by: authData.user.id,
          notes: 'Registration completed successfully'
        });

      return new Response(
        JSON.stringify({
          success: true,
          user_id: authData.user.id,
          message: 'Registration completed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (rollbackError: any) {
      console.error('Error during registration, attempting rollback:', rollbackError);
      // Ensure user is deleted if anything fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('Failed to rollback user creation:', deleteError);
      }
      throw rollbackError;
    }

  } catch (error: any) {
    console.error('Error in complete-member-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
