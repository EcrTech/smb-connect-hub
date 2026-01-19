import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, X, Minus, Search, ArrowLeft, Video, MoreHorizontal, Maximize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MessageThread } from './MessageThread';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

// Helper function to get last message preview with attachment indicators
const getLastMessagePreview = (lastMsg: { content: string | null; attachments: any } | null): string => {
  if (!lastMsg) return 'No messages yet';
  
  const attachments = lastMsg.attachments as any[] | null;
  if (attachments && attachments.length > 0) {
    const hasImages = attachments.some((a: any) => a.type === 'image');
    const hasDocs = attachments.some((a: any) => a.type === 'document');
    
    if (lastMsg.content) {
      // Has both text and attachments
      if (hasImages && hasDocs) return `📎 ${lastMsg.content}`;
      if (hasImages) return `📷 ${lastMsg.content}`;
      return `📄 ${lastMsg.content}`;
    } else {
      // Only attachments, no text
      if (hasImages && hasDocs) return '📎 Attachments';
      if (hasImages) return attachments.length > 1 ? '📷 Photos' : '📷 Photo';
      return attachments.length > 1 ? '📄 Documents' : '📄 Document';
    }
  }
  
  return lastMsg.content || 'No messages yet';
};

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

      // Get member record for current user
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (!memberData) return;

      // Get chats where current member is participant
      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('member_id', memberData.id);

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
            .select('content, created_at, attachments')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (chat.type === 'direct') {
            const { data: otherParticipant } = await supabase
              .from('chat_participants')
              .select('member_id')
              .eq('chat_id', chat.id)
              .neq('member_id', memberData.id)
              .maybeSingle();

            if (otherParticipant) {
              const { data: otherMember } = await supabase
                .from('members')
                .select('user_id')
                .eq('id', otherParticipant.member_id)
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
                    lastMessage: getLastMessagePreview(lastMsg),
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
            lastMessage: getLastMessagePreview(lastMsg),
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

  const { unreadCount, refreshCount } = useUnreadMessageCount(currentUserId);

  // Floating button positioned bottom-right with scroll protection (above mobile nav)
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-20 right-6 z-50 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-20 right-6 w-72 shadow-xl z-50">
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

  const selectedConversation = conversations.find(c => c.id === selectedChatId);

  const handleVideoCall = () => {
    toast.info('Video call feature coming soon!');
  };

  const handleOpenInNewWindow = () => {
    toast.info('Open in new window feature coming soon!');
  };

  const handleMuteConversation = () => {
    toast.success('Conversation muted');
  };

  const handleDeleteConversation = () => {
    toast.success('Conversation deleted');
    handleBackToList();
  };

  return (
    <Card className="fixed bottom-20 right-6 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!showConversationList && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 flex-shrink-0"
              onClick={handleBackToList}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {!showConversationList && selectedConversation ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={selectedConversation.avatar} />
                <AvatarFallback className="text-xs bg-primary-foreground/20">
                  {selectedConversation.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{selectedConversation.name}</p>
                <p className="text-xs text-primary-foreground/70">Active now</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Messages</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!showConversationList && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleMuteConversation}>
                    Mute conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenInNewWindow}>
                    Open in new window
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteConversation} className="text-destructive">
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleVideoCall}
              >
                <Video className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleOpenInNewWindow}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </>
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
          <MessageThread chatId={selectedChatId} currentUserId={currentUserId} compact onMarkAsRead={refreshCount} />
        ) : null}
      </div>
    </Card>
  );
}
