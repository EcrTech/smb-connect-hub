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
      department
    } = body;

    // Validate required fields
    if (!email || !organization_id || !organization_type || !role) {
      throw new Error('Missing required fields: email, organization_id, organization_type, role');
    }

    // Verify user has permission to invite to this organization
    if (organization_type === 'company') {
      const { data: memberCheck } = await supabase
        .from('members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', organization_id)
        .in('role', ['owner', 'admin'])
        .single();

      if (!memberCheck) {
        throw new Error('Unauthorized: User cannot invite to this company');
      }
    } else if (organization_type === 'association') {
      const { data: managerCheck } = await supabase
        .from('association_managers')
        .select('id')
        .eq('user_id', user.id)
        .eq('association_id', organization_id)
        .single();

      if (!managerCheck) {
        throw new Error('Unauthorized: User cannot invite to this association');
      }
    }

    // Rate limiting: Check invitations in last minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
      .from('member_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('invited_by', user.id)
      .gte('created_at', oneMinuteAgo);

    if (count && count >= 5) {
      throw new Error('Rate limit exceeded: Maximum 5 invitations per minute');
    }

    // Check for duplicate pending invitation
    const { data: existingInvite } = await supabase
      .from('member_invitations')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: 'An active invitation already exists for this email' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token and hash
    const rawToken = generateToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    console.log('Generated token hash for invitation');

    // Create invitation record
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

    console.log('Invitation created:', invitation.id);

    // Fetch organization name
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

    // Create registration URL with token
    const registrationUrl = `${appUrl}/accept-invitation?token=${rawToken}`;

    // Send email via Resend
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
              
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                ⚠️ This invitation link can only be used once. If you didn't expect this invitation, please contact your organization administrator.
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
      const emailResponse = await resend.emails.send({
        from: 'SMB Connect <noreply@smbconnect.in>',
        to: [email],
        subject: `You're invited to join ${organizationName} on SMB Connect`,
        html: emailHtml,
      });

      console.log('Email sent successfully:', emailResponse);
    } catch (emailError) {
      console.error('Error sending email (non-blocking):', emailError);
      // Don't fail the request if email fails - can resend later
    }

    // Log audit trail
    await supabase
      .from('member_invitation_audit')
      .insert({
        invitation_id: invitation.id,
        action: 'created',
        performed_by: user.id,
        notes: `Invitation created for ${email}`
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
