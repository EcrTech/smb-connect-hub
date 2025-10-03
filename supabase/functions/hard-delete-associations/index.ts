import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HardDeleteRequest {
  associationIds: string[];
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

    const { associationIds, password, notes }: HardDeleteRequest = await req.json();
    
    if (!associationIds || !Array.isArray(associationIds) || associationIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Association IDs array is required' }),
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

    console.log(`Hard deleting ${associationIds.length} associations...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const associationId of associationIds) {
      try {
        // Get association name for audit log
        const { data: association } = await supabaseAdmin
          .from('associations')
          .select('name')
          .eq('id', associationId)
          .single();

        // Get all companies in this association
        const { data: companies } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('association_id', associationId);

        // Delete company_admins for all companies
        if (companies && companies.length > 0) {
          const companyIds = companies.map(c => c.id);
          
          const { error: companyAdminsError } = await supabaseAdmin
            .from('company_admins')
            .delete()
            .in('company_id', companyIds);
          
          if (companyAdminsError) {
            console.log(`Error deleting company admins for association ${associationId}:`, companyAdminsError.message);
          }

          // Delete members for all companies
          const { error: membersError } = await supabaseAdmin
            .from('members')
            .delete()
            .in('company_id', companyIds);
          
          if (membersError) {
            console.log(`Error deleting members for association ${associationId}:`, membersError.message);
          }
        }

        // Delete association_managers
        const { error: managersError } = await supabaseAdmin
          .from('association_managers')
          .delete()
          .eq('association_id', associationId);
        
        if (managersError) {
          console.log(`Error deleting association managers for ${associationId}:`, managersError.message);
        }

        // Delete key_functionaries
        const { error: functionariesError } = await supabaseAdmin
          .from('key_functionaries')
          .delete()
          .eq('association_id', associationId);
        
        if (functionariesError) {
          console.log(`Error deleting key functionaries for ${associationId}:`, functionariesError.message);
        }

        // Delete companies
        const { error: companiesError } = await supabaseAdmin
          .from('companies')
          .delete()
          .eq('association_id', associationId);
        
        if (companiesError) {
          console.log(`Error deleting companies for ${associationId}:`, companiesError.message);
        }

        // Delete the association
        const { error: associationError } = await supabaseAdmin
          .from('associations')
          .delete()
          .eq('id', associationId);

        if (associationError) throw associationError;

        // Log the deletion
        await supabaseAdmin.from('audit_logs').insert({
          user_id: user.id,
          action: 'hard_delete',
          resource: 'association',
          resource_id: associationId,
          changes: { 
            deleted_association: association?.name || associationId,
            deletion_notes: notes 
          }
        });

        successCount++;
        console.log(`Hard deleted association: ${associationId}`);
      } catch (error: any) {
        failCount++;
        errors.push(`${associationId}: ${error.message}`);
        console.error(`Failed to hard delete association ${associationId}:`, error);
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
    console.error('Hard delete associations error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});