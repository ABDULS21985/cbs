import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { subHours, subDays, subMinutes } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED' | 'PENDING_ACTIVATION';

export interface CbsUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  roles: string[];
  branchId: string;
  branchName: string;
  department: string;
  reportingTo?: string;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  mfaEnabled: boolean;
  ipRestriction?: string[];
  loginHoursFrom?: string;
  loginHoursTo?: string;
}

export interface CreateUserRequest {
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  branchId: string;
  department: string;
  reportingTo?: string;
  roles: string[];
  mfaRequired: boolean;
  ipRestriction?: string[];
  loginHoursFrom?: string;
  loginHoursTo?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  userCount: number;
  permissionCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  isSystem: boolean;
  permissions?: string[];
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  ip: string;
  loginTime: string;
  lastActivity: string;
  browser: string;
  sessionCount: number;
  isMultiple: boolean;
}

export interface LoginEvent {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  ip: string;
  browser: string;
  outcome: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  sessionId?: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────

const now = new Date();

const DEMO_USERS: CbsUser[] = [
  { id: 'u1', username: 'adaeze.obi', fullName: 'Adaeze Obi', email: 'adaeze.obi@cbs.bank', phone: '+2348031234567', roles: ['SUPER_ADMIN', 'AUDIT_VIEWER'], branchId: 'br1', branchName: 'Head Office', department: 'IT Operations', reportingTo: 'CTO', status: 'ACTIVE', lastLogin: subMinutes(now, 15).toISOString(), createdAt: subDays(now, 400).toISOString(), mfaEnabled: true, loginHoursFrom: '07:00', loginHoursTo: '22:00' },
  { id: 'u2', username: 'emeka.nwosu', fullName: 'Emeka Nwosu', email: 'emeka.nwosu@cbs.bank', phone: '+2348041234567', roles: ['TELLER'], branchId: 'br2', branchName: 'Lagos Island', department: 'Retail Banking', reportingTo: 'Branch Manager', status: 'ACTIVE', lastLogin: subHours(now, 2).toISOString(), createdAt: subDays(now, 320).toISOString(), mfaEnabled: false },
  { id: 'u3', username: 'ngozi.eze', fullName: 'Ngozi Eze', email: 'ngozi.eze@cbs.bank', phone: '+2348051234567', roles: ['LOAN_OFFICER', 'CUSTOMER_MANAGER'], branchId: 'br2', branchName: 'Lagos Island', department: 'Lending', status: 'ACTIVE', lastLogin: subHours(now, 5).toISOString(), createdAt: subDays(now, 280).toISOString(), mfaEnabled: true, ipRestriction: ['192.168.1.0/24'] },
  { id: 'u4', username: 'chidi.okafor', fullName: 'Chidi Okafor', email: 'chidi.okafor@cbs.bank', roles: ['COMPLIANCE_OFFICER'], branchId: 'br1', branchName: 'Head Office', department: 'Compliance', status: 'LOCKED', lastLogin: subDays(now, 1).toISOString(), createdAt: subDays(now, 200).toISOString(), mfaEnabled: true },
  { id: 'u5', username: 'amaka.igwe', fullName: 'Amaka Igwe', email: 'amaka.igwe@cbs.bank', roles: ['TELLER', 'CUSTOMER_MANAGER'], branchId: 'br3', branchName: 'Abuja Central', department: 'Retail Banking', status: 'ACTIVE', lastLogin: subHours(now, 1).toISOString(), createdAt: subDays(now, 180).toISOString(), mfaEnabled: false },
  { id: 'u6', username: 'tunde.adeyemi', fullName: 'Tunde Adeyemi', email: 'tunde.adeyemi@cbs.bank', phone: '+2348071234567', roles: ['BRANCH_MANAGER'], branchId: 'br3', branchName: 'Abuja Central', department: 'Management', reportingTo: 'Regional Director', status: 'ACTIVE', lastLogin: subHours(now, 3).toISOString(), createdAt: subDays(now, 500).toISOString(), mfaEnabled: true },
  { id: 'u7', username: 'fatima.musa', fullName: 'Fatima Musa', email: 'fatima.musa@cbs.bank', roles: ['RISK_ANALYST'], branchId: 'br1', branchName: 'Head Office', department: 'Risk Management', status: 'DISABLED', createdAt: subDays(now, 150).toISOString(), mfaEnabled: false },
  { id: 'u8', username: 'yusuf.bello', fullName: 'Yusuf Bello', email: 'yusuf.bello@cbs.bank', roles: ['TREASURY_OFFICER'], branchId: 'br1', branchName: 'Head Office', department: 'Treasury', status: 'ACTIVE', lastLogin: subHours(now, 6).toISOString(), createdAt: subDays(now, 220).toISOString(), mfaEnabled: true, loginHoursFrom: '08:00', loginHoursTo: '18:00' },
  { id: 'u9', username: 'ifeoma.nduka', fullName: 'Ifeoma Nduka', email: 'ifeoma.nduka@cbs.bank', roles: ['CUSTOMER_MANAGER'], branchId: 'br4', branchName: 'Port Harcourt', department: 'Retail Banking', status: 'ACTIVE', lastLogin: subHours(now, 4).toISOString(), createdAt: subDays(now, 90).toISOString(), mfaEnabled: false },
  { id: 'u10', username: 'seun.alade', fullName: 'Seun Alade', email: 'seun.alade@cbs.bank', roles: ['PAYMENTS_OFFICER'], branchId: 'br2', branchName: 'Lagos Island', department: 'Payments', status: 'PENDING_ACTIVATION', createdAt: subDays(now, 2).toISOString(), mfaEnabled: true },
  { id: 'u11', username: 'kelechi.onu', fullName: 'Kelechi Onu', email: 'kelechi.onu@cbs.bank', roles: ['AUDIT_VIEWER'], branchId: 'br1', branchName: 'Head Office', department: 'Internal Audit', status: 'ACTIVE', lastLogin: subDays(now, 3).toISOString(), createdAt: subDays(now, 300).toISOString(), mfaEnabled: true },
  { id: 'u12', username: 'blessing.obi', fullName: 'Blessing Obi', email: 'blessing.obi@cbs.bank', roles: ['TELLER'], branchId: 'br4', branchName: 'Port Harcourt', department: 'Retail Banking', status: 'ACTIVE', lastLogin: subHours(now, 7).toISOString(), createdAt: subDays(now, 110).toISOString(), mfaEnabled: false },
  { id: 'u13', username: 'ahmed.sule', fullName: 'Ahmed Sule', email: 'ahmed.sule@cbs.bank', roles: ['BRANCH_MANAGER'], branchId: 'br4', branchName: 'Port Harcourt', department: 'Management', status: 'ACTIVE', lastLogin: subHours(now, 8).toISOString(), createdAt: subDays(now, 420).toISOString(), mfaEnabled: true },
  { id: 'u14', username: 'chisom.agu', fullName: 'Chisom Agu', email: 'chisom.agu@cbs.bank', roles: ['LOAN_OFFICER'], branchId: 'br5', branchName: 'Kano Branch', department: 'Lending', status: 'LOCKED', lastLogin: subDays(now, 2).toISOString(), createdAt: subDays(now, 130).toISOString(), mfaEnabled: false },
  { id: 'u15', username: 'grace.okonkwo', fullName: 'Grace Okonkwo', email: 'grace.okonkwo@cbs.bank', roles: ['COMPLIANCE_OFFICER', 'RISK_ANALYST'], branchId: 'br1', branchName: 'Head Office', department: 'Compliance', status: 'ACTIVE', lastLogin: subHours(now, 9).toISOString(), createdAt: subDays(now, 250).toISOString(), mfaEnabled: true },
  { id: 'u16', username: 'dan.ibrahim', fullName: 'Dan Ibrahim', email: 'dan.ibrahim@cbs.bank', roles: ['TELLER'], branchId: 'br5', branchName: 'Kano Branch', department: 'Retail Banking', status: 'ACTIVE', lastLogin: subHours(now, 10).toISOString(), createdAt: subDays(now, 70).toISOString(), mfaEnabled: false },
  { id: 'u17', username: 'esther.john', fullName: 'Esther John', email: 'esther.john@cbs.bank', roles: ['PAYMENTS_OFFICER', 'TREASURY_OFFICER'], branchId: 'br1', branchName: 'Head Office', department: 'Treasury', status: 'ACTIVE', lastLogin: subHours(now, 11).toISOString(), createdAt: subDays(now, 190).toISOString(), mfaEnabled: true },
  { id: 'u18', username: 'mike.ebuka', fullName: 'Mike Ebuka', email: 'mike.ebuka@cbs.bank', roles: ['CUSTOMER_MANAGER'], branchId: 'br5', branchName: 'Kano Branch', department: 'Retail Banking', status: 'DISABLED', createdAt: subDays(now, 60).toISOString(), mfaEnabled: false },
  { id: 'u19', username: 'praise.udo', fullName: 'Praise Udo', email: 'praise.udo@cbs.bank', roles: ['AUDIT_VIEWER', 'COMPLIANCE_OFFICER'], branchId: 'br1', branchName: 'Head Office', department: 'Internal Audit', status: 'ACTIVE', lastLogin: subDays(now, 4).toISOString(), createdAt: subDays(now, 160).toISOString(), mfaEnabled: true },
  { id: 'u20', username: 'victor.hassan', fullName: 'Victor Hassan', email: 'victor.hassan@cbs.bank', phone: '+2348091234567', roles: ['SUPER_ADMIN'], branchId: 'br1', branchName: 'Head Office', department: 'IT Operations', status: 'ACTIVE', lastLogin: subMinutes(now, 30).toISOString(), createdAt: subDays(now, 600).toISOString(), mfaEnabled: true, ipRestriction: ['10.0.0.0/8', '192.168.0.0/16'], loginHoursFrom: '06:00', loginHoursTo: '23:00' },
];

const DEMO_ROLES: Role[] = [
  { id: 'r1', name: 'SUPER_ADMIN', displayName: 'Super Administrator', description: 'Full system access with all privileges', userCount: 2, permissionCount: 48, status: 'ACTIVE', isSystem: true, permissions: ['customers:view','customers:create','customers:edit','customers:delete','customers:approve','customers:export','accounts:view','accounts:create','accounts:edit','accounts:delete','accounts:approve','accounts:export','lending:view','lending:create','lending:edit','lending:delete','lending:approve','lending:export','payments:view','payments:create','payments:edit','payments:delete','payments:approve','payments:export','treasury:view','treasury:create','treasury:edit','treasury:delete','treasury:approve','treasury:export','risk:view','risk:create','risk:edit','risk:delete','risk:approve','risk:export','compliance:view','compliance:create','compliance:edit','compliance:delete','compliance:approve','compliance:export','operations:view','operations:create','operations:edit','operations:delete','admin:view','admin:create','admin:edit','admin:delete'] },
  { id: 'r2', name: 'BRANCH_MANAGER', displayName: 'Branch Manager', description: 'Manages branch operations, approves transactions up to branch limit', userCount: 2, permissionCount: 22, status: 'ACTIVE', isSystem: false, permissions: ['customers:view','customers:create','customers:edit','customers:approve','accounts:view','accounts:create','accounts:edit','accounts:approve','lending:view','lending:create','lending:edit','lending:approve','payments:view','payments:create','payments:approve','operations:view','operations:create','operations:edit','reports:view','reports:export'] },
  { id: 'r3', name: 'TELLER', displayName: 'Bank Teller', description: 'Front-line staff for deposits, withdrawals, and basic account services', userCount: 4, permissionCount: 8, status: 'ACTIVE', isSystem: false, permissions: ['customers:view','accounts:view','accounts:create','payments:view','payments:create','operations:view','operations:create'] },
  { id: 'r4', name: 'LOAN_OFFICER', displayName: 'Loan Officer', description: 'Processes loan applications and manages lending portfolio', userCount: 2, permissionCount: 12, status: 'ACTIVE', isSystem: false, permissions: ['customers:view','customers:edit','lending:view','lending:create','lending:edit','lending:approve','accounts:view','reports:view','reports:export'] },
  { id: 'r5', name: 'COMPLIANCE_OFFICER', displayName: 'Compliance Officer', description: 'Monitors regulatory compliance and AML/KYC requirements', userCount: 3, permissionCount: 16, status: 'ACTIVE', isSystem: false, permissions: ['customers:view','customers:edit','compliance:view','compliance:create','compliance:edit','compliance:approve','risk:view','reports:view','reports:export','admin:view'] },
  { id: 'r6', name: 'RISK_ANALYST', displayName: 'Risk Analyst', description: 'Analyses credit, market, and operational risk metrics', userCount: 2, permissionCount: 10, status: 'ACTIVE', isSystem: false, permissions: ['risk:view','risk:create','risk:edit','risk:approve','reports:view','reports:export','customers:view','accounts:view'] },
  { id: 'r7', name: 'TREASURY_OFFICER', displayName: 'Treasury Officer', description: 'Manages treasury operations, FX, and investment portfolios', userCount: 2, permissionCount: 14, status: 'ACTIVE', isSystem: false, permissions: ['treasury:view','treasury:create','treasury:edit','treasury:approve','payments:view','payments:create','payments:approve','reports:view','reports:export'] },
  { id: 'r8', name: 'AUDIT_VIEWER', displayName: 'Audit Viewer', description: 'Read-only access to audit trails and reports', userCount: 3, permissionCount: 6, status: 'ACTIVE', isSystem: true, permissions: ['customers:view','accounts:view','reports:view','reports:export','admin:view'] },
];

const DEMO_PERMISSIONS: Permission[] = [
  'customers','accounts','lending','payments','treasury','risk','compliance','operations','reports','admin'
].flatMap(mod =>
  ['view','create','edit','delete','approve','export'].map(action => ({
    id: `${mod}:${action}`,
    module: mod,
    action,
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${mod}`,
  }))
);

const DEMO_SESSIONS: ActiveSession[] = [
  { id: 's1', userId: 'u1', username: 'adaeze.obi', fullName: 'Adaeze Obi', ip: '192.168.1.10', loginTime: subMinutes(now, 15).toISOString(), lastActivity: subMinutes(now, 2).toISOString(), browser: 'Chrome 122 / macOS', sessionCount: 1, isMultiple: false },
  { id: 's2', userId: 'u2', username: 'emeka.nwosu', fullName: 'Emeka Nwosu', ip: '10.0.1.25', loginTime: subHours(now, 2).toISOString(), lastActivity: subMinutes(now, 5).toISOString(), browser: 'Firefox 123 / Windows 11', sessionCount: 1, isMultiple: false },
  { id: 's3', userId: 'u5', username: 'amaka.igwe', fullName: 'Amaka Igwe', ip: '10.0.2.14', loginTime: subHours(now, 1).toISOString(), lastActivity: subMinutes(now, 1).toISOString(), browser: 'Chrome 122 / Windows 11', sessionCount: 2, isMultiple: true },
  { id: 's4', userId: 'u5', username: 'amaka.igwe', fullName: 'Amaka Igwe', ip: '172.16.0.5', loginTime: subMinutes(now, 45).toISOString(), lastActivity: subMinutes(now, 3).toISOString(), browser: 'Safari 17 / iOS', sessionCount: 2, isMultiple: true },
  { id: 's5', userId: 'u6', username: 'tunde.adeyemi', fullName: 'Tunde Adeyemi', ip: '10.0.3.8', loginTime: subHours(now, 3).toISOString(), lastActivity: subMinutes(now, 10).toISOString(), browser: 'Edge 122 / Windows 11', sessionCount: 1, isMultiple: false },
  { id: 's6', userId: 'u8', username: 'yusuf.bello', fullName: 'Yusuf Bello', ip: '192.168.1.55', loginTime: subHours(now, 6).toISOString(), lastActivity: subMinutes(now, 8).toISOString(), browser: 'Chrome 122 / Ubuntu', sessionCount: 1, isMultiple: false },
  { id: 's7', userId: 'u20', username: 'victor.hassan', fullName: 'Victor Hassan', ip: '10.0.0.50', loginTime: subMinutes(now, 30).toISOString(), lastActivity: subMinutes(now, 4).toISOString(), browser: 'Chrome 122 / macOS', sessionCount: 1, isMultiple: false },
];

function generateLoginHistory(): LoginEvent[] {
  const events: LoginEvent[] = [];
  const users = DEMO_USERS.slice(0, 12);
  const browsers = ['Chrome 122 / Windows 11', 'Firefox 123 / macOS', 'Safari 17 / iOS', 'Edge 122 / Windows 11', 'Chrome 122 / Ubuntu'];
  const ips = ['192.168.1.10', '10.0.1.25', '10.0.2.14', '172.16.0.5', '10.0.3.8', '192.168.1.55', '10.0.0.50', '203.0.113.42'];
  const failureReasons = ['Invalid password', 'Account locked', 'MFA failed', 'Session expired', 'IP not allowed'];

  // Successful logins spread over last 7 days
  for (let i = 0; i < 80; i++) {
    const user = users[i % users.length];
    events.push({
      id: `le-${i}`,
      timestamp: subMinutes(now, i * 90 + Math.floor(Math.random() * 30)).toISOString(),
      userId: user.id,
      username: user.username,
      ip: ips[i % ips.length],
      browser: browsers[i % browsers.length],
      outcome: 'SUCCESS',
      sessionId: `sess-${i}`,
    });
  }

  // Cluster of failures from suspicious IP in the last hour
  for (let i = 0; i < 8; i++) {
    events.push({
      id: `le-fail-${i}`,
      timestamp: subMinutes(now, i * 6 + 1).toISOString(),
      userId: 'u99',
      username: 'unknown',
      ip: '203.0.113.42',
      browser: 'curl/7.88',
      outcome: 'FAILED',
      failureReason: failureReasons[i % failureReasons.length],
    });
  }

  // Scattered failures
  for (let i = 0; i < 15; i++) {
    const user = users[i % users.length];
    events.push({
      id: `le-fail-sc-${i}`,
      timestamp: subHours(now, i * 3 + 2).toISOString(),
      userId: user.id,
      username: user.username,
      ip: ips[(i + 2) % ips.length],
      browser: browsers[i % browsers.length],
      outcome: 'FAILED',
      failureReason: failureReasons[i % failureReasons.length],
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const DEMO_LOGIN_HISTORY = generateLoginHistory();

// ─── API ──────────────────────────────────────────────────────────────────

const IS_DEMO = true;

function delay<T>(val: T, ms = 300): Promise<T> {
  return new Promise(res => setTimeout(() => res(val), ms));
}

export const userAdminApi = {
  getUsers: (params?: Record<string, unknown>): Promise<CbsUser[]> => {
    if (IS_DEMO) return delay([...DEMO_USERS]);
    return apiGet<CbsUser[]>('/v1/admin/users', params);
  },

  getUser: (id: string): Promise<CbsUser> => {
    if (IS_DEMO) {
      const user = DEMO_USERS.find(u => u.id === id);
      if (!user) return Promise.reject(new Error('User not found'));
      return delay({ ...user });
    }
    return apiGet<CbsUser>(`/v1/admin/users/${id}`);
  },

  createUser: (data: CreateUserRequest): Promise<CbsUser> => {
    if (IS_DEMO) {
      const newUser: CbsUser = {
        ...data,
        id: `u${Date.now()}`,
        branchName: 'Demo Branch',
        status: 'PENDING_ACTIVATION',
        createdAt: now.toISOString(),
        mfaEnabled: data.mfaRequired,
      };
      DEMO_USERS.push(newUser);
      return delay(newUser);
    }
    return apiPost<CbsUser>('/v1/admin/users', data);
  },

  updateUser: (id: string, data: Partial<CreateUserRequest>): Promise<CbsUser> => {
    if (IS_DEMO) {
      const idx = DEMO_USERS.findIndex(u => u.id === id);
      if (idx !== -1) Object.assign(DEMO_USERS[idx], data);
      return delay({ ...DEMO_USERS[idx] });
    }
    return apiPut<CbsUser>(`/v1/admin/users/${id}`, data);
  },

  disableUser: (id: string, reason: string): Promise<void> => {
    if (IS_DEMO) {
      const u = DEMO_USERS.find(u => u.id === id);
      if (u) u.status = 'DISABLED';
      return delay(undefined as unknown as void);
    }
    return apiPost<void>(`/v1/admin/users/${id}/disable`, { reason });
  },

  enableUser: (id: string): Promise<void> => {
    if (IS_DEMO) {
      const u = DEMO_USERS.find(u => u.id === id);
      if (u) u.status = 'ACTIVE';
      return delay(undefined as unknown as void);
    }
    return apiPost<void>(`/v1/admin/users/${id}/enable`);
  },

  resetPassword: (id: string): Promise<{ temporaryPassword: string }> => {
    if (IS_DEMO) return delay({ temporaryPassword: `Tmp${Math.random().toString(36).slice(2, 10)}@2026!` });
    return apiPost<{ temporaryPassword: string }>(`/v1/admin/users/${id}/reset-password`);
  },

  forceLogout: (id: string): Promise<void> => {
    if (IS_DEMO) return delay(undefined as unknown as void);
    return apiPost<void>(`/v1/admin/users/${id}/force-logout`);
  },

  unlockUser: (id: string): Promise<void> => {
    if (IS_DEMO) {
      const u = DEMO_USERS.find(u => u.id === id);
      if (u) u.status = 'ACTIVE';
      return delay(undefined as unknown as void);
    }
    return apiPost<void>(`/v1/admin/users/${id}/unlock`);
  },

  getRoles: (): Promise<Role[]> => {
    if (IS_DEMO) return delay([...DEMO_ROLES]);
    return apiGet<Role[]>('/v1/admin/roles');
  },

  getRole: (id: string): Promise<Role> => {
    if (IS_DEMO) {
      const role = DEMO_ROLES.find(r => r.id === id);
      if (!role) return Promise.reject(new Error('Role not found'));
      return delay({ ...role });
    }
    return apiGet<Role>(`/v1/admin/roles/${id}`);
  },

  createRole: (data: CreateRoleRequest): Promise<Role> => {
    if (IS_DEMO) {
      const newRole: Role = {
        ...data,
        id: `r${Date.now()}`,
        userCount: 0,
        permissionCount: data.permissions.length,
        status: 'ACTIVE',
        isSystem: false,
      };
      DEMO_ROLES.push(newRole);
      return delay(newRole);
    }
    return apiPost<Role>('/v1/admin/roles', data);
  },

  updateRolePermissions: (roleId: string, permissions: string[]): Promise<Role> => {
    if (IS_DEMO) {
      const role = DEMO_ROLES.find(r => r.id === roleId);
      if (role) {
        role.permissions = permissions;
        role.permissionCount = permissions.length;
      }
      return delay({ ...role! });
    }
    return apiPut<Role>(`/v1/admin/roles/${roleId}/permissions`, { permissions });
  },

  getPermissions: (): Promise<Permission[]> => {
    if (IS_DEMO) return delay([...DEMO_PERMISSIONS]);
    return apiGet<Permission[]>('/v1/admin/permissions');
  },

  getActiveSessions: (): Promise<ActiveSession[]> => {
    if (IS_DEMO) return delay([...DEMO_SESSIONS]);
    return apiGet<ActiveSession[]>('/v1/admin/sessions');
  },

  forceLogoutSession: (sessionId: string): Promise<void> => {
    if (IS_DEMO) {
      const idx = DEMO_SESSIONS.findIndex(s => s.id === sessionId);
      if (idx !== -1) DEMO_SESSIONS.splice(idx, 1);
      return delay(undefined as unknown as void);
    }
    return apiDelete<void>(`/v1/admin/sessions/${sessionId}`);
  },

  getLoginHistory: (params: { userId?: string; dateFrom?: string; dateTo?: string; outcome?: string }): Promise<LoginEvent[]> => {
    if (IS_DEMO) {
      let results = [...DEMO_LOGIN_HISTORY];
      if (params.userId) results = results.filter(e => e.userId === params.userId || e.username.includes(params.userId!));
      if (params.outcome) results = results.filter(e => e.outcome === params.outcome);
      if (params.dateFrom) results = results.filter(e => e.timestamp >= params.dateFrom!);
      if (params.dateTo) results = results.filter(e => e.timestamp <= params.dateTo!);
      return delay(results);
    }
    return apiGet<LoginEvent[]>('/v1/admin/login-history', params as Record<string, unknown>);
  },
};
