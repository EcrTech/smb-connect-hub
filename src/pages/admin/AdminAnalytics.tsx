import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Users, Building2, Mail, MessageCircle, Activity, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/formatters";

interface TimeSeriesData {
  date: string;
  members: number;
  companies: number;
  associations: number;
}

interface CommunicationData {
  date: string;
  emails: number;
  whatsapp: number;
}

interface TopAssociation {
  name: string;
  memberCount: number;
  companyCount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCompanies: 0,
    totalAssociations: 0,
    totalEmails: 0,
    totalWhatsApp: 0,
    activeUsers: 0,
  });
  
  const [growthData, setGrowthData] = useState<TimeSeriesData[]>([]);
  const [communicationData, setCommunicationData] = useState<CommunicationData[]>([]);
  const [topAssociations, setTopAssociations] = useState<TopAssociation[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const getDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = getDaysAgo(days);

      // Load overall stats
      const [
        { count: membersCount },
        { count: companiesCount },
        { count: associationsCount },
        { count: emailsCount },
        { count: whatsappCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('associations').select('*', { count: 'exact', head: true }),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }),
        supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }),
      ]);

      // Calculate active users (users who have logged in the last 7 days)
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', getDaysAgo(7));

      setStats({
        totalMembers: membersCount || 0,
        totalCompanies: companiesCount || 0,
        totalAssociations: associationsCount || 0,
        totalEmails: emailsCount || 0,
        totalWhatsApp: whatsappCount || 0,
        activeUsers: activeCount || 0,
      });

      // Load growth data
      await loadGrowthData(startDate, days);
      
      // Load communication data
      await loadCommunicationData(startDate, days);
      
      // Load top associations
      await loadTopAssociations();
      
      // Load role distribution
      await loadRoleDistribution();

    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const loadGrowthData = async (startDate: string, days: number) => {
    const data: TimeSeriesData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const [
        { count: membersCount },
        { count: companiesCount },
        { count: associationsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .lte('created_at', nextDate.toISOString()),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .lte('created_at', nextDate.toISOString()),
        supabase.from('associations').select('*', { count: 'exact', head: true })
          .lte('created_at', nextDate.toISOString()),
      ]);
      
      data.push({
        date: dateStr,
        members: membersCount || 0,
        companies: companiesCount || 0,
        associations: associationsCount || 0,
      });
    }
    
    setGrowthData(data);
  };

  const loadCommunicationData = async (startDate: string, days: number) => {
    const data: CommunicationData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const [
        { count: emailsCount },
        { count: whatsappCount },
      ] = await Promise.all([
        supabase.from('email_messages').select('*', { count: 'exact', head: true })
          .gte('sent_at', date.toISOString())
          .lt('sent_at', nextDate.toISOString()),
        supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true })
          .gte('sent_at', date.toISOString())
          .lt('sent_at', nextDate.toISOString()),
      ]);
      
      data.push({
        date: dateStr,
        emails: emailsCount || 0,
        whatsapp: whatsappCount || 0,
      });
    }
    
    setCommunicationData(data);
  };

  const loadTopAssociations = async () => {
    try {
      const { data: associations } = await supabase
        .from('associations')
        .select(`
          id,
          name,
          companies:companies(count)
        `)
        .order('name')
        .limit(10);

      if (associations) {
        const associationsWithCounts = await Promise.all(
          associations.map(async (assoc) => {
            const { count: memberCount } = await supabase
              .from('members')
              .select('*', { count: 'exact', head: true })
              .in('company_id', 
                await supabase
                  .from('companies')
                  .select('id')
                  .eq('association_id', assoc.id)
                  .then(res => res.data?.map(c => c.id) || [])
              );

            return {
              name: assoc.name,
              memberCount: memberCount || 0,
              companyCount: assoc.companies?.[0]?.count || 0,
            };
          })
        );

        setTopAssociations(
          associationsWithCounts
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Error loading top associations:', error);
    }
  };

  const loadRoleDistribution = async () => {
    try {
      const [
        { count: adminCount },
        { count: associationCount },
        { count: companyOwnerCount },
        { count: companyAdminCount },
        { count: memberCount },
      ] = await Promise.all([
        supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('association_managers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('role', 'owner').eq('is_active', true),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('role', 'member').eq('is_active', true),
      ]);

      setRoleDistribution([
        { name: 'Super Admins', value: adminCount || 0 },
        { name: 'Association Managers', value: associationCount || 0 },
        { name: 'Company Owners', value: companyOwnerCount || 0 },
        { name: 'Company Admins', value: companyAdminCount || 0 },
        { name: 'Members', value: memberCount || 0 },
      ]);
    } catch (error) {
      console.error('Error loading role distribution:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Platform Analytics</h1>
            <p className="text-muted-foreground">Comprehensive platform insights and trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/actions')}>
            <Settings className="h-4 w-4 mr-2" />
            Admin Actions
          </Button>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Associations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssociations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmails}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp Sent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWhatsApp}</div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Platform Growth Trends
          </CardTitle>
          <CardDescription>Member, company, and association growth over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line type="monotone" dataKey="members" stroke="#8884d8" name="Members" />
              <Line type="monotone" dataKey="companies" stroke="#82ca9d" name="Companies" />
              <Line type="monotone" dataKey="associations" stroke="#ffc658" name="Associations" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Volume</CardTitle>
            <CardDescription>Email and WhatsApp messages sent over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={communicationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Bar dataKey="emails" fill="#8884d8" name="Emails" />
                <Bar dataKey="whatsapp" fill="#82ca9d" name="WhatsApp" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
            <CardDescription>Active users by role type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Associations */}
      <Card>
        <CardHeader>
          <CardTitle>Top Associations by Member Count</CardTitle>
          <CardDescription>Most active associations on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topAssociations.map((assoc, index) => (
              <div key={assoc.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                  <div>
                    <div className="font-semibold">{assoc.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {assoc.companyCount} companies
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{assoc.memberCount}</div>
                  <div className="text-sm text-muted-foreground">members</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
