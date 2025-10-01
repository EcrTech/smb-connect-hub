import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, X, Minus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MessageThread } from './MessageThread';
import { cn } from '@/lib/utils';

interface FloatingChatProps {
  currentUserId: string | null;
  initialChatId?: string | null;
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  avatar?: string;
}

export function FloatingChat({ currentUserId, initialChatId }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialChatId || null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);

  useEffect(() => {
    if (isOpen && currentUserId) {
      loadConversations();
    }
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (initialChatId && !isOpen) {
      setSelectedChatId(initialChatId);
      setIsOpen(true);
      setShowConversationList(false);
    }
  }, [initialChatId]);

  const loadConversations = async () => {
    try {
      if (!currentUserId) return;

      const { data: memberData } = await supabase
        .from('members')
        .select('id, company_id')
        .eq('user_id', currentUserId)
        .single();

      if (!memberData) return;

      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('company_id', memberData.id);

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        return;
      }

      const chatIds = participantData.map(p => p.chat_id);

      const { data: chatsData } = await supabase
        .from('chats')
        .select('id, name, type, last_message_at')
        .in('id', chatIds)
        .order('last_message_at', { ascending: false })
        .limit(5);

      if (!chatsData) {
        setConversations([]);
        return;
      }

      const conversationsWithDetails = await Promise.all(
        chatsData.map(async (chat) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (chat.type === 'direct') {
            const { data: otherParticipant } = await supabase
              .from('chat_participants')
              .select('company_id')
              .eq('chat_id', chat.id)
              .neq('company_id', memberData.id)
              .maybeSingle();

            if (otherParticipant) {
              const { data: otherMember } = await supabase
                .from('members')
                .select('user_id')
                .eq('id', (otherParticipant as any).company_id)
                .single();

              if (otherMember) {
                const { data: otherProfile } = await supabase
                  .from('profiles')
                  .select('first_name, last_name, avatar')
                  .eq('id', otherMember.user_id)
                  .single();

                if (otherProfile) {
                  return {
                    id: chat.id,
                    name: `${otherProfile.first_name} ${otherProfile.last_name}`,
                    lastMessage: lastMsg?.content || 'No messages yet',
                    lastMessageAt: lastMsg?.created_at || chat.last_message_at || new Date().toISOString(),
                    avatar: otherProfile.avatar || undefined
                  };
                }
              }
            }
          }

          return {
            id: chat.id,
            name: chat.name || 'Group Chat',
            lastMessage: lastMsg?.content || 'No messages yet',
            lastMessageAt: lastMsg?.created_at || chat.last_message_at || new Date().toISOString()
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowConversationList(false);
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setSelectedChatId(null);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-6 right-6 w-72 shadow-xl z-50">
        <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">Messages</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsMinimized(false)}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">
            {showConversationList ? 'Messages' : 'Chat'}
          </span>
        </div>
        <div className="flex gap-1">
          {!showConversationList && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={handleBackToList}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(true)}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showConversationList ? (
          <div className="flex flex-col h-full">
            {/* Search */}
            <div className="p-3 border-b">
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

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No conversations yet
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectChat(conv.id)}
                      className="w-full p-3 flex items-start gap-3 hover:bg-accent transition-colors text-left"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conv.avatar} />
                        <AvatarFallback>{conv.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{conv.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : selectedChatId ? (
          <MessageThread chatId={selectedChatId} currentUserId={currentUserId} compact />
        ) : null}
      </div>
    </Card>
  );
}
