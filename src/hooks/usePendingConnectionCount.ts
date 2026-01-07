import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePendingConnectionCount(currentUserId: string | null) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) {
      setPendingCount(0);
      return;
    }

    const fetchPendingCount = async () => {
      try {
        // Get member_id for current user
        const { data: memberData } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', currentUserId)
          .single();

        if (!memberData) {
          setPendingCount(0);
          return;
        }

        // Count pending connection requests where the current user is the receiver
        const { count } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', memberData.id)
          .eq('status', 'pending');

        setPendingCount(count || 0);
      } catch (error) {
        console.error('Error fetching pending connection count:', error);
      }
    };

    fetchPendingCount();

    // Subscribe to connection changes
    const channel = supabase
      .channel('pending-connections')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return pendingCount;
}
