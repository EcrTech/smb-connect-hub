import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate new cryptographically secure token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// SHA-256 hash
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

    const body = await req.json();
    const { invitation_id } = body;

    if (!invitation_id) {
      throw new Error('Missing required field: invitation_id');
    }

    console.log('Resending invitation:', invitation_id);

    // Fetch invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('id', invitation_id)
      .in('status', ['pending', 'expired'])
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invitation not found or cannot be resent');
    }

    // Verify user has permission
    if (invitation.organization_type === 'company') {
      const { data: memberCheck } = await supabase
        .from('members')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', invitation.organization_id)
        .in('role', ['owner', 'admin'])
        .single();

      if (!memberCheck) {
        throw new Error('Unauthorized: User cannot resend this invitation');
      }
    } else if (invitation.organization_type === 'association') {
      const { data: managerCheck } = await supabase
        .from('association_managers')
        .select('id')
        .eq('user_id', user.id)
        .eq('association_id', invitation.organization_id)
        .single();

      if (!managerCheck) {
        throw new Error('Unauthorized: User cannot resend this invitation');
      }
    }

    // Generate new token
    const newRawToken = generateToken();
    const newTokenHash = await hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Update invitation with new token
    const { error: updateError } = await supabase
      .from('member_invitations')
      .update({
        token_hash: newTokenHash,
        expires_at: newExpiresAt.toISOString(),
        status: 'pending',
      })
      .eq('id', invitation_id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      throw updateError;
    }

    console.log('Invitation updated with new token');

    // Fetch organization name
    let organizationName = 'the organization';
    if (invitation.organization_type === 'company') {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', invitation.organization_id)
        .single();
      if (company) organizationName = company.name;
    } else {
      const { data: association } = await supabase
        .from('associations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single();
      if (association) organizationName = association.name;
    }

    // Create new registration URL
    const registrationUrl = `${appUrl}/register?token=${newRawToken}&org=${invitation.organization_id}`;

    // Resend email
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
              <h1>🔄 Invitation Reminder</h1>
            </div>
            <div class="content">
              <p>Hello${invitation.first_name ? ' ' + invitation.first_name : ''},</p>
              
              <p>This is a reminder about your invitation to join <strong>${organizationName}</strong> on SMB Connect.</p>
              
              <div class="info-box">
                <p><strong>Role:</strong> ${invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}</p>
                ${invitation.designation ? `<p><strong>Designation:</strong> ${invitation.designation}</p>` : ''}
                ${invitation.department ? `<p><strong>Department:</strong> ${invitation.department}</p>` : ''}
              </div>
              
              <p>We've generated a new registration link for you. This invitation expires in <strong>48 hours</strong>.</p>
              
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
      const emailResponse = await resend.emails.send({
        from: 'SMB Connect <noreply@smbconnect.in>',
        to: [invitation.email],
        subject: `Reminder: Join ${organizationName} on SMB Connect`,
        html: emailHtml,
      });

      console.log('Email resent successfully:', emailResponse);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error('Failed to send email');
    }

    // Log audit trail
    await supabase
      .from('member_invitation_audit')
      .insert({
        invitation_id: invitation_id,
        action: 'resent',
        performed_by: user.id,
        notes: 'Invitation resent with new token'
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation resent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in resend-member-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.message.includes('Unauthorized') ? 401 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
