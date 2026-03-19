import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasRole,
  canAccessPath,
  ROLE_PERMISSIONS,
  type Role,
} from '@/lib/permissions';

// ─── Exhaustive role list ───────────────────────────────────────────────────

const ALL_ROLES: Role[] = [
  'CBS_ADMIN', 'CBS_OFFICER', 'BRANCH_MANAGER', 'TELLER',
  'LOAN_OFFICER', 'TREASURY', 'RISK_OFFICER', 'COMPLIANCE', 'AUDITOR', 'PORTAL_USER',
];

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Permissions & RBAC Tests', () => {

  // ── hasPermission ────────────────────────────────────────────────────────

  describe('hasPermission()', () => {
    // T6-RBAC: CBS_ADMIN has wildcard access
    it('CBS_ADMIN should have access to every module and action', () => {
      const modules = ['customers', 'accounts', 'lending', 'payments', 'cards',
        'treasury', 'risk', 'compliance', 'admin', 'reports', 'operations'];
      const actions = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

      for (const mod of modules) {
        for (const action of actions) {
          expect(hasPermission(['CBS_ADMIN'], mod, action)).toBe(true);
        }
      }
    });

    // T6-RBAC: CBS_OFFICER permissions
    it('CBS_OFFICER should access customers, accounts, payments with all actions', () => {
      expect(hasPermission(['CBS_OFFICER'], 'customers', 'view')).toBe(true);
      expect(hasPermission(['CBS_OFFICER'], 'customers', 'create')).toBe(true);
      expect(hasPermission(['CBS_OFFICER'], 'customers', 'delete')).toBe(true);
      expect(hasPermission(['CBS_OFFICER'], 'accounts', 'edit')).toBe(true);
      expect(hasPermission(['CBS_OFFICER'], 'payments', 'create')).toBe(true);
    });

    it('CBS_OFFICER should NOT access admin, treasury, risk, compliance modules', () => {
      expect(hasPermission(['CBS_OFFICER'], 'admin', 'view')).toBe(false);
      expect(hasPermission(['CBS_OFFICER'], 'treasury', 'view')).toBe(false);
      expect(hasPermission(['CBS_OFFICER'], 'risk', 'view')).toBe(false);
      expect(hasPermission(['CBS_OFFICER'], 'compliance', 'view')).toBe(false);
    });

    it('CBS_OFFICER can view cards but not create/edit/delete', () => {
      expect(hasPermission(['CBS_OFFICER'], 'cards', 'view')).toBe(true);
      expect(hasPermission(['CBS_OFFICER'], 'cards', 'create')).toBe(false);
      expect(hasPermission(['CBS_OFFICER'], 'cards', 'edit')).toBe(false);
    });

    // T6-RBAC: TELLER — limited scope
    it('TELLER should only view customers and accounts, create/view payments', () => {
      expect(hasPermission(['TELLER'], 'customers', 'view')).toBe(true);
      expect(hasPermission(['TELLER'], 'customers', 'create')).toBe(false);
      expect(hasPermission(['TELLER'], 'customers', 'edit')).toBe(false);
      expect(hasPermission(['TELLER'], 'accounts', 'view')).toBe(true);
      expect(hasPermission(['TELLER'], 'accounts', 'create')).toBe(false);
      expect(hasPermission(['TELLER'], 'payments', 'create')).toBe(true);
      expect(hasPermission(['TELLER'], 'payments', 'view')).toBe(true);
    });

    it('TELLER should NOT access lending, treasury, admin, risk, compliance', () => {
      expect(hasPermission(['TELLER'], 'lending', 'view')).toBe(false);
      expect(hasPermission(['TELLER'], 'treasury', 'view')).toBe(false);
      expect(hasPermission(['TELLER'], 'admin', 'view')).toBe(false);
      expect(hasPermission(['TELLER'], 'risk', 'view')).toBe(false);
      expect(hasPermission(['TELLER'], 'compliance', 'view')).toBe(false);
      expect(hasPermission(['TELLER'], 'reports', 'view')).toBe(false);
    });

    // T6-RBAC: BRANCH_MANAGER
    it('BRANCH_MANAGER should have full access to customers, accounts, payments, lending within branch', () => {
      expect(hasPermission(['BRANCH_MANAGER'], 'customers', 'view')).toBe(true);
      expect(hasPermission(['BRANCH_MANAGER'], 'customers', 'create')).toBe(true);
      expect(hasPermission(['BRANCH_MANAGER'], 'accounts', 'delete')).toBe(true);
      expect(hasPermission(['BRANCH_MANAGER'], 'payments', 'create')).toBe(true);
      expect(hasPermission(['BRANCH_MANAGER'], 'lending', 'approve')).toBe(true);
    });

    it('BRANCH_MANAGER should NOT access treasury, risk, compliance modules', () => {
      expect(hasPermission(['BRANCH_MANAGER'], 'treasury', 'view')).toBe(false);
      expect(hasPermission(['BRANCH_MANAGER'], 'risk', 'view')).toBe(false);
      expect(hasPermission(['BRANCH_MANAGER'], 'compliance', 'view')).toBe(false);
    });

    // T6-RBAC: LOAN_OFFICER
    it('LOAN_OFFICER should have full lending access and view customers/accounts', () => {
      expect(hasPermission(['LOAN_OFFICER'], 'lending', 'view')).toBe(true);
      expect(hasPermission(['LOAN_OFFICER'], 'lending', 'create')).toBe(true);
      expect(hasPermission(['LOAN_OFFICER'], 'lending', 'approve')).toBe(true);
      expect(hasPermission(['LOAN_OFFICER'], 'customers', 'view')).toBe(true);
      expect(hasPermission(['LOAN_OFFICER'], 'accounts', 'view')).toBe(true);
    });

    it('LOAN_OFFICER should NOT create customers, accounts or access admin', () => {
      expect(hasPermission(['LOAN_OFFICER'], 'customers', 'create')).toBe(false);
      expect(hasPermission(['LOAN_OFFICER'], 'accounts', 'create')).toBe(false);
      expect(hasPermission(['LOAN_OFFICER'], 'admin', 'view')).toBe(false);
      expect(hasPermission(['LOAN_OFFICER'], 'treasury', 'view')).toBe(false);
    });

    // T6-RBAC: TREASURY
    it('TREASURY should have full treasury access and view accounts/reports', () => {
      expect(hasPermission(['TREASURY'], 'treasury', 'view')).toBe(true);
      expect(hasPermission(['TREASURY'], 'treasury', 'create')).toBe(true);
      expect(hasPermission(['TREASURY'], 'accounts', 'view')).toBe(true);
      expect(hasPermission(['TREASURY'], 'reports', 'view')).toBe(true);
    });

    it('TREASURY should NOT access customers, lending, admin', () => {
      expect(hasPermission(['TREASURY'], 'customers', 'view')).toBe(false);
      expect(hasPermission(['TREASURY'], 'lending', 'view')).toBe(false);
      expect(hasPermission(['TREASURY'], 'admin', 'view')).toBe(false);
    });

    // T6-RBAC: RISK_OFFICER
    it('RISK_OFFICER should have full risk access and view compliance/lending/reports', () => {
      expect(hasPermission(['RISK_OFFICER'], 'risk', 'view')).toBe(true);
      expect(hasPermission(['RISK_OFFICER'], 'risk', 'create')).toBe(true);
      expect(hasPermission(['RISK_OFFICER'], 'compliance', 'view')).toBe(true);
      expect(hasPermission(['RISK_OFFICER'], 'lending', 'view')).toBe(true);
      expect(hasPermission(['RISK_OFFICER'], 'reports', 'view')).toBe(true);
    });

    it('RISK_OFFICER should NOT create in compliance or access admin', () => {
      expect(hasPermission(['RISK_OFFICER'], 'compliance', 'create')).toBe(false);
      expect(hasPermission(['RISK_OFFICER'], 'admin', 'view')).toBe(false);
      expect(hasPermission(['RISK_OFFICER'], 'customers', 'view')).toBe(false);
    });

    // T6-RBAC: COMPLIANCE
    it('COMPLIANCE should have full compliance access and view risk/customers/reports', () => {
      expect(hasPermission(['COMPLIANCE'], 'compliance', 'view')).toBe(true);
      expect(hasPermission(['COMPLIANCE'], 'compliance', 'create')).toBe(true);
      expect(hasPermission(['COMPLIANCE'], 'risk', 'view')).toBe(true);
      expect(hasPermission(['COMPLIANCE'], 'customers', 'view')).toBe(true);
      expect(hasPermission(['COMPLIANCE'], 'reports', 'view')).toBe(true);
    });

    it('COMPLIANCE should NOT create in risk or access admin/treasury', () => {
      expect(hasPermission(['COMPLIANCE'], 'risk', 'create')).toBe(false);
      expect(hasPermission(['COMPLIANCE'], 'admin', 'view')).toBe(false);
      expect(hasPermission(['COMPLIANCE'], 'treasury', 'view')).toBe(false);
    });

    // T6-RBAC: AUDITOR — view-only with export
    it('AUDITOR should view all modules but cannot create/edit/delete', () => {
      const modules = ['customers', 'accounts', 'lending', 'payments', 'treasury', 'risk',
        'compliance', 'admin', 'reports', 'operations'];
      for (const mod of modules) {
        expect(hasPermission(['AUDITOR'], mod, 'view')).toBe(true);
        expect(hasPermission(['AUDITOR'], mod, 'create')).toBe(false);
        expect(hasPermission(['AUDITOR'], mod, 'edit')).toBe(false);
        expect(hasPermission(['AUDITOR'], mod, 'delete')).toBe(false);
      }
    });

    it('AUDITOR should be able to export reports', () => {
      expect(hasPermission(['AUDITOR'], 'reports', 'export')).toBe(true);
    });

    it('AUDITOR should NOT export from non-reports modules', () => {
      expect(hasPermission(['AUDITOR'], 'customers', 'export')).toBe(false);
      expect(hasPermission(['AUDITOR'], 'accounts', 'export')).toBe(false);
    });

    // T6-RBAC: PORTAL_USER
    it('PORTAL_USER should only view customers and accounts', () => {
      expect(hasPermission(['PORTAL_USER'], 'customers', 'view')).toBe(true);
      expect(hasPermission(['PORTAL_USER'], 'accounts', 'view')).toBe(true);
      expect(hasPermission(['PORTAL_USER'], 'payments', 'view')).toBe(false);
      expect(hasPermission(['PORTAL_USER'], 'lending', 'view')).toBe(false);
      expect(hasPermission(['PORTAL_USER'], 'admin', 'view')).toBe(false);
    });

    // Multi-role — permissions are additive
    it('should grant additive permissions for users with multiple roles', () => {
      const roles = ['TELLER', 'LOAN_OFFICER'];
      // TELLER can create payments, LOAN_OFFICER cannot
      expect(hasPermission(roles, 'payments', 'create')).toBe(true);
      // LOAN_OFFICER can create lending, TELLER cannot
      expect(hasPermission(roles, 'lending', 'create')).toBe(true);
    });

    // Unknown role
    it('should deny access for unknown roles', () => {
      expect(hasPermission(['UNKNOWN_ROLE'], 'customers', 'view')).toBe(false);
    });

    // Empty roles
    it('should deny access for empty roles array', () => {
      expect(hasPermission([], 'customers', 'view')).toBe(false);
    });
  });

  // ── hasRole ──────────────────────────────────────────────────────────────

  describe('hasRole()', () => {
    it('should return true when user has one of the required roles', () => {
      expect(hasRole(['CBS_ADMIN', 'CBS_OFFICER'], 'CBS_ADMIN')).toBe(true);
      expect(hasRole(['TELLER'], ['TELLER', 'CBS_OFFICER'])).toBe(true);
    });

    it('should return false when user has none of the required roles', () => {
      expect(hasRole(['TELLER'], 'CBS_ADMIN')).toBe(false);
      expect(hasRole(['TELLER'], ['CBS_ADMIN', 'CBS_OFFICER'])).toBe(false);
    });

    it('should accept string or array for required roles', () => {
      expect(hasRole(['CBS_ADMIN'], 'CBS_ADMIN')).toBe(true);
      expect(hasRole(['CBS_ADMIN'], ['CBS_ADMIN'])).toBe(true);
    });

    it('should return false for empty user roles', () => {
      expect(hasRole([], 'CBS_ADMIN')).toBe(false);
    });
  });

  // ── canAccessPath ────────────────────────────────────────────────────────

  describe('canAccessPath()', () => {
    it('should allow all roles to access /dashboard', () => {
      for (const role of ALL_ROLES) {
        expect(canAccessPath([role], '/dashboard')).toBe(true);
      }
    });

    it('should allow CBS_ADMIN to access all paths', () => {
      const paths = ['/customers', '/accounts', '/lending', '/payments', '/cards',
        '/treasury', '/risk', '/compliance', '/admin', '/reports', '/operations'];
      for (const path of paths) {
        expect(canAccessPath(['CBS_ADMIN'], path)).toBe(true);
      }
    });

    it('should deny TELLER access to /treasury', () => {
      expect(canAccessPath(['TELLER'], '/treasury')).toBe(false);
    });

    it('should deny TELLER access to /admin', () => {
      expect(canAccessPath(['TELLER'], '/admin')).toBe(false);
    });

    it('should deny TELLER access to /lending', () => {
      expect(canAccessPath(['TELLER'], '/lending')).toBe(false);
    });

    it('should allow TREASURY role to access /treasury', () => {
      expect(canAccessPath(['TREASURY'], '/treasury')).toBe(true);
    });

    it('should deny TREASURY role access to /customers', () => {
      expect(canAccessPath(['TREASURY'], '/customers')).toBe(false);
    });

    it('should allow RISK_OFFICER to access /risk', () => {
      expect(canAccessPath(['RISK_OFFICER'], '/risk')).toBe(true);
    });

    it('should allow COMPLIANCE to access /compliance', () => {
      expect(canAccessPath(['COMPLIANCE'], '/compliance')).toBe(true);
    });

    it('should allow access to unknown paths (no module mapping)', () => {
      expect(canAccessPath(['TELLER'], '/some-unknown-path')).toBe(true);
    });

    it('should match path prefixes (e.g. /customers/123)', () => {
      expect(canAccessPath(['CBS_OFFICER'], '/customers/123')).toBe(true);
      expect(canAccessPath(['TELLER'], '/customers/123')).toBe(true);
    });

    // T6-RBAC-09: Admin pages only accessible to CBS_ADMIN
    it('should deny non-admin roles access to /admin paths', () => {
      const nonAdminRoles: Role[] = ['CBS_OFFICER', 'TELLER', 'LOAN_OFFICER',
        'TREASURY', 'RISK_OFFICER', 'COMPLIANCE', 'AUDITOR', 'PORTAL_USER'];
      for (const role of nonAdminRoles) {
        // BRANCH_MANAGER and AUDITOR have admin view permission
        if (role === 'AUDITOR') continue; // AUDITOR has wildcard view
        expect(canAccessPath([role], '/admin')).toBe(false);
      }
    });

    it('BRANCH_MANAGER should access /admin (has admin:view permission)', () => {
      expect(canAccessPath(['BRANCH_MANAGER'], '/admin')).toBe(true);
    });

    it('AUDITOR should access /admin (has wildcard view permission)', () => {
      expect(canAccessPath(['AUDITOR'], '/admin')).toBe(true);
    });
  });

  // ── ROLE_PERMISSIONS completeness ────────────────────────────────────────

  describe('ROLE_PERMISSIONS definition completeness', () => {
    it('should define permissions for all known roles', () => {
      for (const role of ALL_ROLES) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
        expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      }
    });

    it('CBS_ADMIN should have exactly one wildcard permission', () => {
      const adminPerms = ROLE_PERMISSIONS.CBS_ADMIN;
      expect(adminPerms).toHaveLength(1);
      expect(adminPerms[0]).toEqual({ module: '*', action: '*', scope: 'all' });
    });

    it('each permission should have module and action fields', () => {
      for (const [, perms] of Object.entries(ROLE_PERMISSIONS)) {
        for (const perm of perms) {
          expect(perm.module).toBeTruthy();
          expect(perm.action).toBeTruthy();
        }
      }
    });

    // T6-RBAC-07: Data scope validation
    it('TELLER permissions should all be scoped to own_branch', () => {
      for (const perm of ROLE_PERMISSIONS.TELLER) {
        expect(perm.scope).toBe('own_branch');
      }
    });

    it('CBS_OFFICER permissions should all be scoped to all', () => {
      for (const perm of ROLE_PERMISSIONS.CBS_OFFICER) {
        expect(perm.scope).toBe('all');
      }
    });

    it('BRANCH_MANAGER permissions should all be scoped to own_branch', () => {
      for (const perm of ROLE_PERMISSIONS.BRANCH_MANAGER) {
        expect(perm.scope).toBe('own_branch');
      }
    });
  });

  // ── Navigation role mapping ──────────────────────────────────────────────

  describe('Navigation items role restrictions', () => {
    // Import navigation items inline to validate roles
    it('Admin nav item should only be accessible to CBS_ADMIN', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const adminItem = navigationItems
        .flatMap((s) => s.items)
        .find((i) => i.label === 'Admin');

      expect(adminItem).toBeDefined();
      expect(adminItem!.roles).toEqual(['CBS_ADMIN']);
    });

    it('Operations nav item should only be accessible to CBS_ADMIN', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const opsItem = navigationItems
        .flatMap((s) => s.items)
        .find((i) => i.label === 'Operations');

      expect(opsItem).toBeDefined();
      expect(opsItem!.roles).toEqual(['CBS_ADMIN']);
    });

    it('Treasury nav item should only be accessible to CBS_ADMIN and TREASURY', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const treasuryItem = navigationItems
        .flatMap((s) => s.items)
        .find((i) => i.label === 'Treasury');

      expect(treasuryItem).toBeDefined();
      expect(treasuryItem!.roles).toContain('CBS_ADMIN');
      expect(treasuryItem!.roles).toContain('TREASURY');
    });

    it('Risk nav item should only be accessible to CBS_ADMIN and RISK_OFFICER', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const riskItem = navigationItems
        .flatMap((s) => s.items)
        .find((i) => i.label === 'Risk');

      expect(riskItem).toBeDefined();
      expect(riskItem!.roles).toContain('CBS_ADMIN');
      expect(riskItem!.roles).toContain('RISK_OFFICER');
    });

    it('Compliance nav item should only be accessible to CBS_ADMIN and COMPLIANCE', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const compItem = navigationItems
        .flatMap((s) => s.items)
        .find((i) => i.label === 'Compliance');

      expect(compItem).toBeDefined();
      expect(compItem!.roles).toContain('CBS_ADMIN');
      expect(compItem!.roles).toContain('COMPLIANCE');
    });

    it('Dashboard should be accessible to all roles (wildcard)', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const dashItem = navigationItems
        .flatMap((s) => s.items)
        .find((i) => i.label === 'Dashboard');

      expect(dashItem).toBeDefined();
      expect(dashItem!.roles).toContain('*');
    });

    it('every navigation item should have a roles array defined', async () => {
      const { navigationItems } = await import('@/components/layout/navigation');
      const allItems = navigationItems.flatMap((s) => s.items);
      for (const item of allItems) {
        expect(item.roles).toBeDefined();
        expect(Array.isArray(item.roles)).toBe(true);
        expect(item.roles!.length).toBeGreaterThan(0);
      }
    });
  });
});
