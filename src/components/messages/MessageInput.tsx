import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReplyInfo {
  id: string;
  senderName: string;
  content: string;
}

interface MessageInputProps {
  chatId: string;
  currentMemberId: string | null;
  onMessageSent?: () => void;
  replyingTo?: ReplyInfo;
}

export function MessageInput({ chatId, currentMemberId, onMessageSent, replyingTo }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() || !currentMemberId || sending) return;

    setSending(true);
    try {
      // If replying, prepend the reply context
      let finalContent = message.trim();
      if (replyingTo) {
        finalContent = `↩️ Replying to ${replyingTo.senderName}: "${replyingTo.content.substring(0, 30)}${replyingTo.content.length > 30 ? '...' : ''}"\n\n${finalContent}`;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentMemberId,
          content: finalContent
        });

      if (error) throw error;

      // Update chat's last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);

      setMessage('');
      onMessageSent?.();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <Textarea
        placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : "Type a message..."}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[60px] max-h-[120px] resize-none"
        disabled={sending}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!message.trim() || sending}
        className="h-[60px] w-[60px]"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
}
