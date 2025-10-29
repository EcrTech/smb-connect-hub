import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { ArrowLeft, Send, Mail } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AssociationInvitations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useUserRole();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
  });

  useEffect(() => {
    if (userData?.association?.id) {
      loadInvitations();
    }
  }, [userData]);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('association_id', userData?.association?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invitations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (!userData?.association?.id) {
      toast({
        title: 'Error',
        description: 'Association not found',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);

    try {
      // Get current user for invited_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation record
      const { data: invitation, error: invitationError } = await supabase
        .from('company_invitations')
        .insert({
          association_id: userData.association.id,
          company_name: formData.companyName,
          email: formData.email,
          token,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
          invited_by: user?.id,
        })
        .select()
        .single();

      if (invitationError) throw invitationError;

      // Get association manager email for reply-to
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      // Send invitation email using edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-company-invitation', {
        body: {
          invitationId: invitation.id,
          companyName: formData.companyName,
          recipientEmail: formData.email,
          invitedByName: profile ? `${profile.first_name} ${profile.last_name}` : 'Association Admin',
          invitedByEmail: user?.email || '',
          associationName: userData.association.name,
          token,
        },
      });

      if (emailError) {
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      // Check if the edge function returned an error in the response
      if (emailData?.error) {
        throw new Error(emailData.error);
      }

      toast({
        title: 'Success',
        description: 'Invitation sent successfully! The recipient will receive an email shortly.',
      });

      // Reset form and reload invitations
      setFormData({ companyName: '', email: '' });
      loadInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50">Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 pl-20">
          <Button variant="ghost" onClick={() => navigate('/association/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pl-20">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Send Invitation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Company Invitation
              </CardTitle>
              <CardDescription>
                Invite companies to join {userData?.association?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="company@example.com"
                    required
                  />
                </div>
                <Button type="submit" disabled={sending}>
                  <Mail className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invitations List */}
          <Card>
            <CardHeader>
              <CardTitle>Invitation History</CardTitle>
              <CardDescription>
                View all company invitations and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No invitations sent yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          {invitation.company_name}
                        </TableCell>
                        <TableCell>{invitation.email}</TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
