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
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Emails array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Deleting ${emails.length} users...`);

    // Fetch all users once (avoid N+1 problem)
    const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers();
    if (listError) throw listError;

    // Create email to user ID map
    const emailToUser = new Map(users?.map(u => [u.email, u]) || []);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (email) => {
        try {
          const user = emailToUser.get(email);
          
          if (!user) {
            failCount++;
            errors.push(`User not found: ${email}`);
            return;
          }

          // Delete in parallel
          await Promise.all([
            supabaseClient.from('members').delete().eq('user_id', user.id),
            supabaseClient.from('profiles').delete().eq('id', user.id),
          ]);

          const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id);
          if (deleteError) throw deleteError;

          successCount++;
          console.log(`Deleted user: ${email}`);
        } catch (error: any) {
          failCount++;
          errors.push(`${email}: ${error.message}`);
          console.error(`Failed to delete user ${email}:`, error);
        }
      }));
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
