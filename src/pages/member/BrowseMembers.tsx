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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Search, Check, Clock, X, Filter, Building2, MapPin, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RoleNavigation } from '@/components/RoleNavigation';

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
    id: string;
    name: string;
    association_id: string;
    employee_count: number | null;
    annual_turnover: number | null;
    city: string | null;
    state: string | null;
    country: string | null;
    association: {
      id: string;
      name: string;
    } | null;
  } | null;
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}

interface Association {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  association_id: string;
}

export default function BrowseMembers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData, loading: userLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [associations, setAssociations] = useState<Association[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedAssociation, setSelectedAssociation] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [minEmployees, setMinEmployees] = useState<string>('');
  const [maxEmployees, setMaxEmployees] = useState<string>('');
  const [minTurnover, setMinTurnover] = useState<string>('');
  const [maxTurnover, setMaxTurnover] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  useEffect(() => {
    if (!userLoading && userData) {
      loadMembers();
      loadFiltersData();
    }
  }, [userLoading, userData]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, members, selectedAssociation, selectedCompany, minEmployees, maxEmployees, minTurnover, maxTurnover, selectedCity, selectedState, selectedCountry]);

  const loadFiltersData = async () => {
    try {
      // Load associations
      const { data: associationsData } = await supabase
        .from('associations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (associationsData) setAssociations(associationsData);

      // Load companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name, association_id')
        .eq('is_active', true)
        .order('name');
      
      if (companiesData) setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading filters data:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...members];

    // Search term filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m => {
        const fullName = `${m.profile.first_name} ${m.profile.last_name}`.toLowerCase();
        const companyName = m.company?.name.toLowerCase() || '';
        return fullName.includes(search) || companyName.includes(search);
      });
    }

    // Association filter
    if (selectedAssociation) {
      filtered = filtered.filter(m => m.company?.association_id === selectedAssociation);
    }

    // Company filter
    if (selectedCompany) {
      filtered = filtered.filter(m => m.company?.id === selectedCompany);
    }

    // Employee count filter
    if (minEmployees) {
      const min = parseInt(minEmployees);
      filtered = filtered.filter(m => m.company?.employee_count && m.company.employee_count >= min);
    }
    if (maxEmployees) {
      const max = parseInt(maxEmployees);
      filtered = filtered.filter(m => m.company?.employee_count && m.company.employee_count <= max);
    }

    // Turnover filter
    if (minTurnover) {
      const min = parseFloat(minTurnover);
      filtered = filtered.filter(m => m.company?.annual_turnover && m.company.annual_turnover >= min);
    }
    if (maxTurnover) {
      const max = parseFloat(maxTurnover);
      filtered = filtered.filter(m => m.company?.annual_turnover && m.company.annual_turnover <= max);
    }

    // Location filters
    if (selectedCity) {
      filtered = filtered.filter(m => m.company?.city?.toLowerCase() === selectedCity.toLowerCase());
    }
    if (selectedState) {
      filtered = filtered.filter(m => m.company?.state?.toLowerCase() === selectedState.toLowerCase());
    }
    if (selectedCountry) {
      filtered = filtered.filter(m => m.company?.country?.toLowerCase() === selectedCountry.toLowerCase());
    }

    setFilteredMembers(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAssociation('');
    setSelectedCompany('');
    setMinEmployees('');
    setMaxEmployees('');
    setMinTurnover('');
    setMaxTurnover('');
    setSelectedCity('');
    setSelectedState('');
    setSelectedCountry('');
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      if (!userData?.id) {
        console.log('No userData.id found, userData:', userData);
        return;
      }

      console.log('Loading members, current userData.id:', userData.id);

      // Load all members except current user with company and association details
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          id, 
          user_id, 
          company:companies(
            id,
            name,
            association_id,
            employee_count,
            annual_turnover,
            city,
            state,
            country,
            association:associations(id, name)
          )
        `)
        .neq('id', userData.id)
        .eq('is_active', true);

      console.log('Members query result:', { membersData, membersError, count: membersData?.length });

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

      console.log('Final members with status:', { count: membersWithStatus.length, sample: membersWithStatus[0] });
      
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

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to browse members</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">Browse Members</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <RoleNavigation />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Browse Members</h1>
          <p className="text-muted-foreground">Connect with professionals in your network</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      {showFilters ? 'Hide' : 'Show'} Advanced Filters
                    </Button>
                  </CollapsibleTrigger>
                  {(selectedAssociation || selectedCompany || minEmployees || maxEmployees || minTurnover || maxTurnover || selectedCity || selectedState || selectedCountry) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>

                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Association Filter */}
                    <div className="space-y-2">
                      <Label>Association</Label>
                      <Select value={selectedAssociation} onValueChange={setSelectedAssociation}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="All associations" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value=" ">All associations</SelectItem>
                          {associations.map(assoc => (
                            <SelectItem key={assoc.id} value={assoc.id}>
                              {assoc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Company Filter */}
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Select 
                        value={selectedCompany} 
                        onValueChange={setSelectedCompany}
                        disabled={!selectedAssociation && selectedAssociation !== ' '}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="All companies" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value=" ">All companies</SelectItem>
                          {companies
                            .filter(c => !selectedAssociation || selectedAssociation === ' ' || c.association_id === selectedAssociation)
                            .map(company => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* City Filter */}
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="Enter city..."
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      />
                    </div>

                    {/* State Filter */}
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        placeholder="Enter state..."
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                      />
                    </div>

                    {/* Country Filter */}
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        placeholder="Enter country..."
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Employee Count Range */}
                    <div className="space-y-2">
                      <Label>Number of Employees</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={minEmployees}
                          onChange={(e) => setMinEmployees(e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={maxEmployees}
                          onChange={(e) => setMaxEmployees(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Turnover Range */}
                    <div className="space-y-2">
                      <Label>Annual Turnover (₹)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={minTurnover}
                          onChange={(e) => setMinTurnover(e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={maxTurnover}
                          onChange={(e) => setMaxTurnover(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[300px] font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="text-right font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <p className="text-muted-foreground">No members available</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map(member => {
                      const fullName = `${member.profile.first_name} ${member.profile.last_name}`;
                      const initials = `${member.profile.first_name[0]}${member.profile.last_name[0]}`;

                      return (
                        <TableRow 
                          key={member.id} 
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={member.profile.avatar || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <button
                                  onClick={() => navigate(`/profile/${member.user_id}`)}
                                  className="font-semibold text-base hover:text-primary hover:underline text-left transition-colors"
                                >
                                  {fullName}
                                </button>
                                {member.profile.bio && (
                                  <span className="text-sm text-muted-foreground line-clamp-1 max-w-[250px]">
                                    {member.profile.bio}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.company ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium text-sm">{member.company.name}</span>
                                </div>
                                {member.company.association && (
                                  <span className="text-xs text-muted-foreground pl-6">
                                    {member.company.association.name}
                                  </span>
                                )}
                                {member.company.employee_count && (
                                  <div className="flex items-center gap-1 pl-6 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    <span>{member.company.employee_count} employees</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {member.company?.city || member.company?.state || member.company?.country ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">
                                  {[
                                    member.company.city,
                                    member.company.state,
                                    member.company.country
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {getConnectionButton(member)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
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
