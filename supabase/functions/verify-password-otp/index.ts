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

    const normalizedEmail = email.trim().toLowerCase()
    console.log('Verifying OTP for normalized email:', normalizedEmail)

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

    // Find the OTP record using case-insensitive email match
    const { data: otpRecords, error: fetchError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .ilike('email', normalizedEmail)
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
      console.log('Invalid or expired OTP for:', normalizedEmail)
      throw new Error('Invalid or expired verification code')
    }

    const otpRecord = otpRecords[0]
    console.log('OTP verified successfully')

    // Deterministic user resolution: query profiles table by email
    const { data: profileMatches, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .ilike('email', normalizedEmail)

    if (profileError) {
      console.error('Error querying profiles:', profileError)
      throw new Error('Failed to resolve user identity')
    }

    let resolvedUserId: string | null = null

    if (profileMatches && profileMatches.length === 1) {
      resolvedUserId = profileMatches[0].id
      console.log('Resolved user via profiles:', resolvedUserId)
    } else if (profileMatches && profileMatches.length > 1) {
      console.error('SECURITY: Ambiguous profile match - multiple profiles for email:', normalizedEmail, 'count:', profileMatches.length)
      throw new Error('Unable to resolve user identity - please contact support')
    } else {
      // Fallback: paginated auth scan
      console.log('No profile match, falling back to paginated auth scan')
      let page = 1
      const perPage = 50
      let found = false
      while (!found) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        })
        if (listError) {
          console.error('Error listing users page', page, listError)
          break
        }
        if (!users || users.length === 0) break

        const match = users.find(u => u.email?.toLowerCase() === normalizedEmail)
        if (match) {
          resolvedUserId = match.id
          found = true
          console.log('Resolved user via paginated scan:', resolvedUserId)
        }
        if (users.length < perPage) break
        page++
      }
    }

    if (!resolvedUserId) {
      console.error('SECURITY: No user found for email:', normalizedEmail)
      throw new Error('User not found')
    }

    // Safety guard: verify the resolved auth user's email matches
    const { data: { user: resolvedUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId)

    if (getUserError || !resolvedUser) {
      console.error('Failed to fetch resolved user:', getUserError)
      throw new Error('Failed to verify user identity')
    }

    if (resolvedUser.email?.toLowerCase() !== normalizedEmail) {
      console.error('SECURITY ABORT: Email mismatch! Requested:', normalizedEmail, 'Resolved user email:', resolvedUser.email, 'User ID:', resolvedUserId)
      throw new Error('User identity verification failed - password NOT updated')
    }

    console.log('Safety guard passed. Updating password for user:', resolvedUserId)

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      resolvedUserId,
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

    console.log('Password updated successfully for user:', resolvedUserId, 'email:', normalizedEmail)

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