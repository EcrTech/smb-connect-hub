import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, otp, newPassword } = await req.json()

    if (!email || !otp || !newPassword) {
      throw new Error('Email, OTP code, and new password are required')
    }

    console.log('Verifying OTP for:', email)

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

    // Find the OTP record
    const { data: otpRecords, error: fetchError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError)
      throw new Error('Failed to verify code')
    }

    if (!otpRecords || otpRecords.length === 0) {
      console.log('Invalid or expired OTP')
      throw new Error('Invalid or expired verification code')
    }

    const otpRecord = otpRecords[0]
    console.log('OTP verified successfully')

    // Get user by email using proper filter
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({
      filter: `email.eq.${email}`,
      page: 1,
      perPage: 1,
    })

    if (userError || !users || users.length === 0) {
      console.error('User lookup error:', userError)
      throw new Error('User not found')
    }

    const user = users[0]

    console.log('Updating password for user:', user.id)

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Failed to update password:', updateError)
      throw new Error('Failed to update password')
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', otpRecord.id)

    console.log('Password updated successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in verify-password-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
