import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { CERTIFICATIONS, ISSUING_ORGANIZATIONS } from '@/lib/profileOptions';

interface EditCertificationsDialogProps {
  onSave: () => void;
}

export function EditCertificationsDialog({ onSave }: EditCertificationsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    issuing_organization: '',
    issue_date: '',
    expiration_date: '',
    credential_id: '',
    credential_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('certifications').insert({
        user_id: user.id,
        name: formData.name,
        issuing_organization: formData.issuing_organization,
        issue_date: formData.issue_date || null,
        expiration_date: formData.expiration_date || null,
        credential_id: formData.credential_id || null,
        credential_url: formData.credential_url || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Certification added',
      });
      setOpen(false);
      setFormData({
        name: '',
        issuing_organization: '',
        issue_date: '',
        expiration_date: '',
        credential_id: '',
        credential_url: '',
      });
      onSave();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add certification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Certification</DialogTitle>
          <DialogDescription>Add a professional certification</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Combobox
              options={CERTIFICATIONS}
              value={formData.name}
              onValueChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="Select or type certification..."
              searchPlaceholder="Search certifications..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuing_organization">Issuing Organization *</Label>
            <Combobox
              options={ISSUING_ORGANIZATIONS}
              value={formData.issuing_organization}
              onValueChange={(value) => setFormData({ ...formData, issuing_organization: value })}
              placeholder="Select or type organization..."
              searchPlaceholder="Search organizations..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) =>
                  setFormData({ ...formData, expiration_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential_id">Credential ID</Label>
            <Input
              id="credential_id"
              placeholder="Certification ID or number"
              value={formData.credential_id}
              onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential_url">Credential URL</Label>
            <Input
              id="credential_url"
              type="url"
              placeholder="https://..."
              value={formData.credential_url}
              onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Certification'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}