import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, LogOut, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

export default function AssociationDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useUserRole();
  const [association, setAssociation] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalMembers: 0,
    pendingInvitations: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.association) {
      setAssociation(userData.association);
      loadStats(userData.association.id);
    }
  }, [userData]);

  const loadStats = async (associationId: string) => {
    try {
      // Load companies count
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('association_id', associationId)
        .eq('is_active', true);

      // Load total members count across all companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('association_id', associationId)
        .eq('is_active', true);

      let totalMembers = 0;
      if (companies) {
        const { count: membersCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .in('company_id', companies.map(c => c.id))
          .eq('is_active', true);
        totalMembers = membersCount || 0;
      }

      // Load pending invitations count
      const { count: invitationsCount } = await supabase
        .from('company_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('association_id', associationId)
        .eq('status', 'pending');

      setStats({
        totalCompanies: companiesCount || 0,
        totalMembers,
        pendingInvitations: invitationsCount || 0
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Success',
        description: 'You have been logged out',
      });
      navigate('/auth/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Association Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {association?.name || 'Loading...'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome, Association Manager!
          </h2>
          <p className="text-muted-foreground">
            Manage your association and member companies
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalCompanies}</div>
                  <p className="text-xs text-muted-foreground">In your association</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalMembers}</div>
                  <p className="text-xs text-muted-foreground">Active members</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 animate-pulse bg-muted rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.pendingInvitations}</div>
                  <p className="text-xs text-muted-foreground">Awaiting response</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Association Management</CardTitle>
            <CardDescription>Manage your association and companies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="w-full" onClick={() => navigate('/association/companies')}>
                <Building2 className="w-4 h-4 mr-2" />
                Manage Companies
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/association/invitations')}>
                <Users className="w-4 h-4 mr-2" />
                Send Invitations
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/association/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Association Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
