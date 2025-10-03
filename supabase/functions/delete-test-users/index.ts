import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUsersRequest {
  emails: string[];
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

    const { emails }: DeleteUsersRequest = await req.json();
    console.log(`Deleting ${emails.length} users...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        // Get user by email
        const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
        
        if (listError) throw listError;

        const user = users?.find(u => u.email === email);
        
        if (!user) {
          console.log(`User not found: ${email}`);
          failCount++;
          errors.push(`User not found: ${email}`);
          continue;
        }

        // Delete the user (this will cascade delete member records due to foreign key constraints)
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id);

        if (deleteError) throw deleteError;

        successCount++;
        console.log(`Deleted user: ${email}`);
      } catch (error: any) {
        failCount++;
        errors.push(`${email}: ${error.message}`);
        console.error(`Failed to delete user ${email}:`, error);
      }
    }

    console.log(`Deletion complete: ${successCount} deleted, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: successCount,
        failed: failCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Delete users error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
