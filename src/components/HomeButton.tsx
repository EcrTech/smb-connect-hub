import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const HomeButton = () => {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Home className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Go to Dashboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
