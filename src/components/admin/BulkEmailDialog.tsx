import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId?: string;
}

export function BulkEmailDialog({
  open,
  onOpenChange,
  listId,
}: BulkEmailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open && listId) {
      loadRecipientCount();
    }
  }, [open, listId]);

  const loadRecipientCount = async () => {
    try {
      const { count } = await supabase
        .from('email_list_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId);

      setRecipientCount(count || 0);
    } catch (error) {
      console.error('Error loading recipient count:', error);
    }
  };

  const handleSend = async () => {
    if (!senderEmail || !subject || !body) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!listId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          listId,
          subject,
          bodyHtml: body.replace(/\n/g, '<br>'),
          bodyText: body,
          senderEmail,
          senderName: senderName || senderEmail,
        },
      });

      if (error) throw error;

      toast({
        title: 'Bulk Email Sent',
        description: `Successfully sent to ${data.sent} recipients`,
      });

      if (data.failed > 0) {
        toast({
          title: 'Warning',
          description: `${data.failed} emails failed to send`,
          variant: 'destructive',
        });
      }

      onOpenChange(false);
      setSenderEmail('');
      setSenderName('');
      setSubject('');
      setBody('');
    } catch (error: any) {
      console.error('Error sending bulk email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send bulk email',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This email will be sent to <strong>{recipientCount}</strong> recipients.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sender Email *</Label>
              <Input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Sender Name</Label>
              <Input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your Organization"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email content..."
              rows={12}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending to {recipientCount} recipients...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to {recipientCount} Recipients
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
