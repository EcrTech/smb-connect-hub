import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HardDeleteRequest {
  userIds: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { userIds }: HardDeleteRequest = await req.json();
    console.log(`Hard deleting ${userIds.length} users...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      try {
        // Hard delete from members table
        const { error: memberError } = await supabaseClient
          .from('members')
          .delete()
          .eq('user_id', userId);
        
        if (memberError) {
          console.log(`Error deleting member record for ${userId}:`, memberError.message);
        }

        // Hard delete from admin_users table
        const { error: adminError } = await supabaseClient
          .from('admin_users')
          .delete()
          .eq('user_id', userId);
        
        if (adminError) {
          console.log(`Error deleting admin record for ${userId}:`, adminError.message);
        }

        // Hard delete from association_managers table
        const { error: assocError } = await supabaseClient
          .from('association_managers')
          .delete()
          .eq('user_id', userId);
        
        if (assocError) {
          console.log(`Error deleting association admin for ${userId}:`, assocError.message);
        }

        // Hard delete from company_admins table
        const { error: companyAdminError } = await supabaseClient
          .from('company_admins')
          .delete()
          .eq('user_id', userId);
        
        if (companyAdminError) {
          console.log(`Error deleting company admin for ${userId}:`, companyAdminError.message);
        }

        // Hard delete from profiles table
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileError) {
          console.log(`Error deleting profile for ${userId}:`, profileError.message);
        }

        // Finally, delete the auth user
        const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId);

        if (authError) throw authError;

        successCount++;
        console.log(`Hard deleted user: ${userId}`);
      } catch (error: any) {
        failCount++;
        errors.push(`${userId}: ${error.message}`);
        console.error(`Failed to hard delete user ${userId}:`, error);
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
