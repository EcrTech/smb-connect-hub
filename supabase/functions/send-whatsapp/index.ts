import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendWhatsAppRequest {
  conversationId?: string;
  recipientPhone: string;
  recipientName?: string;
  message: string;
  senderPhone: string;
  senderName: string;
  senderId: string;
  senderType: 'association' | 'company';
  recipientId: string;
  recipientType: 'company' | 'member';
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

    const messageData: SendWhatsAppRequest = await req.json();
    console.log('Sending WhatsApp message to:', messageData.recipientPhone);

    let conversationId = messageData.conversationId;

    // Create or update conversation
    if (!conversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          sender_id: messageData.senderId,
          sender_type: messageData.senderType,
          recipient_id: messageData.recipientId,
          recipient_type: messageData.recipientType,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (conversationError) throw conversationError;
      conversationId = newConversation.id;
    } else {
      await supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${TWILIO_WHATSAPP_FROM}`);
    formData.append('To', `whatsapp:${messageData.recipientPhone}`);
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
      console.error('Twilio error:', errorText);
      throw new Error(`Failed to send WhatsApp message: ${errorText}`);
    }

    const twilioData = await twilioResponse.json();
    console.log('Twilio response:', twilioData);

    // Store message in database
    const { data: message, error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        sender_phone: TWILIO_WHATSAPP_FROM,
        sender_name: messageData.senderName,
        recipient_phone: messageData.recipientPhone,
        body_text: messageData.message,
        direction: 'outbound',
        external_message_id: twilioData.sid,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (messageError) throw messageError;

    return new Response(
      JSON.stringify({
        success: true,
        conversationId,
        messageId: message.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
