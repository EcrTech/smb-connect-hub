import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Building2, Users, Search, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface User {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
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

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleType, setRoleType] = useState<string>('');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [memberRole, setMemberRole] = useState<string>('member');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users from profiles table (accessible to admins via RLS)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get user emails from auth metadata (we'll need to query separately)
      // For now, we'll use user IDs as identifiers
      const userIds = profiles?.map(p => p.id) || [];

      // Load role assignments for these users
      const [adminData, associationManagerData, memberData] = await Promise.all([
        supabase.from('admin_users').select('user_id').in('user_id', userIds),
        supabase.from('association_managers').select('user_id').in('user_id', userIds),
        supabase.from('members').select('user_id, role').in('user_id', userIds)
      ]);

      const adminUsers = new Set(adminData.data?.map(a => a.user_id) || []);
      const associationManagers = new Set(associationManagerData.data?.map(a => a.user_id) || []);
      const companyMembers = new Map((memberData.data || []).map(m => [m.user_id, m.role]));

      const usersWithRoles = (profiles || []).map(profile => ({
        id: profile.id,
        email: `${profile.first_name} ${profile.last_name}`, // Display name instead of email
        created_at: profile.created_at,
        roles: [
          ...(adminUsers.has(profile.id) ? ['Admin'] : []),
          ...(associationManagers.has(profile.id) ? ['Association Manager'] : []),
          ...(companyMembers.has(profile.id) ? [`Company ${companyMembers.get(profile.id)}`] : [])
        ]
      }));

      setUsers(usersWithRoles);

      // Load associations and companies
      const { data: assocData, error: assocError } = await supabase
        .from('associations')
        .select('id, name')
        .order('name');
      
      if (assocError) {
        console.error('Error loading associations:', assocError);
        toast({
          title: 'Warning',
          description: 'Failed to load associations: ' + assocError.message,
          variant: 'destructive'
        });
      } else {
        console.log('Loaded associations:', assocData);
        setAssociations(assocData || []);
      }

      const { data: compData, error: compError } = await supabase
        .from('companies')
        .select('id, name, association_id')
        .order('name');
      
      if (compError) {
        console.error('Error loading companies:', compError);
        toast({
          title: 'Warning',
          description: 'Failed to load companies: ' + compError.message,
          variant: 'destructive'
        });
      } else {
        console.log('Loaded companies:', compData);
        setCompanies(compData || []);
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!selectedUser) return;

    try {
      switch (roleType) {
        case 'admin':
          const { error: adminError } = await supabase
            .from('admin_users')
            .insert({ user_id: selectedUser.id, is_super_admin: false });
          if (adminError) throw adminError;
          break;

        case 'association_manager':
          if (!selectedAssociation) {
            toast({ title: 'Error', description: 'Please select an association', variant: 'destructive' });
            return;
          }
          const { error: assocError } = await supabase
            .from('association_managers')
            .insert({ 
              user_id: selectedUser.id, 
              association_id: selectedAssociation,
              role: 'manager'
            });
          if (assocError) throw assocError;
          break;

        case 'company_member':
          if (!selectedCompany) {
            toast({ title: 'Error', description: 'Please select a company', variant: 'destructive' });
            return;
          }
          const { error: memberError } = await supabase
            .from('members')
            .insert({ 
              user_id: selectedUser.id, 
              company_id: selectedCompany,
              role: memberRole
            });
          if (memberError) throw memberError;
          break;
      }

      toast({
        title: 'Success',
        description: 'Role assigned successfully'
      });

      setSelectedUser(null);
      setRoleType('');
      setSelectedAssociation('');
      setSelectedCompany('');
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = selectedAssociation
    ? companies.filter(c => c.association_id === selectedAssociation)
    : companies;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View and assign roles to users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role, idx) => (
                          <Badge key={idx} variant="secondary">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No roles</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Assign Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Role to {user.email}</DialogTitle>
                          <DialogDescription>
                            Select a role type and provide necessary details
                            <br />
                            <span className="text-xs text-muted-foreground">
                              (Loaded: {associations.length} associations, {companies.length} companies)
                            </span>
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Role Type</Label>
                            <Select value={roleType} onValueChange={setRoleType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Admin
                                  </div>
                                </SelectItem>
                                <SelectItem value="association_manager">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Association Manager
                                  </div>
                                </SelectItem>
                                <SelectItem value="company_member">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Company Member
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {roleType === 'association_manager' && (
                            <div className="space-y-2">
                              <Label>Association</Label>
                              <Select value={selectedAssociation} onValueChange={setSelectedAssociation}>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select association" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover z-50">
                                  {associations.length === 0 ? (
                                    <SelectItem value="none" disabled>No associations found</SelectItem>
                                  ) : (
                                    associations.map((assoc) => (
                                      <SelectItem key={assoc.id} value={assoc.id}>
                                        {assoc.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {roleType === 'company_member' && (
                            <>
                              <div className="space-y-2">
                                <Label>Association</Label>
                                <Select value={selectedAssociation} onValueChange={setSelectedAssociation}>
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select association first" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover z-50">
                                    {associations.length === 0 ? (
                                      <SelectItem value="none" disabled>No associations found</SelectItem>
                                    ) : (
                                      associations.map((assoc) => (
                                        <SelectItem key={assoc.id} value={assoc.id}>
                                          {assoc.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {selectedAssociation && (
                                <div className="space-y-2">
                                  <Label>Company</Label>
                                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                    <SelectTrigger className="bg-background">
                                      <SelectValue placeholder="Select company" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover z-50">
                                      {filteredCompanies.length === 0 ? (
                                        <SelectItem value="none" disabled>No companies found</SelectItem>
                                      ) : (
                                        filteredCompanies.map((company) => (
                                          <SelectItem key={company.id} value={company.id}>
                                            {company.name}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {selectedCompany && (
                                <div className="space-y-2">
                                  <Label>Member Role</Label>
                                  <Select value={memberRole} onValueChange={setMemberRole}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="owner">Owner</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="member">Member</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSelectedUser(null)}>
                            Cancel
                          </Button>
                          <Button onClick={assignRole} disabled={!roleType}>
                            Assign Role
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
