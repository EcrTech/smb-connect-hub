import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, userId } = await req.json();

    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: 'Token and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Accepting company invitation:', { token, userId });

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation not found:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'Invitation already accepted' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user email to verify
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user || user.email !== invitation.email) {
      console.error('User verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Email does not match invitation' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: invitation.company_name,
        email: invitation.email,
        association_id: invitation.association_id,
        created_by: userId,
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create company', details: companyError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Company created:', company);

    // Update or create member record
    const { data: existingMember } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      // Update existing member with company
      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({
          company_id: company.id,
          role: 'owner',
        })
        .eq('user_id', userId);

      if (memberUpdateError) {
        console.error('Error updating member:', memberUpdateError);
        // Don't fail the whole operation, member can be updated manually
      }
    } else {
      // Create new member record
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: userId,
          company_id: company.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error creating member:', memberError);
        // Don't fail the whole operation
      }
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('company_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('token', token);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail since company is already created
    }

    console.log('Company invitation accepted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        company: {
          id: company.id,
          name: company.name,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error accepting company invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
