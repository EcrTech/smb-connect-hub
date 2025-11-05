import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/hooks/useUserRole';
import { AvailableRoles } from '@/contexts/RoleContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleConfirm = () => {
    if (selectedValue) {
      const option = roleOptions.find(opt => opt.value === selectedValue);
      if (option) {
        onSelectRole(
          option.role,
          option.associationId,
          option.companyId
        );
        onOpenChange(false);
      }
    }
  };

  const roleOptions = [];

  // Add admin option
  if (availableRoles.isAdmin) {
    roleOptions.push({
      value: 'admin',
      role: (availableRoles.isGodAdmin ? 'god-admin' : 'admin') as UserRole,
      label: availableRoles.isGodAdmin ? 'God Admin' : availableRoles.isSuperAdmin ? 'Super Admin' : 'Platform Admin',
      description: 'Full platform administration access',
      icon: Shield,
    });
  }

  // Add association manager options
  availableRoles.associations.forEach((assoc, index) => {
    roleOptions.push({
      value: `association-${assoc.id}`,
      role: 'association' as UserRole,
      associationId: assoc.id,
      label: `Association Manager: ${assoc.name}`,
      description: 'Manage association and member companies',
      icon: Users,
    });
  });

  // Add company admin options
  availableRoles.companies.forEach((company, index) => {
    roleOptions.push({
      value: `company-${company.id}`,
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
      value: 'member',
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

        <div className="space-y-4">
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedValue}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
