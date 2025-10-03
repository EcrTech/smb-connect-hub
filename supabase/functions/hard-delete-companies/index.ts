import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HardDeleteRequest {
  companyIds: string[];
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

    // Get current user using the JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    console.log('User check:', { userId: user?.id, userEmail: user?.email, error: userError?.message });
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is super admin
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

    const { companyIds, password, notes }: HardDeleteRequest = await req.json();
    
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Company IDs array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!password || !notes) {
      return new Response(
        JSON.stringify({ error: 'Password and notes are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify password by creating a fresh client to test authentication
    const authTestClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { error: authError } = await authTestClient.auth.signInWithPassword({
      email: user.email!,
      password: password
    });

    if (authError) {
      console.error('Password verification failed:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log(`Hard deleting ${companyIds.length} companies...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const companyId of companyIds) {
      try {
        // Get company name for audit log
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single();

        // Delete company_admins
        const { error: companyAdminsError } = await supabaseAdmin
          .from('company_admins')
          .delete()
          .eq('company_id', companyId);
        
        if (companyAdminsError) {
          console.log(`Error deleting company admins for ${companyId}:`, companyAdminsError.message);
        }

        // Delete members
        const { error: membersError } = await supabaseAdmin
          .from('members')
          .delete()
          .eq('company_id', companyId);
        
        if (membersError) {
          console.log(`Error deleting members for ${companyId}:`, membersError.message);
        }

        // Delete the company
        const { error: companyError } = await supabaseAdmin
          .from('companies')
          .delete()
          .eq('id', companyId);

        if (companyError) throw companyError;

        // Log the deletion
        await supabaseAdmin.from('audit_logs').insert({
          user_id: user.id,
          action: 'hard_delete',
          resource: 'company',
          resource_id: companyId,
          changes: { 
            deleted_company: company?.name || companyId,
            deletion_notes: notes 
          }
        });

        successCount++;
        console.log(`Hard deleted company: ${companyId}`);
      } catch (error: any) {
        failCount++;
        errors.push(`${companyId}: ${error.message}`);
        console.error(`Failed to hard delete company ${companyId}:`, error);
      }
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
    console.error('Hard delete companies error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});