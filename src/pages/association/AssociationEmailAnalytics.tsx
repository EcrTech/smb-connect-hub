import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, TrendingUp, Users, MousePointer, AlertCircle } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleContext } from '@/contexts/RoleContext';

interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
}

interface CampaignListItem {
  id: string;
  subject: string;
  sent_at: string;
  total_recipients: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
}

export default function AssociationEmailAnalytics() {
  const { userData } = useUserRole();
  const { selectedAssociationId } = useRoleContext();
  const [loading, setLoading] = useState(true);
  const [associationId, setAssociationId] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    totalSent: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    avgBounceRate: 0,
  });
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    // Priority 1: Use selectedAssociationId from RoleContext (set by dashboard)
    if (selectedAssociationId) {
      console.log('Using selectedAssociationId from RoleContext:', selectedAssociationId);
      setAssociationId(selectedAssociationId);
      return;
    }
    
    // Priority 2: Use association_id from userData (for association managers)
    if (userData?.association_id) {
      console.log('Using userData.association_id:', userData.association_id);
      setAssociationId(userData.association_id);
      return;
    }
    
    console.warn('No association context found. User type:', userData?.type);
  }, [selectedAssociationId, userData]);

  useEffect(() => {
    if (associationId) {
      console.log('=== ANALYTICS CONTEXT DEBUG ===');
      console.log('selectedAssociationId:', selectedAssociationId);
      console.log('userData.association_id:', userData?.association_id);
      console.log('Resolved associationId:', associationId);
      loadAnalytics();
    }
  }, [associationId, timeRange]);

  const loadAnalytics = async () => {
    if (!associationId) {
      console.warn('Cannot load analytics: no associationId');
      return;
    }
    
    try {
      setLoading(true);
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: campaignsData, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('association_id', associationId)
        .gte('sent_at', startDate.toISOString())
        .order('sent_at', { ascending: false });

      if (error) throw error;

      setCampaigns(campaignsData || []);

      const totalCampaigns = campaignsData?.length || 0;
      const totalSent = campaignsData?.reduce((sum, c) => sum + c.total_sent, 0) || 0;
      const avgOpenRate = totalCampaigns > 0
        ? campaignsData.reduce((sum, c) => sum + parseFloat(String(c.open_rate || 0)), 0) / totalCampaigns
        : 0;
      const avgClickRate = totalCampaigns > 0
        ? campaignsData.reduce((sum, c) => sum + parseFloat(String(c.click_rate || 0)), 0) / totalCampaigns
        : 0;
      const avgBounceRate = totalCampaigns > 0
        ? campaignsData.reduce((sum, c) => sum + parseFloat(String(c.bounce_rate || 0)), 0) / totalCampaigns
        : 0;

      setStats({
        totalCampaigns,
        totalSent,
        avgOpenRate,
        avgClickRate,
        avgBounceRate,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 !pl-20 md:!pl-24 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Bulk Email Analytics</h1>
            <p className="text-muted-foreground">Track your email campaign performance</p>
          </div>
        </div>
        
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgClickRate.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bounce Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgBounceRate.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No campaigns found in this time period
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{campaign.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      Sent: {new Date(campaign.sent_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold">{campaign.total_recipients}</p>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{campaign.open_rate}%</p>
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{campaign.click_rate}%</p>
                      <p className="text-xs text-muted-foreground">Clicked</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
