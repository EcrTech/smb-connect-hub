import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useRoleContext } from '@/contexts/RoleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RoleSwitcher } from './RoleSwitcher';
import { 
  Shield, 
  Building2, 
  Users, 
  UserCircle,
  ArrowRight
} from 'lucide-react';

export function RoleNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useUserRole();
  const { selectedRole } = useRoleContext();
  
  // Use selected role from context if available
  const activeRole = selectedRole || role;

  // Don't show on auth pages
  if (location.pathname.startsWith('/auth') || location.pathname === '/') {
    return null;
  }

  const navigationOptions = [];

  // All users can access member features
  navigationOptions.push({
    label: 'Member View',
    icon: UserCircle,
    path: '/feed',
    description: 'Browse members and connect'
  });

  // Add role-specific navigation
  if (activeRole === 'admin' || activeRole === 'god-admin') {
    navigationOptions.push({
      label: 'Admin Dashboard',
      icon: Shield,
      path: '/admin',
      description: 'Manage platform'
    });
  }

  if (activeRole === 'association') {
    navigationOptions.push({
      label: 'Association Dashboard',
      icon: Building2,
      path: '/association',
      description: 'Manage association'
    });
  }

  if (activeRole === 'company') {
    navigationOptions.push({
      label: 'Company Dashboard',
      icon: Building2,
      path: '/company',
      description: 'Manage company'
    });
  }

  // Only show if user has multiple roles/views
  if (navigationOptions.length <= 1) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Switch View</h3>
          <RoleSwitcher />
        </div>
        <div className="flex flex-wrap gap-2">
          {navigationOptions.map((option) => {
            const Icon = option.icon;
            const isActive = location.pathname.startsWith(option.path);
            
            return (
              <Button
                key={option.path}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate(option.path)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {option.label}
                {!isActive && <ArrowRight className="h-3 w-3 ml-1" />}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
