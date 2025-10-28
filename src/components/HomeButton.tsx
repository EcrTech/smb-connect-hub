import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';
import logo from '@/assets/smb-connect-logo.jpg';

export const HomeButton = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();

  const getHomePath = () => {
    switch(role) {
      case 'admin':
      case 'god-admin':
        return '/admin';
      case 'association':
        return '/association';
      case 'company':
        return '/company';
      case 'member':
        return '/feed';
      default:
        return '/dashboard';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate(getHomePath())}
            className="fixed top-4 left-4 z-50"
          >
            <img 
              src={logo} 
              alt="SMB Connect" 
              className="w-auto rounded-lg"
              style={{ height: '2.8rem' }}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Go to {role === 'admin' || role === 'god-admin' ? 'Admin Dashboard' : role === 'association' ? 'Association Dashboard' : role === 'company' ? 'Company Dashboard' : role === 'member' ? 'Feed' : 'Dashboard'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
