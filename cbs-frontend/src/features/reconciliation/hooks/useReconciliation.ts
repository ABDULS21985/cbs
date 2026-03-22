import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nostroApi } from '../api/nostroApi';
import { glReconApi } from '../api/glReconApi';
import {
  getBreaks,
  getBreakTimeline,
  resolveBreak,
  escalateBreak,
  addBreakNote,
  bulkAssignBreaks,
  bulkEscalateBreaks,
  getImportHistory,
  reImportStatement,
  deleteImport,
  getAutoFetchConfigs,
  getComplianceChecklist,
  getComplianceScoreTrend,
  type BreakStatus,
  type BreakResolutionType,
} from '../api/reconciliationApi';
import type { CorrespondentBank, CreatePositionRequest, CreateReconItemRequest } from '../types/nostro';

// ─── Query Key Factories ──────────────────────────────────────────────────────

const KEYS = {
  banks: ['nostro', 'banks'] as const,
  bank: (id: number) => ['nostro', 'banks', id] as const,
  positions: ['nostro', 'positions'] as const,
  positionsFiltered: (params: Record<string, unknown>) =>
    ['nostro', 'positions', params] as const,
  positionsByType: (type: string) => ['nostro', 'positions', 'type', type] as const,
  position: (id: number) => ['nostro', 'positions', id] as const,
  reconItems: (positionId: number) =>
    ['nostro', 'positions', positionId, 'recon-items'] as const,
  unmatchedItems: (positionId: number) =>
    ['nostro', 'positions', positionId, 'recon-items', 'unmatched'] as const,
  // GL sub-ledger
  glReconRuns: ['gl', 'reconciliation'] as const,
  glReconByDate: (date: string) => ['gl', 'reconciliation', date] as const,
  // Break management
  breaks: ['reconciliation', 'breaks'] as const,
  breaksFiltered: (params: Record<string, string>) =>
    ['reconciliation', 'breaks', params] as const,
  breakTimeline: (breakId: string) =>
    ['reconciliation', 'breaks', breakId, 'timeline'] as const,
  // Statement import
  importHistory: ['reconciliation', 'import-history'] as const,
  autoFetchConfigs: ['reconciliation', 'auto-fetch-configs'] as const,
  // Compliance
  complianceChecklist: ['reconciliation', 'compliance', 'checklist'] as const,
  complianceScoreTrend: ['reconciliation', 'compliance', 'score-trend'] as const,
};

// ─── Correspondent Bank Hooks ─────────────────────────────────────────────────

export function useCorrespondentBanks() {
  return useQuery({
    queryKey: KEYS.banks,
    queryFn: () => nostroApi.listBanks(),
    staleTime: 60_000,
  });
}

export function useCorrespondentBank(id: number) {
  return useQuery({
    queryKey: KEYS.bank(id),
    queryFn: () => nostroApi.getBank(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useRegisterBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CorrespondentBank>) => nostroApi.registerBank(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.banks });
    },
  });
}

// ─── Position Hooks ───────────────────────────────────────────────────────────

export function useNostroPositions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: params ? KEYS.positionsFiltered(params) : KEYS.positions,
    queryFn: () => nostroApi.listPositions(params),
    staleTime: 30_000,
  });
}

export function useNostroPosition(id: number) {
  return useQuery({
    queryKey: KEYS.position(id),
    queryFn: () => nostroApi.getPosition(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useNostroPositionsByType(type: string) {
  return useQuery({
    queryKey: KEYS.positionsByType(type),
    queryFn: () => nostroApi.getPositionsByType(type),
    enabled: !!type,
    staleTime: 30_000,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePositionRequest) => nostroApi.createPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.positions });
    },
  });
}

export function useUpdateStatementBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      positionId,
      statementBalance,
      statementDate,
    }: {
      positionId: number;
      statementBalance: number;
      statementDate: string;
    }) => nostroApi.updateStatementBalance(positionId, statementBalance, statementDate),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: KEYS.position(vars.positionId) });
      queryClient.invalidateQueries({ queryKey: KEYS.positions });
    },
  });
}

// ─── Recon Item Hooks ─────────────────────────────────────────────────────────

export function useReconItems(positionId: number) {
  return useQuery({
    queryKey: KEYS.reconItems(positionId),
    queryFn: () => nostroApi.getReconItems(positionId),
    enabled: !!positionId,
    staleTime: 15_000,
  });
}

export function useUnmatchedItems(positionId: number) {
  return useQuery({
    queryKey: KEYS.unmatchedItems(positionId),
    queryFn: () => nostroApi.getUnmatchedItems(positionId),
    enabled: !!positionId,
    staleTime: 15_000,
  });
}

export function useAddReconItem(positionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReconItemRequest) => nostroApi.addReconItem(positionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.reconItems(positionId) });
      queryClient.invalidateQueries({ queryKey: KEYS.unmatchedItems(positionId) });
      queryClient.invalidateQueries({ queryKey: KEYS.position(positionId) });
    },
  });
}

export function useMatchReconItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      matchReference,
      resolvedBy,
    }: {
      itemId: number;
      matchReference: string;
      resolvedBy: string;
    }) => nostroApi.matchItem(itemId, matchReference, resolvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostro'] });
    },
  });
}

// ─── GL Sub-Ledger Reconciliation Hooks ───────────────────────────────────────

export function useGlReconRuns(params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: [...KEYS.glReconRuns, params],
    queryFn: () => glReconApi.listReconRuns(params),
    staleTime: 30_000,
  });
}

export function useGlReconByDate(date: string) {
  return useQuery({
    queryKey: KEYS.glReconByDate(date),
    queryFn: () => glReconApi.getReconResultsByDate(date),
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function useRunGlReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      subledgerType: string;
      glCode: string;
      reconDate: string;
      branchCode?: string;
      currencyCode?: string;
    }) => glReconApi.runReconciliation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.glReconRuns });
    },
  });
}

// ─── Break Management Hooks ──────────────────────────────────────────────────

export function useBreaks(params?: { status?: BreakStatus; currency?: string; assignedTo?: string }) {
  const filterParams: Record<string, string> = {};
  if (params?.status) filterParams.status = params.status;
  if (params?.currency) filterParams.currency = params.currency;
  if (params?.assignedTo) filterParams.assignedTo = params.assignedTo;

  return useQuery({
    queryKey: Object.keys(filterParams).length > 0 ? KEYS.breaksFiltered(filterParams) : KEYS.breaks,
    queryFn: () => getBreaks(params),
    staleTime: 15_000,
  });
}

export function useBreakTimeline(breakId: string) {
  return useQuery({
    queryKey: KEYS.breakTimeline(breakId),
    queryFn: () => getBreakTimeline(breakId),
    enabled: !!breakId,
    staleTime: 10_000,
  });
}

export function useResolveBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakId, data }: { breakId: string; data: { resolutionType: BreakResolutionType; reason: string; glAccount?: string } }) =>
      resolveBreak(breakId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.breaks });
    },
  });
}

export function useEscalateBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakId, notes }: { breakId: string; notes: string }) =>
      escalateBreak(breakId, notes),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: KEYS.breaks });
      queryClient.invalidateQueries({ queryKey: KEYS.breakTimeline(vars.breakId) });
    },
  });
}

export function useAddBreakNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakId, notes }: { breakId: string; notes: string }) =>
      addBreakNote(breakId, notes),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: KEYS.breakTimeline(vars.breakId) });
    },
  });
}

export function useBulkAssignBreaks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakIds, assignedTo }: { breakIds: string[]; assignedTo: string }) =>
      bulkAssignBreaks(breakIds, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.breaks });
    },
  });
}

export function useBulkEscalateBreaks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ breakIds, notes }: { breakIds: string[]; notes: string }) =>
      bulkEscalateBreaks(breakIds, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.breaks });
    },
  });
}

// ─── Statement Import Hooks ──────────────────────────────────────────────────

export function useImportHistory() {
  return useQuery({
    queryKey: KEYS.importHistory,
    queryFn: () => getImportHistory(),
    staleTime: 30_000,
  });
}

export function useReImportStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => reImportStatement(importId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.importHistory });
    },
  });
}

export function useDeleteImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (importId: string) => deleteImport(importId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.importHistory });
    },
  });
}

export function useAutoFetchConfigs() {
  return useQuery({
    queryKey: KEYS.autoFetchConfigs,
    queryFn: () => getAutoFetchConfigs(),
    staleTime: 60_000,
  });
}

// ─── Compliance Hooks ────────────────────────────────────────────────────────

export function useComplianceChecklist() {
  return useQuery({
    queryKey: KEYS.complianceChecklist,
    queryFn: () => getComplianceChecklist(),
    staleTime: 60_000,
  });
}

export function useComplianceScoreTrend() {
  return useQuery({
    queryKey: KEYS.complianceScoreTrend,
    queryFn: () => getComplianceScoreTrend(),
    staleTime: 60_000,
  });
}
