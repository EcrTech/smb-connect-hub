import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import AdminAnalytics from './admin/AdminAnalytics';
import AssociationDashboard from './association/AssociationDashboard';
import CompanyDashboard from './company/CompanyDashboard';
import MemberDashboard from './member/MemberDashboard';

export default function Dashboard() {
  const { role, loading, refreshRole } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !role) {
      // User has no role assigned, redirect to request association page
      navigate('/request-association');
    }
  }, [role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  // Show refresh option if no role is found
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">No role assigned yet</p>
          <Button onClick={refreshRole}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case 'admin':
      return <AdminAnalytics />;
    case 'association':
      return <AssociationDashboard />;
    case 'company':
      return <CompanyDashboard />;
    case 'member':
      navigate('/feed');
      return null;
    default:
      return null;
  }
}
