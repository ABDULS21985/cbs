import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditMarginApi } from '../api/creditMarginApi';
import type { MarginCall, CollateralPosition } from '../types/creditMargin';

const KEYS = {
  calls: ['credit-margin', 'calls'] as const,
  openCalls: ['credit-margin', 'calls', 'open'] as const,
  call: (ref: string) => ['credit-margin', 'calls', ref] as const,
  counterparty: (code: string) => ['credit-margin', 'calls', 'counterparty', code] as const,
  collateral: ['credit-margin', 'collateral'] as const,
};

export function useMarginCalls() {
  return useQuery({ queryKey: KEYS.calls, queryFn: () => creditMarginApi.listMarginCalls(), staleTime: 30_000 });
}

export function useOpenMarginCalls() {
  return useQuery({ queryKey: KEYS.openCalls, queryFn: () => creditMarginApi.getOpenCalls(), staleTime: 30_000 });
}

export function useMarginCallByRef(ref: string) {
  return useQuery({ queryKey: KEYS.call(ref), queryFn: () => creditMarginApi.getCallByRef(ref), enabled: !!ref, staleTime: 30_000 });
}

export function useCounterpartyMarginCalls(code: string) {
  return useQuery({ queryKey: KEYS.counterparty(code), queryFn: () => creditMarginApi.getByCounterparty(code), enabled: !!code, staleTime: 30_000 });
}

export function useCollateralPositions() {
  return useQuery({ queryKey: KEYS.collateral, queryFn: () => creditMarginApi.listCollateralPositions(), staleTime: 30_000 });
}

export function useIssueMarginCall() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Partial<MarginCall>) => creditMarginApi.issueMarginCall(data), onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.calls }); } });
}

export function useAcknowledgeCall() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ref: string) => creditMarginApi.acknowledgeCall(ref), onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.calls }); } });
}

export function useSettleCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, agreedAmount, collateralType }: { ref: string; agreedAmount: number; collateralType: string }) =>
      creditMarginApi.settleCall(ref, agreedAmount, collateralType),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.calls }); },
  });
}

export function useRecordCollateral() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Partial<CollateralPosition>) => creditMarginApi.recordCollateral(data), onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.collateral }); } });
}
