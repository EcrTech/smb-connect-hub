import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a secure random password
function generatePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

interface RegistrationRequest {
  landing_page_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  registration_data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: RegistrationRequest = await req.json();
    const { landing_page_id, email, first_name, last_name, phone, registration_data } = body;

    // Validate required fields
    if (!landing_page_id || !email || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: landing_page_id, email, first_name, last_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the landing page exists and has registration enabled
    const { data: landingPage, error: pageError } = await supabase
      .from('event_landing_pages')
      .select(`
        id,
        title,
        registration_enabled,
        association_id,
        associations (
          name
        )
      `)
      .eq('id', landing_page_id)
      .eq('is_active', true)
      .single();

    if (pageError || !landingPage) {
      console.error('Landing page not found:', pageError);
      return new Response(
        JSON.stringify({ error: 'Landing page not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!landingPage.registration_enabled) {
      return new Response(
        JSON.stringify({ error: 'Registration is not enabled for this event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already registered for this event
    const { data: existingReg } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('landing_page_id', landing_page_id)
      .eq('email', email.toLowerCase())
      .single();

    if (existingReg) {
      return new Response(
        JSON.stringify({ error: 'This email is already registered for this event' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string | null = null;
    let password: string | null = null;
    let isNewUser = false;

    if (existingUser) {
      // User already exists, just link them
      userId = existingUser.id;
    } else {
      // Create new user with auto-generated password
      password = generatePassword(14);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name,
          last_name,
          phone,
          registered_via_event: landing_page_id
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Create profile for the new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email.toLowerCase(),
          first_name,
          last_name,
          phone
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway, profile can be created later
      }
    }

    // Create the registration record
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .insert({
        landing_page_id,
        email: email.toLowerCase(),
        first_name,
        last_name,
        phone,
        user_id: userId,
        registration_data: registration_data || {},
        status: 'completed'
      })
      .select()
      .single();

    if (regError) {
      console.error('Error creating registration:', regError);
      return new Response(
        JSON.stringify({ error: 'Failed to create registration record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send welcome email with credentials (only for new users)
    if (isNewUser && password) {
      const senderApiKey = Deno.env.get('SENDER_API_KEY');
      
      if (senderApiKey) {
        const assocData = landingPage.associations as { name: string } | { name: string }[] | null;
        const associationName = Array.isArray(assocData) ? assocData[0]?.name : assocData?.name || 'SMB Connect';

        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to SMB Connect!</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee; border-top: none;">
                <p style="font-size: 16px;">Hello <strong>${first_name}</strong>,</p>
                
                <p>Thank you for registering for <strong>${landingPage.title}</strong> hosted by <strong>${associationName}</strong>!</p>
                
                <p>Your SMB Connect account has been created. Use these credentials to log in:</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px;">${password}</code></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://smb-connect-hub.lovable.app/auth/login" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Login to SMB Connect
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  <strong>Security Tip:</strong> For your security, we recommend changing your password after your first login.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #888; font-size: 12px; text-align: center;">
                  See you at the event!<br>
                  - The SMB Connect Team
                </p>
              </div>
            </body>
            </html>
          `;

          const senderResponse = await fetch('https://api.sender.net/v2/email', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${senderApiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              from: {
                email: 'noreply@smbconnect.in',
                name: 'SMB Connect',
              },
              to: [{
                email: email,
                name: `${first_name} ${last_name}`,
              }],
              subject: `Welcome to SMB Connect - Your Event Registration is Complete!`,
              html: emailHtml,
              text: `Hello ${first_name}, Thank you for registering for ${landingPage.title}! Your login credentials: Email: ${email}, Password: ${password}. Login at https://smb-connect-hub.lovable.app/auth/login`,
            }),
          });

          if (!senderResponse.ok) {
            const errorText = await senderResponse.text();
            console.error('Sender API error:', errorText);
          } else {
            console.log('Welcome email sent successfully to:', email);
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Continue anyway, registration is still successful
        }
      } else {
        console.warn('SENDER_API_KEY not configured, skipping welcome email');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isNewUser 
          ? 'Registration successful! Check your email for login credentials.'
          : 'Registration successful! You can login with your existing account.',
        registration_id: registration.id,
        is_new_user: isNewUser
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-event-registration:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
