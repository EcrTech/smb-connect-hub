import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HardDeleteRequest {
  userIds: string[];
  password: string;
  notes: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify super admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminData?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { userIds, password, notes }: HardDeleteRequest = await req.json();
    
    // Validate inputs
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'User IDs array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!password || !notes) {
      return new Response(
        JSON.stringify({ error: 'Password and notes are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify password
    const authTestClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { error: authError } = await authTestClient.auth.signInWithPassword({
      email: user.email!,
      password: password
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    console.log(`Hard deleting ${userIds.length} users...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process in batches for better performance
    const BATCH_SIZE = 50;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (userId) => {
        try {
          // Delete related records in parallel
          await Promise.all([
            supabaseAdmin.from('members').delete().eq('user_id', userId),
            supabaseAdmin.from('admin_users').delete().eq('user_id', userId),
            supabaseAdmin.from('association_managers').delete().eq('user_id', userId),
            supabaseAdmin.from('company_admins').delete().eq('user_id', userId),
            supabaseAdmin.from('profiles').delete().eq('id', userId),
          ]);

          // Delete auth user
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (authError) throw authError;

          // Log to audit
          await supabaseAdmin.from('audit_logs').insert({
            user_id: user.id,
            action: 'hard_delete',
            resource: 'user',
            resource_id: userId,
            changes: { deletion_notes: notes }
          });

          successCount++;
          console.log(`Hard deleted user: ${userId}`);
        } catch (error: any) {
          failCount++;
          errors.push(`${userId}: ${error.message}`);
          console.error(`Failed to hard delete user ${userId}:`, error);
        }
      }));
    }

    console.log(`Hard deletion complete: ${successCount} deleted, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Hard delete users error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
