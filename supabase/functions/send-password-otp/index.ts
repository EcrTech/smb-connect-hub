import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    console.log('Generating OTP for:', email)

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify user exists
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = users.some(u => u.email === email)

    if (!userExists) {
      // Don't reveal if user exists or not for security
      console.log('User not found but sending success response')
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in database
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_otps')
      .insert({
        email,
        otp_code: otp,
      })

    if (insertError) {
      console.error('Failed to store OTP:', insertError)
      throw new Error('Failed to generate verification code')
    }

    console.log('OTP stored successfully, sending email...')

    // Send email via Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - SMB Connect</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f9fc;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hi there,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        We received a request to reset your password for <strong>${email}</strong>.
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                        Your verification code is:
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0 30px 0;">
                            <div style="background-color: #f4f4f4; border-radius: 8px; padding: 24px; display: inline-block;">
                              <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0; font-weight: 600;">
                                VERIFICATION CODE
                              </p>
                              <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; margin: 0; font-family: 'Courier New', monospace;">
                                ${otp}
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Enter this code on the password reset page. This code will expire in <strong>1 hour</strong>.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e6e6e6; margin-top: 30px; padding-top: 20px;">
                        <tr>
                          <td>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                              If you didn't request this password reset, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                        <strong>SMB Connect Hub</strong>
                      </p>
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        Connecting Small & Medium Businesses
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    const { data, error: emailError } = await resend.emails.send({
      from: 'SMB Connect <onboarding@resend.dev>',
      to: [email],
      subject: 'Reset Your Password - Verification Code',
      html: htmlContent,
    })

    if (emailError) {
      console.error('Failed to send email:', emailError)
      throw new Error('Failed to send verification email')
    }

    console.log('Password reset OTP email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-password-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
