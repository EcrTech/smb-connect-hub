import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin operations
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

    // Get the user making the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !requestingUser) {
      throw new Error('Unauthorized: Invalid token')
    }

    // Check if requesting user is admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('is_active')
      .eq('user_id', requestingUser.id)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError || !adminCheck) {
      throw new Error('Unauthorized: User is not an admin')
    }

    // Parse request body
    const { email, password, first_name, last_name, phone, company_id, role, designation, department } = await req.json()

    console.log('Creating user:', { email, first_name, last_name, role })

    // Generate password if not provided
    const userPassword = password || `Temp${Math.random().toString(36).substring(7)}!`

    // Create user with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone: phone || null,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create user - no user data returned')
    }

    console.log('User created in auth:', authData.user.id)

    // Create member record
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert([{
        user_id: authData.user.id,
        company_id: company_id || null,
        role: role || 'member',
        designation: designation || null,
        department: department || null,
        is_active: true,
        created_by: requestingUser.id,
      }])

    if (memberError) {
      console.error('Member insert error:', memberError)
      // Try to delete the auth user since member creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw memberError
    }

    console.log('Member record created successfully')

    // Send invitation email if no password was provided
    if (!password) {
      console.log('Sending invitation email...')
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
      
      if (inviteError) {
        console.error('Error sending invitation:', inviteError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        message: password 
          ? 'User created successfully with the provided password.'
          : 'User created successfully. Invitation email sent.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in admin-create-user:', error)
    const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the user'
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
