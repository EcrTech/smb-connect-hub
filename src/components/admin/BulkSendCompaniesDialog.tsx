import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = lazy(() => import('react-quill'));

interface BulkSendCompaniesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyIds: string[];
}

export function BulkSendCompaniesDialog({
  open,
  onOpenChange,
  companyIds,
}: BulkSendCompaniesDialogProps) {
  const { toast } = useToast();
  const quillRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  
  // Email fields
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // WhatsApp fields
  const [whatsappMessage, setWhatsappMessage] = useState('');

  useEffect(() => {
    if (open && companyIds.length > 0) {
      loadRecipientInfo();
    }
  }, [open, companyIds]);

  const loadRecipientInfo = async () => {
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('name, email, phone')
        .in('id', companyIds);
      
      if (companies) {
        setCompanyNames(companies.map(c => c.name));
        setRecipientCount(companies.length);
      }
    } catch (error) {
      console.error('Error loading recipient info:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image upload
    const { validateImageUpload } = await import('@/lib/uploadValidation');
    const validation = await validateImageUpload(file);
    
    if (!validation.valid) {
      toast({
        title: 'Validation Error',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `email-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const quill = quillRef.current?.getEditor();
      if (quill) {
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', publicUrl);
        quill.setSelection(range.index + 1);
      }

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendEmail = async () => {
    if (!senderEmail || !emailSubject || !emailBody) {
      toast({
        title: 'Error',
        description: 'Please fill in all required email fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('email')
        .in('id', companyIds);

      if (!companies || companies.length === 0) {
        throw new Error('No companies found');
      }

      let sent = 0;
      let failed = 0;

      for (const company of companies) {
        if (!company.email) {
          failed++;
          continue;
        }

        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            to: company.email,
            subject: emailSubject,
            bodyHtml: emailBody,
            bodyText: emailBody.replace(/<[^>]*>/g, ''),
            senderEmail,
            senderName: senderName || senderEmail,
          },
        });

        if (error) {
          failed++;
        } else {
          sent++;
        }
      }

      toast({
        title: 'Bulk Email Sent',
        description: `Successfully sent to ${sent} companies${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      onOpenChange(false);
      setSenderEmail('');
      setSenderName('');
      setEmailSubject('');
      setEmailBody('');
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

  const handleSendWhatsApp = async () => {
    if (!whatsappMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('phone, name')
        .in('id', companyIds);

      if (!companies || companies.length === 0) {
        throw new Error('No companies found');
      }

      let sent = 0;
      let failed = 0;

      for (const company of companies) {
        if (!company.phone) {
          failed++;
          continue;
        }

        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            to: company.phone,
            message: whatsappMessage,
            recipientName: company.name,
          },
        });

        if (error) {
          failed++;
        } else {
          sent++;
        }
      }

      toast({
        title: 'Bulk WhatsApp Sent',
        description: `Successfully sent to ${sent} companies${failed > 0 ? `, ${failed} failed` : ''}`,
      });

      onOpenChange(false);
      setWhatsappMessage('');
    } catch (error: any) {
      console.error('Error sending bulk WhatsApp:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send bulk WhatsApp',
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
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background', 'align', 'link', 'image'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Bulk Message to Companies</DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sending to <strong>{recipientCount}</strong> compan{recipientCount !== 1 ? 'ies' : 'y'}.
            {companyNames.length > 0 && (
              <div className="mt-1 text-xs">
                {companyNames.join(', ')}
              </div>
            )}
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
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
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage || loading}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Insert Image
                    </>
                  )}
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <div className="border rounded-md overflow-hidden">
                <Suspense fallback={<div className="h-[300px] flex items-center justify-center">Loading editor...</div>}>
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={emailBody}
                    onChange={setEmailBody}
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
              <Button onClick={handleSendEmail} disabled={loading || recipientCount === 0}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-message">Message *</Label>
              <Textarea
                id="whatsapp-message"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Type your WhatsApp message here..."
                rows={8}
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
              <Button onClick={handleSendWhatsApp} disabled={loading || recipientCount === 0}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send WhatsApp
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
