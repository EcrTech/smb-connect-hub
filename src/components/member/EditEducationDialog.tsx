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
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface EditEducationDialogProps {
  onSave: () => void;
}

export function EditEducationDialog({ onSave }: EditEducationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    school: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    grade: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('education').insert({
        user_id: user.id,
        school: formData.school,
        degree: formData.degree || null,
        field_of_study: formData.field_of_study || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        grade: formData.grade || null,
        description: formData.description || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Education added',
      });
      setOpen(false);
      setFormData({
        school: '',
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
        grade: '',
        description: '',
      });
      onSave();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add education',
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
          <DialogTitle>Add Education</DialogTitle>
          <DialogDescription>Add your educational background</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school">School *</Label>
            <Input
              id="school"
              placeholder="e.g., Stanford University"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="degree">Degree</Label>
            <Input
              id="degree"
              placeholder="e.g., Bachelor's Degree"
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field_of_study">Field of Study</Label>
            <Input
              id="field_of_study"
              placeholder="e.g., Computer Science"
              value={formData.field_of_study}
              onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Input
              id="grade"
              placeholder="e.g., 3.8 GPA"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Activities, achievements, coursework..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Education'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}