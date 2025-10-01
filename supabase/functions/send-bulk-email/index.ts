import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkEmailRequest {
  listId: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  senderEmail: string;
  senderName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDER_API_KEY = Deno.env.get('SENDER_API_KEY');
    if (!SENDER_API_KEY) {
      throw new Error('SENDER_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailData: BulkEmailRequest = await req.json();
    console.log('Sending bulk email to list:', emailData.listId);

    // Get all recipients from the list
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_list_recipients')
      .select('email, name')
      .eq('list_id', emailData.listId);

    if (recipientsError) throw recipientsError;

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients found in list');
    }

    console.log(`Sending to ${recipients.length} recipients`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (recipient) => {
          try {
            const senderResponse = await fetch('https://api.sender.net/v2/email', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SENDER_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                from: {
                  email: emailData.senderEmail,
                  name: emailData.senderName,
                },
                to: [{
                  email: recipient.email,
                  name: recipient.name || recipient.email,
                }],
                subject: emailData.subject,
                html: emailData.bodyHtml,
                text: emailData.bodyText || emailData.bodyHtml.replace(/<[^>]*>/g, ''),
                reply_to: emailData.senderEmail,
                headers: {
                  'X-Bulk-List-ID': emailData.listId,
                },
              }),
            });

            if (!senderResponse.ok) {
              const errorText = await senderResponse.text();
              console.error(`Failed to send to ${recipient.email}:`, errorText);
              results.failed++;
              results.errors.push(`${recipient.email}: ${errorText}`);
            } else {
              results.sent++;
            }
          } catch (error: any) {
            console.error(`Error sending to ${recipient.email}:`, error);
            results.failed++;
            results.errors.push(`${recipient.email}: ${error.message}`);
          }
        })
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Bulk send complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-bulk-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
