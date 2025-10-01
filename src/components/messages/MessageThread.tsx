import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageInput } from './MessageInput';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  chatId: string;
  currentUserId: string | null;
  compact?: boolean;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar?: string;
    };
  };
  isOwn: boolean;
}

export function MessageThread({ chatId, currentUserId, compact = false }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserId && chatId) {
      loadMessages();
      loadChatInfo();
      subscribeToMessages();
    }
  }, [chatId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadChatInfo = async () => {
    try {
      const { data: chatData } = await supabase
        .from('chats')
        .select('name, type')
        .eq('id', chatId)
        .single();

      if (chatData) {
        if (chatData.type === 'direct') {
          // Get other participant's name
          const { data: memberData } = await supabase
            .from('members')
            .select('id')
            .eq('user_id', currentUserId)
            .single();

          if (memberData) {
            const { data: otherParticipant } = await supabase
              .from('chat_participants')
              .select(`
                members!inner(
                  profiles!inner(first_name, last_name)
                )
              `)
              .eq('chat_id', chatId)
              .neq('company_id', memberData.id)
              .maybeSingle();

            if (otherParticipant) {
              const profile = (otherParticipant as any).members.profiles;
              setChatName(`${profile.first_name} ${profile.last_name}`);
            }
          }
        } else {
          setChatName(chatData.name || 'Group Chat');
        }
      }
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadMessages = async () => {
    try {
      if (!currentUserId) return;

      // Get current member ID
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (!memberData) return;
      setCurrentMemberId(memberData.id);

      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          members!messages_sender_id_fkey(
            id,
            user_id,
            profiles!inner(first_name, last_name, avatar)
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        const formattedMessages = messagesData.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender: msg.members,
          isOwn: msg.sender_id === memberData.id
        }));
        setMessages(formattedMessages);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      {!compact && (
        <div className="border-b p-4 bg-card">
          <h2 className="font-semibold text-lg">{chatName}</h2>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className={cn("flex-1 p-4", compact && "h-[400px]")}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.isOwn && "flex-row-reverse"
              )}
            >
              {!message.isOwn && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.sender.profiles.avatar} />
                  <AvatarFallback>
                    {message.sender.profiles.first_name[0]}
                    {message.sender.profiles.last_name[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[70%] rounded-lg p-3",
                  message.isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {!message.isOwn && (
                  <p className="text-xs font-semibold mb-1">
                    {message.sender.profiles.first_name} {message.sender.profiles.last_name}
                  </p>
                )}
                <p className="text-sm break-words">{message.content}</p>
                <p className={cn(
                  "text-xs mt-1",
                  message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {formatMessageTime(message.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4 bg-card">
        <MessageInput 
          chatId={chatId} 
          currentMemberId={currentMemberId}
          onMessageSent={loadMessages}
        />
      </div>
    </div>
  );
}
