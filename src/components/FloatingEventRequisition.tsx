import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EventRequisitionForm } from './EventRequisitionForm';
import { useUserRole } from '@/hooks/useUserRole';

export function FloatingEventRequisition() {
  const [isOpen, setIsOpen] = useState(false);
  const { role } = useUserRole();

  // Don't show for admin users
  if (role === 'admin') {
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
        title="Create Event"
      >
        <Calendar className="w-6 h-6" />
      </Button>

      {/* Dialog with Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <EventRequisitionForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
