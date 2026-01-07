import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageInput } from './MessageInput';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MoreHorizontal, Pencil, Trash2, Reply, Smile } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

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
  is_edited?: boolean;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export function MessageThread({ chatId, currentUserId, compact = false }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUserId && chatId) {
      loadMessages();
      loadChatInfo();
      subscribeToMessages();
      markAsRead();
    }
  }, [chatId, currentUserId]);

  const markAsRead = async () => {
    if (!currentUserId || !chatId) return;

    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (memberData) {
        await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('chat_id', chatId)
          .eq('member_id', memberData.id);
      }
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

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
              .neq('member_id', memberData.id)
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
          event: '*',
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
          is_edited,
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
          isOwn: msg.sender_id === memberData.id,
          is_edited: msg.is_edited
        }));
        setMessages(formattedMessages);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoading(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: editContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      setEditingMessageId(null);
      setEditContent('');
      loadMessages();
      toast({ title: 'Message updated' });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({ title: 'Failed to edit message', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_deleted: true,
          content: 'This message was deleted',
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      loadMessages();
      toast({ title: 'Message deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({ title: 'Failed to delete message', variant: 'destructive' });
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleEmojiReaction = async (messageId: string, emoji: string) => {
    // For now, we'll append the emoji to the message as a simple reaction indicator
    // In a full implementation, you'd have a separate reactions table
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    toast({ 
      title: `Reacted with ${emoji}`,
      description: `to "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`
    });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const cancelReply = () => {
    setReplyingTo(null);
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
                "flex gap-3 group relative",
                message.isOwn && "flex-row-reverse"
              )}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {!message.isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.sender.profiles.avatar} />
                  <AvatarFallback>
                    {message.sender.profiles.first_name[0]}
                    {message.sender.profiles.last_name[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              
              {/* Message Actions - Show on hover (before message for own, after for others) */}
              {message.isOwn && (
                <div className={cn(
                  "flex items-center gap-1 flex-shrink-0 transition-opacity",
                  hoveredMessageId === message.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="top">
                      <div className="flex gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiReaction(message.id, emoji)}
                            className="text-xl hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => handleReply(message)}>
                    <Reply className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEditing(message)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={cn(
                  "rounded-lg p-3 max-w-[280px]",
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
                
                {editingMessageId === message.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-background text-foreground"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleEditMessage(message.id);
                        }
                        if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                    />
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => handleEditMessage(message.id)} className="text-primary-foreground/80 hover:text-primary-foreground underline">Save</button>
                      <button onClick={cancelEditing} className="text-primary-foreground/80 hover:text-primary-foreground underline">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                )}
                
                <div className={cn(
                  "flex items-center gap-2 mt-1",
                  message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  <span className="text-xs">{formatMessageTime(message.created_at)}</span>
                  {message.is_edited && <span className="text-xs italic">(edited)</span>}
                </div>
              </div>

              {/* Message Actions for received messages */}
              {!message.isOwn && (
                <div className={cn(
                  "flex items-center gap-1 flex-shrink-0 transition-opacity",
                  hoveredMessageId === message.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="top">
                      <div className="flex gap-1">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiReaction(message.id, emoji)}
                            className="text-xl hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => handleReply(message)}>
                    <Reply className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="border-t border-b px-4 py-2 bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Replying to <strong>{replyingTo.sender.profiles.first_name}</strong>: 
              "{replyingTo.content.substring(0, 40)}{replyingTo.content.length > 40 ? '...' : ''}"
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={cancelReply}>
            Cancel
          </Button>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t p-4 bg-card">
        <MessageInput 
          chatId={chatId} 
          currentMemberId={currentMemberId}
          onMessageSent={() => {
            loadMessages();
            setReplyingTo(null);
          }}
          replyingTo={replyingTo ? {
            id: replyingTo.id,
            senderName: `${replyingTo.sender.profiles.first_name} ${replyingTo.sender.profiles.last_name}`,
            content: replyingTo.content
          } : undefined}
        />
      </div>
    </div>
  );
}
