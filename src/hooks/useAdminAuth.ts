import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';

interface AdminAuthState {
  userRole: UserRole | null;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export const useAdminAuth = (): AdminAuthState => {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try to get user role from user_roles table
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError && roleError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching user role:', roleError);
          setError('Failed to fetch user role');
          setUserRole('user'); // Default to user role
        } else {
          setUserRole(roleData?.role || 'user');
        }
      } catch (err) {
        console.error('Error in fetchUserRole:', err);
        setError('Failed to fetch user role');
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isModerator = userRole === 'moderator' || isAdmin;
  const isSuperAdmin = userRole === 'super_admin';

  return {
    userRole,
    isAdmin,
    isModerator,
    isSuperAdmin,
    loading: authLoading || loading,
    error,
  };
};