import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dspmApi } from '../api/dspmApi';
import type { DspmDataSource, DspmScan, DspmPolicy, DspmException, DspmIdentity, DspmAccessAudit } from '../types/dspm';

export const DSPM_KEYS = {
  sources: ['dspm', 'sources'] as const,
  scans: ['dspm', 'scans'] as const,
  policies: ['dspm', 'policies'] as const,
  exceptions: (params?: Record<string, unknown>) => ['dspm', 'exceptions', params] as const,
  identities: ['dspm', 'identities'] as const,
  identity: (code: string) => ['dspm', 'identities', code] as const,
  identityAudit: (code: string, params?: Record<string, unknown>) => ['dspm', 'identities', code, 'audit', params] as const,
  riskyAccess: ['dspm', 'audit', 'risky'] as const,
} as const;

// ── Sources ──────────────────────────────────────────────────────────────

export function useDspmSources() {
  return useQuery({
    queryKey: DSPM_KEYS.sources,
    queryFn: () => dspmApi.listSources(),
    staleTime: 60_000,
  });
}

export function useCreateDspmSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DspmDataSource>) => dspmApi.createSource(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.sources }); },
  });
}

// ── Scans ────────────────────────────────────────────────────────────────

export function useDspmScans() {
  return useQuery({
    queryKey: DSPM_KEYS.scans,
    queryFn: () => dspmApi.listScans(),
    staleTime: 15_000,
  });
}

export function useStartDspmScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { scope?: string; assetTypes?: string[]; fullScan?: boolean; sourceId?: number }) =>
      dspmApi.startScan(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.scans }); },
  });
}

export function useCompleteDspmScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, findings }: { code: string; findings: Record<string, number> }) =>
      dspmApi.completeScan(code, findings),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.scans }); },
  });
}

// ── Policies ─────────────────────────────────────────────────────────────

export function useDspmPolicies() {
  return useQuery({
    queryKey: DSPM_KEYS.policies,
    queryFn: () => dspmApi.listPolicies(),
    staleTime: 60_000,
  });
}

export function useCreateDspmPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DspmPolicy>) => dspmApi.createPolicy(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.policies }); },
  });
}

export function useUpdateDspmPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<DspmPolicy> }) => dspmApi.updatePolicy(code, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.policies }); },
  });
}

export function useActivateDspmPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => dspmApi.activatePolicy(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.policies }); },
  });
}

// ── Exceptions (with sort support) ──────────────────────────────────────

export function useDspmExceptions(params?: { page?: number; size?: number; status?: string; sortBy?: string; order?: string }) {
  return useQuery({
    queryKey: DSPM_KEYS.exceptions(params as Record<string, unknown>),
    queryFn: () => dspmApi.listExceptions(params),
    staleTime: 30_000,
  });
}

export function useCreateDspmException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DspmException>) => dspmApi.createException(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dspm', 'exceptions'] }); },
  });
}

export function useApproveDspmException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, approvedBy }: { code: string; approvedBy: string }) => dspmApi.approveException(code, approvedBy),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dspm', 'exceptions'] }); },
  });
}

export function useRejectDspmException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => dspmApi.rejectException(code),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dspm', 'exceptions'] }); },
  });
}

// ── Identities ──────────────────────────────────────────────────────────

export function useDspmIdentities() {
  return useQuery({
    queryKey: DSPM_KEYS.identities,
    queryFn: () => dspmApi.listIdentities(),
    staleTime: 60_000,
  });
}

export function useCreateDspmIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DspmIdentity>) => dspmApi.createIdentity(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: DSPM_KEYS.identities }); },
  });
}

export function useDspmIdentity(code: string) {
  return useQuery({
    queryKey: DSPM_KEYS.identity(code),
    queryFn: () => dspmApi.getIdentity(code),
    enabled: !!code,
    staleTime: 30_000,
  });
}

// ── Access Audit (Identity Audit Trail) ─────────────────────────────────

export function useDspmIdentityAudit(code: string, params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: DSPM_KEYS.identityAudit(code, params as Record<string, unknown>),
    queryFn: () => dspmApi.getIdentityAudit(code, params),
    enabled: !!code,
    staleTime: 15_000,
  });
}

/**
 * Paged audit hook — returns { data, page } so callers can build correct
 * server-side pagination using totalPages / totalElements from PageMeta
 * instead of the unreliable `records.length === pageSize` heuristic.
 */
export function useDspmIdentityAuditPaged(code: string, params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: DSPM_KEYS.identityAudit(code, params as Record<string, unknown>),
    queryFn: () => dspmApi.getIdentityAuditPaged(code, params),
    enabled: !!code,
    staleTime: 15_000,
  });
}

export function useDspmRiskyAccess() {
  return useQuery({
    queryKey: DSPM_KEYS.riskyAccess,
    queryFn: () => dspmApi.listRiskyAccess(),
    staleTime: 30_000,
  });
}
