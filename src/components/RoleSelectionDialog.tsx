import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/hooks/useUserRole';
import { AvailableRoles } from '@/contexts/RoleContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Users, Shield, User } from 'lucide-react';

interface RoleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoles: AvailableRoles;
  onSelectRole: (role: UserRole, associationId?: string, companyId?: string) => void;
}

export const RoleSelectionDialog = ({ 
  open, 
  onOpenChange, 
  availableRoles,
  onSelectRole 
}: RoleSelectionDialogProps) => {
  const [selectedOption, setSelectedOption] = useState<{
    role: UserRole;
    associationId?: string;
    companyId?: string;
  } | null>(null);

  const handleConfirm = () => {
    if (selectedOption) {
      onSelectRole(
        selectedOption.role,
        selectedOption.associationId,
        selectedOption.companyId
      );
      onOpenChange(false);
    }
  };

  const roleOptions = [];

  // Add admin option
  if (availableRoles.isAdmin) {
    roleOptions.push({
      role: (availableRoles.isGodAdmin ? 'god-admin' : 'admin') as UserRole,
      label: availableRoles.isGodAdmin ? 'God Admin' : availableRoles.isSuperAdmin ? 'Super Admin' : 'Platform Admin',
      description: 'Full platform administration access',
      icon: Shield,
    });
  }

  // Add association manager options
  availableRoles.associations.forEach(assoc => {
    roleOptions.push({
      role: 'association' as UserRole,
      associationId: assoc.id,
      label: `Association Manager: ${assoc.name}`,
      description: 'Manage association and member companies',
      icon: Users,
    });
  });

  // Add company admin options
  availableRoles.companies.forEach(company => {
    roleOptions.push({
      role: 'company' as UserRole,
      companyId: company.id,
      label: `${company.role === 'owner' ? 'Company Owner' : 'Company Admin'}: ${company.name}`,
      description: 'Manage company and members',
      icon: Building2,
    });
  });

  // Add member option
  if (availableRoles.isMember) {
    roleOptions.push({
      role: 'member' as UserRole,
      label: 'Member View',
      description: 'Personal profile and networking',
      icon: User,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Role</DialogTitle>
          <DialogDescription>
            You have access to multiple roles. Please select which role you want to use for this session.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {roleOptions.map((option, index) => {
              const Icon = option.icon;
              const isSelected = 
                selectedOption?.role === option.role &&
                selectedOption?.associationId === option.associationId &&
                selectedOption?.companyId === option.companyId;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedOption({
                    role: option.role,
                    associationId: option.associationId,
                    companyId: option.companyId,
                  })}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                        {option.label}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOption}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
