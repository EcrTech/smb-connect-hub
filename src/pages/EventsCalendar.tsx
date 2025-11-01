import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Event {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  location: string | null;
  event_type: string | null;
  created_by: string;
}

export default function EventsCalendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    event_type: '',
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;

      const formattedEvents = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: new Date(event.start_date),
        end: new Date(event.end_date),
        location: event.location,
        event_type: event.event_type,
        created_by: event.created_by,
      }));

      setEvents(formattedEvents);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = async (event: Event) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('Event clicked:', event.title);
    console.log('Event creator:', event.created_by);
    console.log('Current user:', user?.id);
    console.log('Is super admin:', isSuperAdmin);
    
    // Allow super admins or event creators to edit
    if (!isSuperAdmin && event.created_by !== user?.id) {
      console.log('User not authorized to edit this event');
      toast({
        title: 'Not Allowed',
        description: 'You can only edit events you created',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('Opening edit dialog');
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start_date: format(event.start, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(event.end, "yyyy-MM-dd'T'HH:mm"),
      location: event.location || '',
      event_type: event.event_type || '',
    });
    setDialogOpen(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!isSuperAdmin) return;
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start_date: format(start, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(end, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      event_type: '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            description: formData.description || null,
            start_date: formData.start_date,
            end_date: formData.end_date,
            location: formData.location || null,
            event_type: formData.event_type || null,
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;
      } else {
        // Create new event
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('events')
          .insert([{
            title: formData.title,
            description: formData.description || null,
            start_date: formData.start_date,
            end_date: formData.end_date,
            location: formData.location || null,
            event_type: formData.event_type || null,
            created_by: user.id,
          }]);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Event ${selectedEvent ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      loadEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });

      setDialogOpen(false);
      loadEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 pl-20 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Events Calendar</h1>
          {isSuperAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedEvent(null);
                  setFormData({
                    title: '',
                    description: '',
                    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                    end_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                    location: '',
                    event_type: '',
                  });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date & Time *</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date & Time *</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Conference Room A, Online, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event_type">Event Type</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="conference">Conference</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="social">Social Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between gap-2">
                    <div>
                      {selectedEvent && (
                        <Button type="button" variant="destructive" onClick={handleDelete}>
                          Delete Event
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {selectedEvent ? 'Update' : 'Create'} Event
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {!isSuperAdmin && <div className="w-32" />}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pl-20">
        <div className="bg-card rounded-lg p-4 shadow-sm" style={{ height: 'calc(100vh - 180px)' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleSelectEvent}
            onSelectSlot={isSuperAdmin ? handleSelectSlot : undefined}
            selectable={isSuperAdmin}
            popup
            views={['month', 'week', 'day', 'agenda']}
            defaultView="month"
            style={{ height: '100%' }}
          />
        </div>
      </main>
    </div>
  );
}
