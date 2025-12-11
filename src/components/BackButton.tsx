import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Simple back button that always navigates to the fallbackPath
 */
export const BackButton = ({ 
  fallbackPath = '/dashboard', 
  label = 'Back',
  variant = 'ghost',
  size = 'default',
  className
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(fallbackPath);
  };

  return (
    <Button variant={variant} size={size} onClick={handleBack} className={className}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
};
