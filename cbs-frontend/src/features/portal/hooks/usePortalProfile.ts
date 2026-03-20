import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi, type ProfileUpdateRequest, type PortalPreferences } from '../api/portalApi';

// ─── Query Keys ────────────────────────────────────────────────────────────

const KEYS = {
  profile: (customerId: number) => ['portal', 'profile', customerId] as const,
  profileUpdates: (customerId: number) => ['portal', 'profile-updates', customerId] as const,
  loginHistory: (customerId: number) => ['portal', 'login-history', customerId] as const,
  activeSessions: (customerId: number) => ['portal', 'active-sessions', customerId] as const,
  activityLog: (customerId: number, params?: Record<string, unknown>) =>
    ['portal', 'activity-log', customerId, params] as const,
  preferences: (customerId: number) => ['portal', 'preferences', customerId] as const,
};

// ─── Profile ───────────────────────────────────────────────────────────────

export function usePortalProfile(customerId: number) {
  return useQuery({
    queryKey: KEYS.profile(customerId),
    queryFn: () => portalApi.getProfile(customerId),
    enabled: customerId > 0,
    staleTime: 60_000,
  });
}

// ─── Profile Updates (Maker-Checker) ───────────────────────────────────────

export function useProfileUpdates(customerId: number) {
  return useQuery({
    queryKey: KEYS.profileUpdates(customerId),
    queryFn: () => portalApi.getProfileUpdates(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useSubmitProfileUpdate(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileUpdateRequest) =>
      portalApi.submitProfileUpdate(customerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.profileUpdates(customerId) });
      qc.invalidateQueries({ queryKey: KEYS.profile(customerId) });
    },
  });
}

// ─── Security ──────────────────────────────────────────────────────────────

export function useChangePassword(customerId: number) {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      portalApi.changePassword(customerId, data),
  });
}

export function useToggle2fa(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enable: boolean) =>
      enable ? portalApi.enable2fa(customerId) : portalApi.disable2fa(customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.profile(customerId) });
    },
  });
}

export function useLoginHistory(customerId: number) {
  return useQuery({
    queryKey: KEYS.loginHistory(customerId),
    queryFn: () => portalApi.getLoginHistory(customerId),
    enabled: customerId > 0,
    staleTime: 60_000,
  });
}

export function useActiveSessions(customerId: number) {
  return useQuery({
    queryKey: KEYS.activeSessions(customerId),
    queryFn: () => portalApi.getActiveSessions(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useTerminateSession(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => portalApi.terminateSession(customerId, sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.activeSessions(customerId) });
    },
  });
}

// ─── Activity Log ──────────────────────────────────────────────────────────

export function useActivityLog(customerId: number, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.activityLog(customerId, params),
    queryFn: () => portalApi.getActivityLog(customerId, params),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

// ─── Preferences ───────────────────────────────────────────────────────────

export function usePortalPreferences(customerId: number) {
  return useQuery({
    queryKey: KEYS.preferences(customerId),
    queryFn: () => portalApi.getPreferences(customerId),
    enabled: customerId > 0,
    staleTime: 60_000,
  });
}

export function useUpdatePreferences(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PortalPreferences) =>
      portalApi.updatePreferences(customerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.preferences(customerId) });
    },
  });
}

// ─── Documents ─────────────────────────────────────────────────────────────

export function useUploadDocument(customerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => portalApi.uploadDocument(customerId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.profile(customerId) });
    },
  });
}
