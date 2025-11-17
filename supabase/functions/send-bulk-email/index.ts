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
  associationId?: string;
  companyId?: string;
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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token || '');
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get all recipients from the list
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_list_recipients')
      .select('email, name')
      .eq('list_id', emailData.listId);

    if (recipientsError) throw recipientsError;

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients found in list');
    }

    // Enforce 10,000 recipient limit
    const MAX_RECIPIENTS = 10000;
    if (recipients.length > MAX_RECIPIENTS) {
      return new Response(
        JSON.stringify({
          error: `Recipient limit exceeded. Maximum ${MAX_RECIPIENTS} recipients allowed per send. You have ${recipients.length} recipients in this list.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Sending to ${recipients.length} recipients`);

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert({
        list_id: emailData.listId,
        subject: emailData.subject,
        sender_name: emailData.senderName,
        sender_email: emailData.senderEmail,
        association_id: emailData.associationId || null,
        company_id: emailData.companyId || null,
        created_by: user.id,
        total_recipients: recipients.length,
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Create recipient records
    const recipientRecords = recipients.map(r => ({
      campaign_id: campaign.id,
      email: r.email,
      name: r.name,
    }));

    await supabase
      .from('email_campaign_recipients')
      .insert(recipientRecords);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails in batches with timeout protection
    const BATCH_SIZE = 20;
    const REQUEST_TIMEOUT = 30000; // 30 seconds per request
    
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (recipient) => {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
          );
          
          const sendPromise = (async () => {
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
                  email: 'noreply@smbconnect.in',
                  name: emailData.senderName || 'SMB Connect',
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
              return;
            }

            const senderResult = await senderResponse.json();

            // Update recipient record with sent status
            await supabase
              .from('email_campaign_recipients')
              .update({
                sent: true,
                sent_at: new Date().toISOString(),
                external_message_id: senderResult.message_id,
              })
              .eq('campaign_id', campaign.id)
              .eq('email', recipient.email);

            // Insert sent event
            await supabase
              .from('email_campaign_events')
              .insert({
                campaign_id: campaign.id,
                recipient_email: recipient.email,
                event_type: 'sent',
                external_message_id: senderResult.message_id,
              });

            results.sent++;
            console.log(`Successfully sent to ${recipient.email}`);
          } catch (error: any) {
            console.error(`Error sending to ${recipient.email}:`, error);
            results.failed++;
            results.errors.push(`${recipient.email}: ${error.message}`);
          }
          })();

          try {
            await Promise.race([sendPromise, timeoutPromise]);
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${recipient.email}: ${error.message}`);
          }
        })
      );

      // Add delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
