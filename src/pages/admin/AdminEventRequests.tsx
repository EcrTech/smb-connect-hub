import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Check, X, MapPin, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EventRequisition {
  id: string;
  requester_type: string;
  event_name: string;
  event_description: string | null;
  event_type: string | null;
  event_date: string | null;
  event_location: string | null;
  expected_attendees: number | null;
  budget_estimate: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  association?: { name: string };
  company?: { name: string };
}

export default function AdminEventRequests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EventRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; request: EventRequisition | null; action: 'approve' | 'reject' | null }>({
    open: false,
    request: null,
    action: null,
  });
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('event_requisitions')
        .select(`
          *,
          association:associations(name),
          company:companies(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error loading event requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDialog.request || !reviewDialog.action) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('event_requisitions')
        .update({
          status: reviewDialog.action === 'approve' ? 'approved' : 'rejected',
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewDialog.request.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Event request ${reviewDialog.action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      setReviewDialog({ open: false, request: null, action: null });
      setAdminNotes('');
      loadRequests();
    } catch (error: any) {
      console.error('Error reviewing request:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
          <Calendar className="w-3 h-3 mr-1" /> Pending
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
          <Check className="w-3 h-3 mr-1" /> Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
          <X className="w-3 h-3 mr-1" /> Rejected
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 pl-20">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Event Requisition Requests</h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pl-20">
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {request.event_name}
                      {getStatusBadge(request.status)}
                    </CardTitle>
                    <CardDescription>
                      Requested by: {request.requester_type === 'association' ? request.association?.name : request.company?.name}
                      {' • '}
                      {format(new Date(request.created_at), 'PPp')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.event_description && (
                  <div>
                    <h4 className="font-semibold mb-1">Description:</h4>
                    <p className="text-muted-foreground">{request.event_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.event_type && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm"><strong>Type:</strong> {request.event_type}</span>
                    </div>
                  )}
                  {request.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm"><strong>Date:</strong> {format(new Date(request.event_date), 'PPp')}</span>
                    </div>
                  )}
                  {request.event_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm"><strong>Location:</strong> {request.event_location}</span>
                    </div>
                  )}
                  {request.expected_attendees && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm"><strong>Attendees:</strong> {request.expected_attendees}</span>
                    </div>
                  )}
                  {request.budget_estimate && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm"><strong>Budget:</strong> ₹{request.budget_estimate.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {request.admin_notes && (
                  <div className="bg-muted p-3 rounded-md">
                    <h4 className="font-semibold mb-1 text-sm">Admin Notes:</h4>
                    <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => setReviewDialog({ open: true, request, action: 'approve' })}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setReviewDialog({ open: true, request, action: 'reject' })}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {requests.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No event requisition requests found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && setReviewDialog({ open: false, request: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Event Request
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? 'This will approve the event requisition request.'
                : 'This will reject the event requisition request.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes or comments..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialog({ open: false, request: null, action: null });
                setAdminNotes('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={processing}
            >
              {processing ? 'Processing...' : reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}