import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

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

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  activeProducts: number;
  healthyProviders: number;
}

// ─── API ──────────────────────────────────────────────────────────────────

export const userAdminApi = {
  getUsers: (params?: Record<string, unknown>) =>
    apiGet<CbsUser[]>('/api/v1/admin/users', params),
  getUser: (id: string) =>
    apiGet<CbsUser>(`/api/v1/admin/users/${id}`),
  createUser: (data: CreateUserRequest) =>
    apiPost<CbsUser>('/api/v1/admin/users', data),
  updateUser: (id: string, data: Partial<CreateUserRequest>) =>
    apiPut<CbsUser>(`/api/v1/admin/users/${id}`, data),
  disableUser: (id: string, reason: string) =>
    apiPost<void>(`/api/v1/admin/users/${id}/disable`, { reason }),
  enableUser: (id: string) =>
    apiPost<void>(`/api/v1/admin/users/${id}/enable`),
  resetPassword: (id: string) =>
    apiPost<{ temporaryPassword: string }>(`/api/v1/admin/users/${id}/reset-password`),
  forceLogout: (id: string) =>
    apiPost<void>(`/api/v1/admin/users/${id}/force-logout`),
  unlockUser: (id: string) =>
    apiPost<void>(`/api/v1/admin/users/${id}/unlock`),
  getRoles: () =>
    apiGet<Role[]>('/api/v1/admin/roles'),
  getRole: (id: string) =>
    apiGet<Role>(`/api/v1/admin/roles/${id}`),
  createRole: (data: CreateRoleRequest) =>
    apiPost<Role>('/api/v1/admin/roles', data),
  updateRolePermissions: (roleId: string, permissions: string[]) =>
    apiPut<Role>(`/api/v1/admin/roles/${roleId}/permissions`, { permissions }),
  getPermissions: () =>
    apiGet<Permission[]>('/api/v1/admin/permissions'),
  getActiveSessions: () =>
    apiGet<ActiveSession[]>('/api/v1/admin/sessions'),
  forceLogoutSession: (sessionId: string) =>
    apiDelete<void>(`/api/v1/admin/sessions/${sessionId}`),
  getLoginHistory: (params: { userId?: string; dateFrom?: string; dateTo?: string; outcome?: string }) =>
    apiGet<LoginEvent[]>('/api/v1/admin/login-history', params as Record<string, unknown>),
  getDashboardStats: () =>
    apiGet<DashboardStats>('/api/v1/admin/dashboard/stats'),
};
