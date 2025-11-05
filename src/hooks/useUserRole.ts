import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRoleContext } from '@/contexts/RoleContext';

export type UserRole = 'admin' | 'god-admin' | 'association' | 'company' | 'member' | null;

export function useUserRole() {
  const { selectedRole, selectedAssociationId, selectedCompanyId } = useRoleContext();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isGodAdmin, setIsGodAdmin] = useState(false);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // If a role is already selected from context, use that role
      if (selectedRole) {
        // Load the appropriate userData based on selected role
        if (selectedRole === 'admin' || selectedRole === 'god-admin') {
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (adminData) {
            const isGod = adminData.is_super_admin && (adminData as any).is_hidden === true;
            setRole(selectedRole);
            setUserData({ ...adminData, type: selectedRole });
            setIsSuperAdmin(adminData.is_super_admin || false);
            setIsGodAdmin(isGod);
          }
        } else if (selectedRole === 'association' && selectedAssociationId) {
          const { data: associationData } = await supabase
            .from('association_managers')
            .select('*, association:associations(*)')
            .eq('user_id', user.id)
            .eq('association_id', selectedAssociationId)
            .eq('is_active', true)
            .maybeSingle();

          if (associationData) {
            setRole('association');
            setUserData({ ...associationData, type: 'association' });
          }
        } else if (selectedRole === 'company' && selectedCompanyId) {
          const { data: memberData } = await supabase
            .from('members')
            .select('*, company:companies(*, association:associations(*))')
            .eq('user_id', user.id)
            .eq('company_id', selectedCompanyId)
            .in('role', ['owner', 'admin'])
            .eq('is_active', true)
            .maybeSingle();

          if (memberData) {
            setRole('company');
            setUserData({ ...memberData, type: 'company' });
          }
        } else if (selectedRole === 'member') {
          const { data: memberDataList } = await supabase
            .from('members')
            .select('*, company:companies(*, association:associations(*))')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (memberDataList && memberDataList.length > 0) {
            const companyMember = memberDataList.find(m => m.company_id !== null);
            const memberData = companyMember || memberDataList[0];
            setRole('member');
            setUserData({ ...memberData, type: 'member' });
          }
        }
        setLoading(false);
        return;
      }

      // Default behavior: Check in priority order (for backward compatibility)
      // Check if admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminData) {
        const isGod = adminData.is_super_admin && (adminData as any).is_hidden === true;
        setRole(isGod ? 'god-admin' : 'admin');
        setUserData({ ...adminData, type: isGod ? 'god-admin' : 'admin' });
        setIsSuperAdmin(adminData.is_super_admin || false);
        setIsGodAdmin(isGod);
        setLoading(false);
        return;
      }

      // Check if association manager
      const { data: associationData } = await supabase
        .from('association_managers')
        .select('*, association:associations(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (associationData) {
        setRole('association');
        setUserData({ ...associationData, type: 'association' });
        setLoading(false);
        return;
      }

      // Check if company owner/admin or member
      // Get all member records and filter appropriately
      const { data: memberDataList } = await supabase
        .from('members')
        .select('*, company:companies(*, association:associations(*))')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberDataList && memberDataList.length > 0) {
        // Filter to get the most relevant member record
        // Priority: company-affiliated member > standalone member
        const companyMember = memberDataList.find(m => m.company_id !== null);
        const memberData = companyMember || memberDataList[0];
        
        // If member has company and is owner/admin, set as company role
        if (memberData.company_id && ['owner', 'admin'].includes(memberData.role)) {
          setRole('company');
          setUserData({ ...memberData, type: 'company' });
          setLoading(false);
          return;
        }
        
        // Otherwise, set as member (with or without company)
        setRole('member');
        setUserData({ ...memberData, type: 'member' });
        setLoading(false);
        return;
      }

      // New user with no role
      setRole(null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user role:', error);
      setRole(null);
      setLoading(false);
    }
  };

  return { role, loading, userData, refreshRole: loadUserRole, isSuperAdmin, isGodAdmin };
}
