import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Smart back button that uses browser history with fallback
 * If user deep-linked or history is empty, navigates to fallbackPath
 */
export const BackButton = ({ 
  fallbackPath = '/dashboard', 
  label = 'Back',
  variant = 'ghost',
  size = 'default'
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback for deep links
      navigate(fallbackPath);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleBack}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
};
