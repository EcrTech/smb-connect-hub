import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = lazy(() => import('react-quill'));

interface BulkEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listIds: string[];
}

export function BulkEmailDialog({
  open,
  onOpenChange,
  listIds,
}: BulkEmailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [listNames, setListNames] = useState<string[]>([]);
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open && listIds.length > 0) {
      loadRecipientInfo();
    }
  }, [open, listIds]);

  const loadRecipientInfo = async () => {
    try {
      // Get list names
      const { data: lists } = await supabase
        .from('email_lists')
        .select('name')
        .in('id', listIds);
      
      if (lists) {
        setListNames(lists.map(l => l.name));
      }

      // Get total recipient count
      const { count } = await supabase
        .from('email_list_recipients')
        .select('*', { count: 'exact', head: true })
        .in('list_id', listIds);

      setRecipientCount(count || 0);
    } catch (error) {
      console.error('Error loading recipient info:', error);
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

    if (listIds.length === 0) return;

    setLoading(true);
    try {
      // Send to each list
      const promises = listIds.map(listId => 
        supabase.functions.invoke('send-bulk-email', {
          body: {
            listId,
            subject,
            bodyHtml: body,
            bodyText: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
            senderEmail,
            senderName: senderName || senderEmail,
          },
        })
      );

      const results = await Promise.all(promises);
      
      const totalSent = results.reduce((acc, r) => acc + (r.data?.sent || 0), 0);
      const totalFailed = results.reduce((acc, r) => acc + (r.data?.failed || 0), 0);

      toast({
        title: 'Bulk Email Sent',
        description: `Successfully sent to ${totalSent} recipients`,
      });

      if (totalFailed > 0) {
        toast({
          title: 'Warning',
          description: `${totalFailed} emails failed to send`,
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

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'align',
    'link'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This email will be sent to <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? 's' : ''} across <strong>{listIds.length}</strong> list{listIds.length !== 1 ? 's' : ''}.
            {listNames.length > 0 && (
              <div className="mt-1 text-xs">
                Lists: {listNames.join(', ')}
              </div>
            )}
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
            <div className="border rounded-md overflow-hidden">
              <Suspense fallback={<div className="h-[300px] flex items-center justify-center">Loading editor...</div>}>
                <ReactQuill
                  theme="snow"
                  value={body}
                  onChange={setBody}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Email content..."
                  style={{ height: '300px', marginBottom: '42px' }}
                />
              </Suspense>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading || recipientCount === 0}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to {recipientCount} Recipient{recipientCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
