import { useHasRole } from '@/hooks/usePermission';
import type { ReactNode } from 'react';

interface RoleGuardProps {
  roles: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const allowed = useHasRole(roles);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
