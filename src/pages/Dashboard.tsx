import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import AdminDashboard from './admin/AdminDashboard';
import AssociationDashboard from './association/AssociationDashboard';
import CompanyDashboard from './company/CompanyDashboard';
import MemberDashboard from './member/MemberDashboard';

export default function Dashboard() {
  const { role, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !role) {
      // User has no role assigned, redirect to setup
      navigate('/setup');
    }
  }, [role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'association':
      return <AssociationDashboard />;
    case 'company':
      return <CompanyDashboard />;
    case 'member':
      return <MemberDashboard />;
    default:
      return null;
  }
}
