import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMessageCount(currentUserId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setUnreadCount(0);
      return;
    }

    const fetchMemberAndCount = async () => {
      // Get member_id for current user
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', currentUserId)
        .single();

      if (!memberData) {
        setUnreadCount(0);
        return;
      }

      setMemberId(memberData.id);
      await fetchUnreadCount(memberData.id);
    };

    fetchMemberAndCount();
  }, [currentUserId]);

  useEffect(() => {
    if (!memberId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount(memberId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants'
        },
        () => {
          fetchUnreadCount(memberId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId]);

  const fetchUnreadCount = async (memberIdToUse: string) => {
    try {
      // Get all chat participants records for this member including joined_at as fallback
      const { data: participantsData } = await supabase
        .from('chat_participants')
        .select('chat_id, last_read_at, joined_at')
        .eq('member_id', memberIdToUse);

      if (!participantsData || participantsData.length === 0) {
        setUnreadCount(0);
        return;
      }

      let totalUnread = 0;

      // For each chat, count messages after last_read_at (or joined_at fallback) from other senders
      for (const participant of participantsData) {
        // Use last_read_at if available, otherwise use joined_at as fallback
        // This ensures we only count messages received after joining the chat
        const cutoffTime = participant.last_read_at || participant.joined_at || new Date().toISOString();
        
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', participant.chat_id)
          .neq('sender_id', memberIdToUse)
          .gt('created_at', cutoffTime);

        totalUnread += count || 0;
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return unreadCount;
}
