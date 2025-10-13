import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  conversationId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  senderType: 'association' | 'company';
  senderId: string;
  recipientType: 'company' | 'member';
  recipientId: string;
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

    const emailData: SendEmailRequest = await req.json();
    console.log('Sending email:', { 
      to: emailData.recipientEmail, 
      subject: emailData.subject,
      conversationId: emailData.conversationId
    });

    // Create or update conversation
    let conversationId = emailData.conversationId;
    
    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from('email_conversations')
        .insert({
          subject: emailData.subject,
          sender_type: emailData.senderType,
          sender_id: emailData.senderId,
          recipient_type: emailData.recipientType,
          recipient_id: emailData.recipientId,
        })
        .select()
        .single();

      if (convError) throw convError;
      conversationId = newConv.id;
    } else {
      // Update last_message_at
      await supabase
        .from('email_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // Send email via Sender API
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
          email: emailData.recipientEmail,
          name: emailData.recipientName,
        }],
        subject: emailData.subject,
        html: emailData.bodyHtml,
        text: emailData.bodyText || emailData.bodyHtml.replace(/<[^>]*>/g, ''),
        reply_to: emailData.senderEmail,
        // Custom headers for tracking
        headers: {
          'X-Conversation-ID': conversationId,
          'X-Sender-Type': emailData.senderType,
          'X-Sender-ID': emailData.senderId,
        },
      }),
    });

    if (!senderResponse.ok) {
      const errorText = await senderResponse.text();
      console.error('Sender API error:', errorText);
      throw new Error(`Sender API error: ${senderResponse.status} ${errorText}`);
    }

    const senderResult = await senderResponse.json();
    console.log('Email sent via Sender:', senderResult);

    // Store message in database
    const { error: msgError } = await supabase
      .from('email_messages')
      .insert({
        conversation_id: conversationId,
        sender_email: emailData.senderEmail,
        recipient_email: emailData.recipientEmail,
        subject: emailData.subject,
        body_html: emailData.bodyHtml,
        body_text: emailData.bodyText,
        direction: 'outbound',
        external_message_id: senderResult.message_id || null,
        sender_name: emailData.senderName,
      });

    if (msgError) {
      console.error('Failed to store message:', msgError);
      // Don't fail the request if storage fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        conversationId,
        messageId: senderResult.message_id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
