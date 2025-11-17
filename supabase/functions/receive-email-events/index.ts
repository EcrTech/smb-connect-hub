import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookEvent {
  event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  email: string;
  message_id: string;
  timestamp: string;
  ip?: string;
  user_agent?: string;
  click_url?: string;
  bounce_type?: string;
  bounce_reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData: WebhookEvent = await req.json();
    console.log('Received email event:', webhookData);

    // Find recipient by external_message_id
    const { data: recipient, error: recipientError } = await supabase
      .from('email_campaign_recipients')
      .select('id, campaign_id, first_opened_at, first_clicked_at')
      .eq('external_message_id', webhookData.message_id)
      .single();

    if (recipientError || !recipient) {
      console.log('Recipient not found for message_id:', webhookData.message_id);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Update recipient based on event type
    const updates: any = { updated_at: new Date().toISOString() };
    
    switch (webhookData.event) {
      case 'delivered':
        updates.delivered = true;
        updates.delivered_at = webhookData.timestamp;
        break;
      
      case 'opened':
        updates.opened = true;
        updates.open_count = recipient.first_opened_at ? undefined : 1; // Will be handled by raw query
        if (!recipient.first_opened_at) {
          updates.first_opened_at = webhookData.timestamp;
        }
        updates.last_opened_at = webhookData.timestamp;
        break;
      
      case 'clicked':
        updates.clicked = true;
        updates.click_count = recipient.first_clicked_at ? undefined : 1; // Will be handled by raw query
        if (!recipient.first_clicked_at) {
          updates.first_clicked_at = webhookData.timestamp;
        }
        updates.last_clicked_at = webhookData.timestamp;
        break;
      
      case 'bounced':
        updates.bounced = true;
        updates.bounced_at = webhookData.timestamp;
        break;
      
      case 'complained':
        updates.complained = true;
        break;
      
      case 'unsubscribed':
        updates.unsubscribed = true;
        break;
    }

    // Update recipient
    if (webhookData.event === 'opened') {
      await supabase.rpc('increment_open_count', { 
        recipient_id: recipient.id,
        first_opened: updates.first_opened_at,
        last_opened: updates.last_opened_at
      });
    } else if (webhookData.event === 'clicked') {
      await supabase.rpc('increment_click_count', { 
        recipient_id: recipient.id,
        first_clicked: updates.first_clicked_at,
        last_clicked: updates.last_clicked_at
      });
    } else {
      await supabase
        .from('email_campaign_recipients')
        .update(updates)
        .eq('id', recipient.id);
    }

    // Insert event record
    await supabase
      .from('email_campaign_events')
      .insert({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient.id,
        recipient_email: webhookData.email,
        event_type: webhookData.event,
        external_message_id: webhookData.message_id,
        ip_address: webhookData.ip,
        user_agent: webhookData.user_agent,
        event_data: {
          click_url: webhookData.click_url,
          bounce_type: webhookData.bounce_type,
          bounce_reason: webhookData.bounce_reason,
        },
        occurred_at: webhookData.timestamp,
      });

    return new Response(JSON.stringify({ status: 'processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
