import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  userId: string;
  newPassword?: string;
  sendResetEmail?: boolean;
  adminPassword: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is an admin
    const { data: adminData, error: adminError } = await supabaseClient
      .from('admin_users')
      .select('is_active, is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminData?.is_active) {
      console.error('Admin verification error:', adminError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, newPassword, sendResetEmail, adminPassword }: ResetPasswordRequest = await req.json();

    if (!userId || !adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin's password
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email!,
      password: adminPassword,
    });

    if (signInError) {
      console.error('Admin password verification failed:', signInError);
      return new Response(
        JSON.stringify({ error: 'Invalid admin password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    let action;

    if (sendResetEmail) {
      // Generate password reset link and send email
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email!,
        options: {
          redirectTo: `${Deno.env.get('VITE_SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://smb-connect-hub.lovable.app'}/auth/reset-password`
        }
      });

      if (error) {
        console.error('Error generating reset link:', error);
        throw error;
      }

      result = { resetLink: data.properties.action_link };
      action = 'sent_reset_email';
      
      console.log('Password reset email sent for user:', userId);
    } else if (newPassword) {
      // Validate password length
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update password directly
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (error) {
        console.error('Error updating password:', error);
        throw error;
      }

      result = { success: true };
      action = 'reset_password';
      
      console.log('Password reset successfully for user:', userId);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either newPassword or sendResetEmail must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action in audit_logs
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: action,
        resource: 'user_password',
        resource_id: userId,
        changes: {
          admin_email: user.email,
          target_user_id: userId,
          method: sendResetEmail ? 'email_reset_link' : 'manual_password_set'
        },
      });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in admin-reset-user-password function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
