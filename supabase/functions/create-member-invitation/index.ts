import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate cryptographically secure 64-character hex token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// SHA-256 hash for secure token storage
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const appUrl = Deno.env.get('APP_URL') || 'https://gentle-field-0d01a791e.5.azurestaticapps.net';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Creating invitation for user:', user.id);

    const body = await req.json();
    const {
      email,
      first_name,
      last_name,
      organization_id,
      organization_type,
      role,
      designation,
      department,
      invitations // Array for bulk invitations
    } = body;

    // Check if this is a bulk invitation request
    const isBulk = Array.isArray(invitations);

    if (isBulk) {
      console.log(`Processing bulk invitation request with ${invitations.length} invitations`);
    } else {
      // Validate required fields for single invitation
      if (!email || !organization_id || !organization_type || !role) {
        throw new Error('Missing required fields: email, organization_id, organization_type, role');
      }

      // Validate name fields (required by database)
      if (!first_name || !last_name) {
        throw new Error('Missing required fields: first_name, last_name');
      }

      console.log('Creating invitation with data:', {
        email,
        first_name,
        last_name,
        organization_id,
        organization_type,
        role
      });
    }

    // Verify user has permission to invite to this organization
    if (organization_type === 'company') {
      const { data: memberCheck, error: memberError } = await supabase
        .from('members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', organization_id)
        .in('role', ['owner', 'admin'])
        .single();

      if (memberError) {
        console.error('Error checking company membership:', memberError);
      }

      if (!memberCheck) {
        throw new Error('Unauthorized: User cannot invite to this company');
      }
    } else if (organization_type === 'association') {
      const { data: managerCheck, error: managerError } = await supabase
        .from('association_managers')
        .select('id')
        .eq('user_id', user.id)
        .eq('association_id', organization_id)
        .single();

      if (managerError) {
        console.error('Error checking association management:', managerError);
      }

      if (!managerCheck) {
        throw new Error('Unauthorized: User cannot invite to this association');
      }
    }

    // Rate limiting: Only apply to single invitations, not bulk
    if (!isBulk) {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { count } = await supabase
        .from('member_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_by', user.id)
        .gte('created_at', oneMinuteAgo);

      if (count && count >= 5) {
        throw new Error('Rate limit exceeded: Maximum 5 invitations per minute');
      }
    }

    // Handle bulk invitations
    if (isBulk) {
      console.log(`Processing ${invitations.length} bulk invitations`);
      
      const results = {
        successful: [] as string[],
        failed: [] as { email: string; error: string }[]
      };

      // Validate all invitations first
      const validInvitations = [];
      for (const inv of invitations) {
        if (!inv.email || !inv.first_name || !inv.last_name) {
          results.failed.push({ email: inv.email || 'unknown', error: 'Missing required fields' });
        } else {
          validInvitations.push({
            ...inv,
            email: inv.email.toLowerCase()
          });
        }
      }

      if (validInvitations.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            results,
            message: 'No valid invitations to process'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Batch check for existing pending invitations
      const emails = validInvitations.map(inv => inv.email);
      const firstInvitation = validInvitations[0];
      
      const { data: existingInvites } = await supabase
        .from('member_invitations')
        .select('email')
        .eq('organization_id', firstInvitation.organization_id)
        .eq('status', 'pending')
        .in('email', emails);

      const existingEmails = new Set((existingInvites || []).map(inv => inv.email));

      // Filter out duplicates
      const newInvitations = validInvitations.filter(inv => {
        if (existingEmails.has(inv.email)) {
          results.failed.push({ email: inv.email, error: 'Active invitation already exists' });
          return false;
        }
        return true;
      });

      if (newInvitations.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            results,
            message: 'All invitations already exist'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch organization name once
      let organizationName = 'the organization';
      if (firstInvitation.organization_type === 'company') {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', firstInvitation.organization_id)
          .single();
        if (company) organizationName = company.name;
      } else {
        const { data: association } = await supabase
          .from('associations')
          .select('name')
          .eq('id', firstInvitation.organization_id)
          .single();
        if (association) organizationName = association.name;
      }

      // Prepare all invitation records
      const invitationRecords = [];
      const tokenMap = new Map<string, string>(); // email -> raw token
      
      for (const inv of newInvitations) {
        try {
          const rawToken = generateToken();
          const tokenHash = await hashToken(rawToken);
          const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

          tokenMap.set(inv.email, rawToken);

          invitationRecords.push({
            email: inv.email,
            first_name: inv.first_name,
            last_name: inv.last_name,
            organization_id: inv.organization_id,
            organization_type: inv.organization_type,
            role: inv.role || 'member',
            designation: inv.designation || null,
            department: inv.department || null,
            token: rawToken,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            invited_by: user.id,
            status: 'pending'
          });
        } catch (err: any) {
          results.failed.push({ email: inv.email, error: err.message });
        }
      }

      // Batch insert all invitations
      const { data: insertedInvitations, error: batchInsertError } = await supabase
        .from('member_invitations')
        .insert(invitationRecords)
        .select();

      if (batchInsertError) {
        console.error('Batch insert error:', batchInsertError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create invitations: ' + batchInsertError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully inserted ${insertedInvitations.length} invitations`);

      // Send emails in background (non-blocking)
      for (const invitation of insertedInvitations) {
        const rawToken = tokenMap.get(invitation.email);
        if (!rawToken) continue;

        // Find original invitation data
        const invData = newInvitations.find(inv => inv.email === invitation.email);
        if (!invData) continue;

          // Send email asynchronously (non-blocking)
        const registrationUrl = `${appUrl}/register?token=${rawToken}`;
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 You're Invited!</h1>
                </div>
                <div class="content">
                  <p>Hello ${invData.first_name},</p>
                  <p>You've been invited to join <strong>${organizationName}</strong> on SMB Connect!</p>
                  <div class="info-box">
                    <p><strong>Role:</strong> ${(invData.role || 'member').charAt(0).toUpperCase() + (invData.role || 'member').slice(1)}</p>
                    ${invData.designation ? `<p><strong>Designation:</strong> ${invData.designation}</p>` : ''}
                    ${invData.department ? `<p><strong>Department:</strong> ${invData.department}</p>` : ''}
                  </div>
                  <p>Click the button below to complete your registration. This invitation expires in <strong>48 hours</strong>.</p>
                  <div style="text-align: center;">
                    <a href="${registrationUrl}" class="button">Complete Registration</a>
                  </div>
                  <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${registrationUrl}">${registrationUrl}</a>
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 SMB Connect. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        // Send email in background (don't await)
        resend.emails.send({
          from: 'SMB Connect <noreply@smbconnect.in>',
          to: [invitation.email],
          subject: `You're invited to join ${organizationName} on SMB Connect`,
          html: emailHtml,
        }).catch(err => console.error(`Email error for ${invitation.email}:`, err));

        results.successful.push(invitation.email);
      }

      // Batch insert audit logs
      const auditRecords = insertedInvitations.map(inv => ({
        invitation_id: inv.id,
        action: 'created',
        performed_by: user.id
      }));

      try {
        await supabase.from('member_invitation_audit').insert(auditRecords);
      } catch (auditError) {
        console.error('Audit log error:', auditError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          results,
          message: `Processed ${invitations.length} invitations: ${results.successful.length} successful, ${results.failed.length} failed`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single invitation logic
    const { data: existingInvite, error: duplicateCheckError } = await supabase
      .from('member_invitations')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .single();

    if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
      console.error('Error checking for duplicate invitation:', duplicateCheckError);
    }

    if (existingInvite) {
      console.log('Duplicate invitation found for:', email);
      return new Response(
        JSON.stringify({ error: 'An active invitation already exists for this email' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawToken = generateToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { data: invitation, error: insertError } = await supabase
      .from('member_invitations')
      .insert({
        email: email.toLowerCase(),
        first_name,
        last_name,
        organization_id,
        organization_type,
        role,
        designation,
        department,
        token: rawToken,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      throw insertError;
    }

    let organizationName = 'the organization';
    if (organization_type === 'company') {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', organization_id)
        .single();
      if (company) organizationName = company.name;
    } else {
      const { data: association } = await supabase
        .from('associations')
        .select('name')
        .eq('id', organization_id)
        .single();
      if (association) organizationName = association.name;
    }

    const registrationUrl = `${appUrl}/register?token=${rawToken}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hello${first_name ? ' ' + first_name : ''},</p>
              <p>You've been invited to join <strong>${organizationName}</strong> on SMB Connect!</p>
              <div class="info-box">
                <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                ${designation ? `<p><strong>Designation:</strong> ${designation}</p>` : ''}
                ${department ? `<p><strong>Department:</strong> ${department}</p>` : ''}
              </div>
              <p>Click the button below to complete your registration. This invitation expires in <strong>48 hours</strong>.</p>
              <div style="text-align: center;">
                <a href="${registrationUrl}" class="button">Complete Registration</a>
              </div>
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${registrationUrl}">${registrationUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 SMB Connect. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await resend.emails.send({
        from: 'SMB Connect <noreply@smbconnect.in>',
        to: [email],
        subject: `You're invited to join ${organizationName} on SMB Connect`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError);
    }

    await supabase.from('member_invitation_audit').insert({
      invitation_id: invitation.id,
      action: 'created',
      performed_by: user.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        message: 'Invitation created and email sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-member-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message.includes('Unauthorized') ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
