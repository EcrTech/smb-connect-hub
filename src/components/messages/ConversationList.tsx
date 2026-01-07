import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, PenSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComposeMessageDialog } from './ComposeMessageDialog';

interface ConversationListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  currentUserId: string | null;
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  avatar?: string;
  otherMemberId?: string;
}

export function ConversationList({ selectedChatId, onSelectChat, currentUserId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
      subscribeToMessages();
    }
  }, [currentUserId]);

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadConversations = async () => {
    try {
      if (!currentUserId) return;

      // Get member record
      const { data: memberData } = await supabase
        .from('members')
        .select('id, company_id')
        .eq('user_id', currentUserId)
        .single();

      if (!memberData) return;

      // Get all chats where user is a participant
      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('member_id', memberData.id);

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const chatIds = participantData.map(p => p.chat_id);

      // Get chat details with last message
      const { data: chatsData } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          type,
          last_message_at,
          chat_participants!inner(member_id)
        `)
        .in('id', chatIds)
        .order('last_message_at', { ascending: false });

      if (!chatsData) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each chat, get the last message and other participant info
      const conversationsWithDetails = await Promise.all(
        chatsData.map(async (chat) => {
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get other participant (for direct chats)
          if (chat.type === 'direct') {
            const { data: otherParticipant } = await supabase
              .from('chat_participants')
              .select(`
                member_id,
                members!inner(
                  id,
                  user_id,
                  profiles!inner(first_name, last_name, avatar)
                )
              `)
              .eq('chat_id', chat.id)
              .neq('member_id', memberData.id)
              .maybeSingle();

            if (otherParticipant) {
              const otherProfile = (otherParticipant as any).members.profiles;
              return {
                id: chat.id,
                name: `${otherProfile.first_name} ${otherProfile.last_name}`,
                lastMessage: lastMsg?.content || 'No messages yet',
                lastMessageAt: lastMsg?.created_at || chat.last_message_at || new Date().toISOString(),
                unreadCount: 0,
                avatar: otherProfile.avatar,
                otherMemberId: (otherParticipant as any).members.id
              };
            }
          }

          return {
            id: chat.id,
            name: chat.name || 'Group Chat',
            lastMessage: lastMsg?.content || 'No messages yet',
            lastMessageAt: lastMsg?.created_at || chat.last_message_at || new Date().toISOString(),
            unreadCount: 0
          };
        })
      );

      setConversations(conversationsWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Compose Button */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Messages</h2>
          <Button 
            size="sm" 
            onClick={() => setComposeOpen(true)}
            className="gap-2"
          >
            <PenSquare className="w-4 h-4" />
            Compose
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectChat(conv.id)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-accent transition-colors text-left",
                  selectedChatId === conv.id && "bg-accent"
                )}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.avatar} />
                  <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-semibold text-sm truncate">{conv.name}</h3>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Compose Dialog */}
      <ComposeMessageDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        currentUserId={currentUserId}
        onChatCreated={onSelectChat}
      />
    </div>
  );
}
