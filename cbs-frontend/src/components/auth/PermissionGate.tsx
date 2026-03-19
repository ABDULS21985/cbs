import { usePermission } from '@/hooks/usePermission';
import type { ReactNode } from 'react';

interface PermissionGateProps {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ module, action, children, fallback = null }: PermissionGateProps) {
  const allowed = usePermission(module, action);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
