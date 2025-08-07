import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminRouteProps {
  children: React.ReactNode;
  requiredRole?: 'moderator' | 'admin' | 'super_admin';
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ 
  children, 
  requiredRole = 'moderator' 
}) => {
  const { userRole, loading, error } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin permissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">Error loading admin permissions: {error}</div>
      </div>
    );
  }

  // Check role hierarchy
  const hasAccess = () => {
    if (!userRole) return false;
    
    switch (requiredRole) {
      case 'super_admin':
        return userRole === 'super_admin';
      case 'admin':
        return userRole === 'admin' || userRole === 'super_admin';
      case 'moderator':
        return userRole === 'moderator' || userRole === 'admin' || userRole === 'super_admin';
      default:
        return false;
    }
  };

  if (!hasAccess()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};