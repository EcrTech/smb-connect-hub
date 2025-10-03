import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';

const eventSchema = z.object({
  event_name: z.string().min(3, 'Event name must be at least 3 characters'),
  event_description: z.string().optional(),
  event_type: z.string().optional(),
  event_date: z.string().optional(),
  event_location: z.string().optional(),
  expected_attendees: z.string().optional(),
  budget_estimate: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventRequisitionFormProps {
  requesterType: 'association' | 'company';
  entityId: string;
  onSuccess?: () => void;
}

export function EventRequisitionForm({ requesterType, entityId, onSuccess }: EventRequisitionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const requisitionData = {
        requester_id: user.id,
        requester_type: requesterType,
        [requesterType === 'association' ? 'association_id' : 'company_id']: entityId,
        event_name: data.event_name,
        event_description: data.event_description,
        event_type: data.event_type,
        event_date: data.event_date ? new Date(data.event_date).toISOString() : null,
        event_location: data.event_location,
        expected_attendees: data.expected_attendees ? parseInt(data.expected_attendees) : null,
        budget_estimate: data.budget_estimate ? parseFloat(data.budget_estimate) : null,
      };

      const { error } = await supabase
        .from('event_requisitions')
        .insert(requisitionData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event requisition submitted successfully',
      });
      
      reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting event requisition:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Event Requisition Form
        </CardTitle>
        <CardDescription>
          Submit a request for event approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_name">Event Name *</Label>
            <Input
              id="event_name"
              {...register('event_name')}
              placeholder="Enter event name"
            />
            {errors.event_name && (
              <p className="text-sm text-destructive">{errors.event_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_description">Event Description</Label>
            <Textarea
              id="event_description"
              {...register('event_description')}
              placeholder="Describe the event"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Input
                id="event_type"
                {...register('event_type')}
                placeholder="e.g., Conference, Workshop"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date</Label>
              <Input
                id="event_date"
                type="datetime-local"
                {...register('event_date')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_location">Event Location</Label>
            <Input
              id="event_location"
              {...register('event_location')}
              placeholder="Enter event location"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_attendees">Expected Attendees</Label>
              <Input
                id="expected_attendees"
                type="number"
                {...register('expected_attendees')}
                placeholder="Number of attendees"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_estimate">Budget Estimate (₹)</Label>
              <Input
                id="budget_estimate"
                type="number"
                step="0.01"
                {...register('budget_estimate')}
                placeholder="Estimated budget"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit Event Requisition'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}