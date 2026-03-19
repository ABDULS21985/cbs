export type Role = 'CBS_ADMIN' | 'CBS_OFFICER' | 'BRANCH_MANAGER' | 'TELLER' | 'LOAN_OFFICER' |
  'TREASURY' | 'RISK_OFFICER' | 'COMPLIANCE' | 'AUDITOR' | 'PORTAL_USER';

export interface Permission {
  module: string;
  action: string;
  scope?: 'own_branch' | 'own_region' | 'all';
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  CBS_ADMIN: [{ module: '*', action: '*', scope: 'all' }],
  CBS_OFFICER: [
    { module: 'customers', action: '*', scope: 'all' },
    { module: 'accounts', action: '*', scope: 'all' },
    { module: 'payments', action: '*', scope: 'all' },
    { module: 'cards', action: 'view', scope: 'all' },
    { module: 'lending', action: 'view', scope: 'all' },
    { module: 'lending', action: 'create', scope: 'all' },
    { module: 'reports', action: 'view', scope: 'all' },
    { module: 'reports', action: 'export', scope: 'all' },
  ],
  BRANCH_MANAGER: [
    { module: 'customers', action: '*', scope: 'own_branch' },
    { module: 'accounts', action: '*', scope: 'own_branch' },
    { module: 'payments', action: '*', scope: 'own_branch' },
    { module: 'lending', action: '*', scope: 'own_branch' },
    { module: 'cards', action: 'view', scope: 'own_branch' },
    { module: 'reports', action: 'view', scope: 'own_branch' },
    { module: 'operations', action: 'view', scope: 'own_branch' },
    { module: 'admin', action: 'view', scope: 'own_branch' },
  ],
  TELLER: [
    { module: 'customers', action: 'view', scope: 'own_branch' },
    { module: 'accounts', action: 'view', scope: 'own_branch' },
    { module: 'payments', action: 'create', scope: 'own_branch' },
    { module: 'payments', action: 'view', scope: 'own_branch' },
  ],
  LOAN_OFFICER: [
    { module: 'customers', action: 'view', scope: 'all' },
    { module: 'lending', action: '*', scope: 'all' },
    { module: 'accounts', action: 'view', scope: 'all' },
    { module: 'reports', action: 'view', scope: 'all' },
  ],
  TREASURY: [
    { module: 'treasury', action: '*', scope: 'all' },
    { module: 'accounts', action: 'view', scope: 'all' },
    { module: 'reports', action: 'view', scope: 'all' },
  ],
  RISK_OFFICER: [
    { module: 'risk', action: '*', scope: 'all' },
    { module: 'compliance', action: 'view', scope: 'all' },
    { module: 'lending', action: 'view', scope: 'all' },
    { module: 'reports', action: 'view', scope: 'all' },
  ],
  COMPLIANCE: [
    { module: 'compliance', action: '*', scope: 'all' },
    { module: 'risk', action: 'view', scope: 'all' },
    { module: 'customers', action: 'view', scope: 'all' },
    { module: 'reports', action: 'view', scope: 'all' },
  ],
  AUDITOR: [
    { module: '*', action: 'view', scope: 'all' },
    { module: 'reports', action: 'export', scope: 'all' },
  ],
  PORTAL_USER: [
    { module: 'customers', action: 'view', scope: 'own_branch' },
    { module: 'accounts', action: 'view', scope: 'own_branch' },
  ],
};

export function hasPermission(userRoles: string[], module: string, action: string): boolean {
  return userRoles.some((role) => {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return perms.some((p) =>
      (p.module === '*' || p.module === module) &&
      (p.action === '*' || p.action === action)
    );
  });
}

export function hasRole(userRoles: string[], requiredRoles: string | string[]): boolean {
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return required.some((r) => userRoles.includes(r));
}

// Map navigation paths to modules for permission filtering
export const PATH_MODULE_MAP: Record<string, string> = {
  '/dashboard': '*',
  '/customers': 'customers',
  '/accounts': 'accounts',
  '/lending': 'lending',
  '/payments': 'payments',
  '/cards': 'cards',
  '/treasury': 'treasury',
  '/risk': 'risk',
  '/compliance': 'compliance',
  '/operations': 'operations',
  '/reports': 'reports',
  '/admin': 'admin',
};

export function canAccessPath(userRoles: string[], path: string): boolean {
  const module = Object.entries(PATH_MODULE_MAP).find(([p]) => path.startsWith(p))?.[1];
  if (!module) return true;
  if (module === '*') return true;
  return hasPermission(userRoles, module, 'view');
}
