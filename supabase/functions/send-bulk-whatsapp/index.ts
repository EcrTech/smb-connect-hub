import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkWhatsAppRequest {
  listId: string;
  message: string;
  senderPhone: string;
  senderName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      throw new Error('Twilio credentials are not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const messageData: BulkWhatsAppRequest = await req.json();
    console.log('Sending bulk WhatsApp to list:', messageData.listId);

    // Get all recipients from the list
    const { data: recipients, error: recipientsError } = await supabase
      .from('whatsapp_list_recipients')
      .select('phone, name')
      .eq('list_id', messageData.listId);

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

    // Send WhatsApp messages in batches with timeout protection
    const BATCH_SIZE = 15;
    const REQUEST_TIMEOUT = 30000;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (recipient) => {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
          );
          
          const sendPromise = (async () => {
          try {
            const formData = new URLSearchParams();
            formData.append('From', `whatsapp:${TWILIO_WHATSAPP_FROM}`);
            formData.append('To', `whatsapp:${recipient.phone}`);
            formData.append('Body', messageData.message);

            const twilioResponse = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formData.toString(),
            });

            if (!twilioResponse.ok) {
              const errorText = await twilioResponse.text();
              console.error(`Failed to send to ${recipient.phone}:`, errorText);
              results.failed++;
              results.errors.push(`${recipient.phone}: ${errorText}`);
            } else {
              results.sent++;
            }
          } catch (error: any) {
            console.error(`Error sending to ${recipient.phone}:`, error);
            results.failed++;
            results.errors.push(`${recipient.phone}: ${error.message}`);
          }
          })();

          try {
            await Promise.race([sendPromise, timeoutPromise]);
          } catch (error: any) {
            results.failed++;
            results.errors.push(`${recipient.phone}: ${error.message}`);
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
    console.error('Error in send-bulk-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
