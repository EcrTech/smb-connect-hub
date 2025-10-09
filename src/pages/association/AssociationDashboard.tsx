import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, LogOut, Settings, Radio, Calendar, GraduationCap, CheckCircle2, Clock, TrendingUp, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleNavigation } from '@/components/RoleNavigation';


export default function AssociationDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userData } = useUserRole();
  const [association, setAssociation] = useState<any>(null);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalMembers: 0,
    pendingInvitations: 0,
    newMembers1Day: 0,
    newMembers7Days: 0,
    newMembers30Days: 0,
    onboardingTotal: 0,
    onboardingCompleted: 0,
    onboardingInProgress: 0,
    onboardingCompletionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    if (userData?.association) {
      setAssociation(userData.association);
      loadStats(userData.association.id);
    }
  }, [userData]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

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
      let newMembers1Day = 0;
      let newMembers7Days = 0;
      let newMembers30Days = 0;

      if (companies && companies.length > 0) {
        const companyIds = companies.map(c => c.id);
        
        const [
          { count: membersCount },
          { count: new1Day },
          { count: new7Days },
          { count: new30Days },
        ] = await Promise.all([
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .in('company_id', companyIds)
            .eq('is_active', true),
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .in('company_id', companyIds)
            .eq('is_active', true)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .in('company_id', companyIds)
            .eq('is_active', true)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .in('company_id', companyIds)
            .eq('is_active', true)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        ]);

        totalMembers = membersCount || 0;
        newMembers1Day = new1Day || 0;
        newMembers7Days = new7Days || 0;
        newMembers30Days = new30Days || 0;
      }

      // Load pending invitations count
      const { count: invitationsCount } = await supabase
        .from('company_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('association_id', associationId)
        .eq('status', 'pending');

      // Load onboarding stats for association members
      const { data: memberUserIds } = await supabase
        .from('members')
        .select('user_id')
        .in('company_id', companies?.map(c => c.id) || [])
        .eq('is_active', true);

      const userIds = memberUserIds?.map(m => m.user_id) || [];
      
      const [
        { count: onboardingTotal },
        { count: onboardingCompleted },
      ] = await Promise.all([
        supabase
          .from('user_onboarding')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds.length > 0 ? userIds : ['']),
        supabase
          .from('user_onboarding')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds.length > 0 ? userIds : [''])
          .eq('is_completed', true),
      ]);

      const onboardingInProgress = (onboardingTotal || 0) - (onboardingCompleted || 0);
      const onboardingCompletionRate = onboardingTotal && onboardingTotal > 0
        ? Math.round((onboardingCompleted || 0) / onboardingTotal * 100)
        : 0;

      setStats({
        totalCompanies: companiesCount || 0,
        totalMembers,
        pendingInvitations: invitationsCount || 0,
        newMembers1Day,
        newMembers7Days,
        newMembers30Days,
        onboardingTotal: onboardingTotal || 0,
        onboardingCompleted: onboardingCompleted || 0,
        onboardingInProgress,
        onboardingCompletionRate,
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
            <div>
              <h1 className="text-2xl font-bold">Association Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {association?.name || 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile && currentUserId && (
              <Avatar 
                className="cursor-pointer hover:ring-2 hover:ring-primary transition-all" 
                onClick={() => navigate(`/profile/${currentUserId}`)}
              >
                <AvatarImage src={profile.avatar || undefined} />
                <AvatarFallback>
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <RoleNavigation />
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome, Association Admin!
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
                  <p className="text-xs text-muted-foreground">
                    +{stats.newMembers1Day} today, +{stats.newMembers7Days} this week, +{stats.newMembers30Days} this month
                  </p>
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

        {/* Onboarding Stats Section */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle>Member Onboarding Analytics</CardTitle>
            </div>
            <CardDescription>Track how members in your association are completing onboarding</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 animate-pulse bg-muted rounded"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Total Members</span>
                  </div>
                  <div className="text-3xl font-bold">{stats.onboardingTotal}</div>
                  <p className="text-xs text-muted-foreground">Started onboarding</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{stats.onboardingCompleted}</div>
                  <p className="text-xs text-muted-foreground">Finished onboarding</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">In Progress</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{stats.onboardingInProgress}</div>
                  <p className="text-xs text-muted-foreground">Currently onboarding</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Completion Rate</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{stats.onboardingCompletionRate}%</div>
                  <p className="text-xs text-muted-foreground">Overall completion</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Association Management</CardTitle>
            <CardDescription>Manage your association and companies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Button className="w-full" onClick={() => navigate('/association/feed')}>
                <Radio className="w-4 h-4 mr-2" />
                Association Feed
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/association/companies')}>
                <Building2 className="w-4 h-4 mr-2" />
                Manage Companies
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/association/invitations')}
                data-tour="send-invitations"
              >
                <Users className="w-4 h-4 mr-2" />
                Send Invitations
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/calendar')}>
                <Calendar className="w-4 h-4 mr-2" />
                Event Calendar
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/association/profile')}>
                <Settings className="w-4 h-4 mr-2" />
                Association Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Upload</CardTitle>
            <CardDescription>Upload multiple records at once using CSV files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="w-full" onClick={() => navigate('/association/bulk-upload-companies')}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload Companies
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/association/bulk-upload-users')}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
