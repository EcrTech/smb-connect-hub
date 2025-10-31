import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { ArrowLeft, Users, TrendingUp, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AssociationMembers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useUserRole();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    onboardedByMe: 0,
  });

  useEffect(() => {
    console.log('AssociationMembers - userData:', userData);
    console.log('AssociationMembers - association.id:', userData?.association?.id);
    console.log('AssociationMembers - association_id:', userData?.association_id);
    
    const associationId = userData?.association?.id || userData?.association_id;
    if (associationId) {
      loadMembers();
    } else {
      console.log('AssociationMembers - No association ID found');
      setLoading(false);
    }
  }, [userData]);

  const loadMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('LoadMembers - Current user:', user?.id);
      
      const associationId = userData?.association?.id || userData?.association_id;
      console.log('LoadMembers - Using association ID:', associationId);
      
      // Get all companies in association
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id')
        .eq('association_id', associationId)
        .eq('is_active', true);

      console.log('LoadMembers - Companies query result:', { companies, companiesError });

      if (companiesError) {
        console.error('Error loading companies:', companiesError);
        throw new Error(`Failed to load companies: ${companiesError.message}`);
      }

      if (!companies || companies.length === 0) {
        console.log('LoadMembers - No companies found for association');
        setLoading(false);
        return;
      }

      const companyIds = companies.map(c => c.id);
      console.log('LoadMembers - Company IDs:', companyIds);

      // Get members with profiles and company info
      const { data: membersData, error } = await supabase
        .from('members')
        .select(`
          *,
          profiles:user_id (first_name, last_name, email),
          company:companies (name)
        `)
        .in('company_id', companyIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('LoadMembers - Members query result:', { membersData, error });

      if (error) throw error;

      const totalMembers = membersData?.length || 0;
      const onboardedByMe = membersData?.filter(m => m.created_by === user?.id).length || 0;

      console.log('LoadMembers - Stats:', { totalMembers, onboardedByMe });

      setMembers(membersData || []);
      setStats({
        totalMembers,
        onboardedByMe,
      });
    } catch (error: any) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 pl-20">
          <Button variant="ghost" onClick={() => navigate('/association')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pl-20">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Association Members</h1>
            <p className="text-muted-foreground">
              View and manage members across all companies in {userData?.association?.name}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground">Across all companies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Onboarded by You</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.onboardedByMe}</div>
                <p className="text-xs text-muted-foreground">Members you added</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/association/bulk-upload-users')}
                >
                  Bulk Upload
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>
                Members from all companies in your association
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No members found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.first_name} {member.profiles?.last_name}
                        </TableCell>
                        <TableCell>{member.profiles?.email}</TableCell>
                        <TableCell>{member.company?.name || 'N/A'}</TableCell>
                        <TableCell className="capitalize">{member.role}</TableCell>
                        <TableCell>
                          {new Date(member.created_at).toLocaleDateString()}
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
