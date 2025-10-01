import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Building2, Users, Search, Plus, Upload, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleType, setRoleType] = useState<string>('');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [memberRole, setMemberRole] = useState<string>('member');
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNotes, setDeleteNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadData();
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        setIsSuperAdmin(data.is_super_admin || false);
      }
    } catch (error) {
      console.error('Error checking super admin status:', error);
    }
  };

  useEffect(() => {
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    setPage(1);
  }, [searchTerm, users]);

  useEffect(() => {
    const startIndex = 0;
    const endIndex = page * ITEMS_PER_PAGE;
    setDisplayedUsers(filteredUsers.slice(startIndex, endIndex));
    setHasMore(endIndex < filteredUsers.length);
  }, [page, filteredUsers]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loadMore]);

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
      setFilteredUsers(usersWithRoles);

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

  const handleDeleteMember = async (user: User) => {
    if (!deletePassword.trim() || !deleteNotes.trim()) {
      toast({
        title: 'Error',
        description: 'Password and notes are required',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Re-authenticate user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        toast({
          title: 'Error',
          description: 'User email not found',
          variant: 'destructive'
        });
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: deletePassword
      });

      if (authError) {
        toast({
          title: 'Error',
          description: 'Invalid password. Deletion cancelled.',
          variant: 'destructive'
        });
        setIsVerifying(false);
        return;
      }

      // Proceed with deletion - remove all role assignments
      // Delete from members table
      const { error: memberError } = await supabase
        .from('members')
        .delete()
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error deleting member:', memberError);
        // Continue even if member deletion fails (might not exist)
      }

      // Delete from admin_users table
      const { error: adminError } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', user.id);

      if (adminError) {
        console.error('Error deleting admin_user:', adminError);
        // Continue even if admin deletion fails (might not exist)
      }

      // Delete from association_managers table
      const { error: assocError } = await supabase
        .from('association_managers')
        .delete()
        .eq('user_id', user.id);

      if (assocError) {
        console.error('Error deleting association_manager:', assocError);
        // Continue even if association manager deletion fails (might not exist)
      }

      // Log the deletion for audit
      await supabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action: 'delete',
        resource: 'user_all_roles',
        resource_id: user.id,
        changes: { 
          deleted_user: user.email,
          deletion_notes: deleteNotes 
        }
      });

      toast({
        title: 'Success',
        description: 'Member deleted successfully'
      });
      setDeletingUser(null);
      setDeletePassword('');
      setDeleteNotes('');
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/bulk-upload-users')}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => navigate('/admin/create-user')}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
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
              {displayedUsers.map((user) => (
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
                    <div className="flex gap-2">
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
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingUser(user)}
                        title="Delete member"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => {
        if (!open) {
          setDeletingUser(null);
          setDeletePassword('');
          setDeleteNotes('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member - Re-authentication Required</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete member "{deletingUser?.email}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-notes">Reason for Deletion *</Label>
              <Textarea
                id="delete-notes"
                placeholder="Explain why this member needs to be deleted..."
                value={deleteNotes}
                onChange={(e) => setDeleteNotes(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Confirm Your Password *</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Re-enter your password to verify this critical action
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={() => deletingUser && handleDeleteMember(deletingUser)}
              disabled={!deletePassword.trim() || !deleteNotes.trim() || isVerifying}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isVerifying ? 'Verifying...' : 'Delete Member'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
