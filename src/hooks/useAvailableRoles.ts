import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AvailableRoles } from '@/contexts/RoleContext';

export function useAvailableRoles() {
  const [availableRoles, setAvailableRoles] = useState<AvailableRoles | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableRoles();
  }, []);

  const loadAvailableRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAvailableRoles(null);
        setLoading(false);
        return;
      }

      const roles: AvailableRoles = {
        isAdmin: false,
        isSuperAdmin: false,
        isGodAdmin: false,
        associations: [],
        companies: [],
        isMember: false,
      };

      // Check admin status
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('is_super_admin, is_hidden')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminData) {
        roles.isAdmin = true;
        roles.isSuperAdmin = adminData.is_super_admin || false;
        roles.isGodAdmin = adminData.is_super_admin && (adminData as any).is_hidden === true;
      }

      // Check association manager roles
      const { data: associationManagers } = await supabase
        .from('association_managers')
        .select('association_id, association:associations(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (associationManagers && associationManagers.length > 0) {
        roles.associations = associationManagers
          .filter(am => am.association)
          .map(am => ({
            id: (am.association as any).id,
            name: (am.association as any).name,
          }));
      }

      // Check company admin roles
      const { data: companyAdmins } = await supabase
        .from('members')
        .select('company_id, role, company:companies(id, name)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .eq('is_active', true);

      if (companyAdmins && companyAdmins.length > 0) {
        roles.companies = companyAdmins
          .filter(ca => ca.company)
          .map(ca => ({
            id: (ca.company as any).id,
            name: (ca.company as any).name,
            role: ca.role as 'owner' | 'admin',
          }));
      }

      // Check member status
      const { data: memberData } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      roles.isMember = !!memberData;

      setAvailableRoles(roles);
      setLoading(false);
    } catch (error) {
      console.error('Error loading available roles:', error);
      setAvailableRoles(null);
      setLoading(false);
    }
  };

  return { availableRoles, loading, refreshRoles: loadAvailableRoles };
}
