import { useAuthStore } from '@/stores/authStore';
import { hasPermission, hasRole, canAccessPath } from '@/lib/permissions';

export function usePermission(module: string, action: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return hasPermission(user.roles, module, action);
}

export function useHasRole(roles: string | string[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return hasRole(user.roles, roles);
}

export function useCanAccess(path: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return canAccessPath(user.roles, path);
}
