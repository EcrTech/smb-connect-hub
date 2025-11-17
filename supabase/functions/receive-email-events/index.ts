import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resend webhook event structure
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 
        'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    click?: { link: string };
    bounce?: { type: string; message: string };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== EMAIL WEBHOOK RECEIVED ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData: ResendWebhookEvent = await req.json();
    console.log('Event type:', webhookData.type);
    console.log('Email ID:', webhookData.data.email_id);
    console.log('To:', webhookData.data.to);

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
    };

    const ourEventType = eventTypeMap[webhookData.type];
    if (!ourEventType) {
      console.log('Ignoring unknown event type:', webhookData.type);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log('Mapped to event type:', ourEventType);

    // Find the recipient by external_message_id
    console.log('=== FINDING RECIPIENT ===');
    const { data: recipient, error: recipientError } = await supabase
      .from('email_campaign_recipients')
      .select('*')
      .eq('external_message_id', webhookData.data.email_id)
      .single();

    if (recipientError || !recipient) {
      console.error('Recipient not found:', recipientError);
      return new Response(
        JSON.stringify({ error: 'Recipient not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('Found recipient:', recipient.email, 'Campaign:', recipient.campaign_id);

    // Update recipient based on event type
    console.log('=== UPDATING RECIPIENT STATUS ===');
    const updates: any = {};
    
    switch (ourEventType) {
      case 'delivered':
        updates.delivered = true;
        updates.delivered_at = webhookData.created_at;
        break;
      case 'opened':
        updates.opened = true;
        if (!recipient.first_opened_at) {
          updates.first_opened_at = webhookData.created_at;
        }
        updates.last_opened_at = webhookData.created_at;
        break;
      case 'clicked':
        updates.clicked = true;
        if (!recipient.first_clicked_at) {
          updates.first_clicked_at = webhookData.created_at;
        }
        updates.last_clicked_at = webhookData.created_at;
        break;
      case 'bounced':
        updates.bounced = true;
        updates.bounced_at = webhookData.created_at;
        break;
      case 'complained':
        updates.complained = true;
        break;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('email_campaign_recipients')
        .update(updates)
        .eq('id', recipient.id);

      if (updateError) {
        console.error('Failed to update recipient:', updateError);
      } else {
        console.log('Updated recipient with:', updates);
      }
    }

    // Increment counters for open and click events
    if (ourEventType === 'opened') {
      console.log('Incrementing open count');
      await supabase.rpc('increment_open_count', { recipient_id: recipient.id });
    } else if (ourEventType === 'clicked') {
      console.log('Incrementing click count');
      await supabase.rpc('increment_click_count', { recipient_id: recipient.id });
    }

    // Insert event record
    console.log('=== INSERTING EVENT RECORD ===');
    const { error: eventError } = await supabase
      .from('email_campaign_events')
      .insert({
        campaign_id: recipient.campaign_id,
        recipient_id: recipient.id,
        recipient_email: recipient.email,
        event_type: ourEventType,
        external_message_id: webhookData.data.email_id,
        occurred_at: webhookData.created_at,
        event_data: webhookData.data.click ? { link: webhookData.data.click.link } : 
                    webhookData.data.bounce ? { bounce: webhookData.data.bounce } : null,
      });

    if (eventError) {
      console.error('Failed to insert event:', eventError);
    } else {
      console.log('Event record inserted successfully');
    }

    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');

    return new Response(
      JSON.stringify({ status: 'processed', event_type: ourEventType }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
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
