import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    console.log('=== BULK EMAIL REQUEST START ===');
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    console.log('=== RESEND CONFIGURATION ===');
    console.log('API Key configured: true');
    console.log('Sender domain: smbconnect.in');
    console.log('Sender email: noreply@smbconnect.in');
    
    const resend = new Resend(RESEND_API_KEY);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailData: BulkEmailRequest = await req.json();
    console.log('Request body:', JSON.stringify({
      listId: emailData.listId,
      subject: emailData.subject,
      senderName: emailData.senderName,
      senderEmail: emailData.senderEmail,
      bodyLength: emailData.bodyHtml?.length || 0
    }, null, 2));

    // Get user from auth header
    console.log('=== AUTHENTICATION ===');
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || '');
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      console.error('No user found in token');
      throw new Error('Unauthorized');
    }
    
    console.log('Authenticated user:', user.id, user.email);

    // Get all recipients from the list
    console.log('=== FETCHING RECIPIENTS ===');
    const { data: recipients, error: recipientsError } = await supabase
      .from('email_list_recipients')
      .select('email, name')
      .eq('list_id', emailData.listId);

    if (recipientsError) {
      console.error('Recipients fetch error:', recipientsError);
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      console.error('No recipients found in list');
      throw new Error('No recipients found in list');
    }
    
    console.log(`Found ${recipients.length} recipients`);

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

    // Get the list's organizational context (SECURITY: don't trust client data)
    console.log('=== ORGANIZATIONAL CONTEXT ===');
    const { data: listData, error: listError } = await supabase
      .from('email_lists')
      .select('association_id, company_id, name')
      .eq('id', emailData.listId)
      .single();

    if (listError) {
      console.error('List context error:', listError);
      throw new Error(`Failed to get list context: ${listError.message}`);
    }

    console.log('List details:', {
      name: listData.name,
      association_id: listData.association_id,
      company_id: listData.company_id
    });

    // Create campaign record with organizational context from list
    console.log('=== CREATING CAMPAIGN ===');
    const campaignData = {
      list_id: emailData.listId,
      subject: emailData.subject,
      sender_name: emailData.senderName,
      sender_email: emailData.senderEmail,
      association_id: listData.association_id,
      company_id: listData.company_id,
      created_by: user.id,
      total_recipients: recipients.length,
    };
    console.log('Campaign data:', campaignData);
    
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      throw new Error(`Failed to create campaign: ${campaignError.message}`);
    }
    
    console.log('Campaign created:', campaign.id);

    // Create recipient records
    console.log('=== CREATING RECIPIENT RECORDS ===');
    const recipientRecords = recipients.map(r => ({
      campaign_id: campaign.id,
      email: r.email,
      name: r.name,
    }));

    const { error: recipientInsertError } = await supabase
      .from('email_campaign_recipients')
      .insert(recipientRecords);

    if (recipientInsertError) {
      console.error('Recipient records error:', recipientInsertError);
      throw new Error(`Failed to create recipient records: ${recipientInsertError.message}`);
    }
    
    console.log(`Created ${recipientRecords.length} recipient records`);

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails sequentially with rate limiting
    // Resend limits: 2 requests/second, 100 emails/minute
    // Using 600ms delay = 1.67 requests/sec = 100 emails/min
    const DELAY_BETWEEN_EMAILS = 600; // milliseconds
    const REQUEST_TIMEOUT = 30000; // 30 seconds per request
    
    console.log(`=== SENDING ${recipients.length} EMAILS WITH RATE LIMITING ===`);
    console.log(`Rate: ${DELAY_BETWEEN_EMAILS}ms delay between emails (~${Math.floor(60000/DELAY_BETWEEN_EMAILS)} emails/min)`);
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`[${i + 1}/${recipients.length}] Sending to: ${recipient.email}`);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      );
      
      const sendPromise = (async () => {
        try {
          const { data: emailResult, error: emailError } = await resend.emails.send({
            from: `${emailData.senderName || 'SMB Connect'} <noreply@smbconnect.in>`,
            to: [recipient.email],
            subject: emailData.subject,
            html: emailData.bodyHtml,
            text: emailData.bodyText || emailData.bodyHtml.replace(/<[^>]*>/g, ''),
            reply_to: emailData.senderEmail,
            headers: {
              'X-Bulk-List-ID': emailData.listId,
              'X-Campaign-ID': campaign.id,
            },
          });

          if (emailError) {
            console.error(`Resend API error for ${recipient.email}:`, emailError);
            results.failed++;
            results.errors.push(`${recipient.email}: ${emailError.message}`);
            return;
          }

          if (!emailResult) {
            console.error(`No result from Resend for ${recipient.email}`);
            results.failed++;
            results.errors.push(`${recipient.email}: No result from Resend`);
            return;
          }

          console.log(`✓ Email sent to ${recipient.email}, Message ID: ${emailResult.id}`);

          // Update recipient record with sent status
          const { error: updateError } = await supabase
            .from('email_campaign_recipients')
            .update({
              sent: true,
              sent_at: new Date().toISOString(),
              external_message_id: emailResult.id,
            })
            .eq('campaign_id', campaign.id)
            .eq('email', recipient.email);

          if (updateError) {
            console.error(`Failed to update recipient record for ${recipient.email}:`, updateError);
          }

          // Insert sent event
          const { error: eventError } = await supabase
            .from('email_campaign_events')
            .insert({
              campaign_id: campaign.id,
              recipient_email: recipient.email,
              event_type: 'sent',
              external_message_id: emailResult.id,
            });

          if (eventError) {
            console.error(`Failed to insert event for ${recipient.email}:`, eventError);
          }

          results.sent++;
        } catch (error: any) {
          console.error(`Exception sending to ${recipient.email}:`, error);
          results.failed++;
          results.errors.push(`${recipient.email}: ${error.message}`);
        }
      })();

      try {
        await Promise.race([sendPromise, timeoutPromise]);
      } catch (error: any) {
        console.error(`Timeout error for ${recipient.email}:`, error);
        results.failed++;
        results.errors.push(`${recipient.email}: ${error.message}`);
      }

      // Rate limiting: wait before sending next email (except for last one)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
      }
    }

    console.log('=== BULK SEND COMPLETE ===');
    console.log('Results:', {
      total: recipients.length,
      sent: results.sent,
      failed: results.failed,
      successRate: `${((results.sent / recipients.length) * 100).toFixed(2)}%`
    });
    if (results.errors.length > 0) {
      console.log('Errors:', results.errors.slice(0, 10)); // Log first 10 errors
    }

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
    console.error('=== FATAL ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack?.split('\n').slice(0, 5).join('\n'),
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
