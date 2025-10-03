import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import logo from '@/assets/smb-connect-logo.jpg';

export const HomeButton = () => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate('/dashboard')}
            className="fixed top-4 left-4 z-50 transition-all hover:scale-105"
          >
            <img 
              src={logo} 
              alt="SMB Connect" 
              className="h-12 w-auto rounded-lg shadow-md hover:shadow-lg transition-shadow"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Go to Dashboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
