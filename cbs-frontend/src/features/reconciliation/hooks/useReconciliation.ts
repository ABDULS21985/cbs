import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nostroApi } from '../api/nostroApi';
import { glReconApi } from '../api/glReconApi';
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
