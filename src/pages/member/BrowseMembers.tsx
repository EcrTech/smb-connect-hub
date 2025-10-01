import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UserPlus, Search, Check, Clock, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface Member {
  id: string;
  user_id: string;
  profile: {
    first_name: string;
    last_name: string;
    avatar: string | null;
    bio: string | null;
  };
  company: {
    name: string;
  } | null;
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}

export default function BrowseMembers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = members.filter(m => {
        const fullName = `${m.profile.first_name} ${m.profile.last_name}`.toLowerCase();
        const companyName = m.company?.name.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || companyName.includes(search);
      });
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchTerm, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      if (!userData?.id) return;

      // Load all members except current user
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, user_id, company:companies(name)')
        .neq('id', userData.id)
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Load profiles for all members
      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar, bio')
            .eq('id', member.user_id)
            .single();

          return {
            ...member,
            profile: profileData || { first_name: '', last_name: '', avatar: null, bio: null }
          };
        })
      );

      // Load existing connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('sender_id, receiver_id, status')
        .or(`sender_id.eq.${userData.id},receiver_id.eq.${userData.id}`);

      if (connectionsError) throw connectionsError;

      // Map connection status to each member
      const membersWithStatus = membersWithProfiles.map(member => {
        const connection = connectionsData?.find(
          c => c.sender_id === member.id || c.receiver_id === member.id
        );

        let connectionStatus: Member['connectionStatus'] = 'none';
        if (connection) {
          if (connection.status === 'accepted') {
            connectionStatus = 'connected';
          } else if (connection.sender_id === userData.id) {
            connectionStatus = 'pending_sent';
          } else {
            connectionStatus = 'pending_received';
          }
        }

        return { ...member, connectionStatus };
      });

      setMembers(membersWithStatus);
      setFilteredMembers(membersWithStatus);
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedMember || !userData?.id) return;

    try {
      setSendingRequest(true);
      const { error } = await supabase
        .from('connections')
        .insert({
          sender_id: userData.id,
          receiver_id: selectedMember.id,
          message: connectionMessage || null,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Connection request sent',
      });

      setSelectedMember(null);
      setConnectionMessage('');
      loadMembers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send connection request',
        variant: 'destructive',
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const getConnectionButton = (member: Member) => {
    switch (member.connectionStatus) {
      case 'connected':
        return (
          <Badge variant="secondary">
            <Check className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'pending_sent':
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'pending_received':
        return (
          <Button size="sm" onClick={() => navigate('/connections')}>
            Respond
          </Button>
        );
      default:
        return (
          <Button size="sm" onClick={() => setSelectedMember(member)}>
            <UserPlus className="w-4 h-4 mr-1" />
            Connect
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Browse Members</h1>
          <p className="text-muted-foreground">Connect with professionals in your network</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <p>Loading members...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map(member => {
              const fullName = `${member.profile.first_name} ${member.profile.last_name}`;
              const initials = `${member.profile.first_name[0]}${member.profile.last_name[0]}`;

              return (
                <Card 
                  key={member.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/profile/${member.user_id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="w-16 h-16 mb-3">
                        <AvatarImage src={member.profile.avatar || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg">{fullName}</h3>
                      {member.company && (
                        <p className="text-sm text-muted-foreground">{member.company.name}</p>
                      )}
                      {member.profile.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {member.profile.bio}
                        </p>
                      )}
                      <div 
                        className="mt-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getConnectionButton(member)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {filteredMembers.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No members found</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Connection Request</DialogTitle>
            <DialogDescription>
              Send a connection request to {selectedMember?.profile.first_name} {selectedMember?.profile.last_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Add a personal message (optional)"
            value={connectionMessage}
            onChange={(e) => setConnectionMessage(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMember(null)}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={sendingRequest}>
              {sendingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
