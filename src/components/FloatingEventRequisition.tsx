import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EventRequisitionForm } from './EventRequisitionForm';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

export function FloatingEventRequisition() {
  const [isOpen, setIsOpen] = useState(false);
  const { role, userData } = useUserRole();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [requesterType, setRequesterType] = useState<'association' | 'company' | null>(null);

  useEffect(() => {
    const determineRequesterInfo = async () => {
      if (!userData) return;

      // Determine requester type and entity ID based on role
      if (role === 'association') {
        setRequesterType('association');
        setEntityId(userData.association_id || null);
      } else if (role === 'company' || role === 'member') {
        // Get company ID from members table
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: memberData } = await supabase
            .from('members')
            .select('company_id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (memberData?.company_id) {
            setRequesterType('company');
            setEntityId(memberData.company_id);
          }
        }
      }
    };

    determineRequesterInfo();
  }, [role, userData]);

  // Don't show if user doesn't have permission or no entity ID
  if (role === 'admin' || !entityId || !requesterType) {
    return null;
  }

  const handleSuccess = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-20 right-24 rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all z-50"
        title="Request Event"
      >
        <Calendar className="w-6 h-6" />
      </Button>

      {/* Dialog with Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Event</DialogTitle>
          </DialogHeader>
          <EventRequisitionForm
            requesterType={requesterType}
            entityId={entityId}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
