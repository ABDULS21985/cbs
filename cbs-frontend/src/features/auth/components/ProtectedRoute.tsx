import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && user) {
    const hasRole = requiredRoles.some((role) => user.roles.includes(role) || user.roles.includes('CBS_ADMIN'));
    if (!hasRole) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <div className="text-6xl font-bold text-muted-foreground/30">403</div>
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to access this page. Contact your administrator if you believe this is an error.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
