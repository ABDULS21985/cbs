import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { kycApi } from '../api/kycApi';

const KEYS = {
  stats: ['kyc', 'stats'],
  list: (params?: Record<string, unknown>) => ['kyc', 'list', params],
  edd: (id: number) => ['kyc', 'edd', id],
  reviewsDue: ['kyc', 'reviews-due'],
};

// Stats and List
export function useKycDashboardStats() {
  return useQuery({ queryKey: KEYS.stats, queryFn: kycApi.getStats, staleTime: 60_000 });
}

export function useKycQueue(params?: Record<string, unknown>) {
  return useQuery({ queryKey: KEYS.list(params), queryFn: () => kycApi.getList(params), staleTime: 30_000 });
}

// Decision mutations
export function useKycDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, ...body }: { customerId: number; decision: string; notes?: string; riskRating?: string }) =>
      kycApi.decide(customerId, body),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      toast.success('KYC decision recorded');
    },
    onError: () => toast.error('Failed to record decision'),
  });
}

export function useKycVerifyDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, ...body }: { customerId: number; documentId: number; decision: string; reason?: string }) =>
      kycApi.verifyDocument(customerId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      toast.success('Document verification updated');
    },
  });
}

export function useKycRequestInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, message }: { customerId: number; message: string }) =>
      kycApi.requestInfo(customerId, message),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      toast.success('Information request sent');
    },
  });
}

// EDD
export function useEddStatus(customerId: number) {
  return useQuery({
    queryKey: KEYS.edd(customerId),
    queryFn: () => kycApi.getEdd(customerId),
    enabled: customerId > 0,
    staleTime: 30_000,
  });
}

export function useInitiateEdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: number) => kycApi.initiateEdd(customerId),
    onSuccess: (_, customerId) => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      qc.invalidateQueries({ queryKey: KEYS.edd(customerId) });
      toast.success('EDD initiated');
    },
  });
}

export function useUpdateEddChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: number; data: Record<string, unknown> }) =>
      kycApi.updateEddChecklist(customerId, data),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: KEYS.edd(customerId) });
    },
  });
}

export function useApproveEdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId }: { customerId: number }) =>
      kycApi.approveEdd(customerId),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['customers', customerId] });
      qc.invalidateQueries({ queryKey: KEYS.edd(customerId) });
      toast.success('EDD approved');
    },
  });
}

// Periodic Review
export function useKycReviewsDue() {
  return useQuery({ queryKey: KEYS.reviewsDue, queryFn: kycApi.getReviewsDue, staleTime: 60_000 });
}

export function useCompleteKycReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, reviewedBy }: { customerId: number; reviewedBy: string }) =>
      kycApi.completeReview(customerId, reviewedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.reviewsDue });
      toast.success('Review completed');
    },
  });
}
