import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'association' | 'company' | 'member' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

      // Check if admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminData) {
        setRole('admin');
        setUserData({ ...adminData, type: 'admin' });
        setIsSuperAdmin(adminData.is_super_admin || false);
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

  return { role, loading, userData, refreshRole: loadUserRole, isSuperAdmin };
}
