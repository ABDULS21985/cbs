import { useQuery, useMutation } from '@tanstack/react-query';
import {
  paymentApi,
  type BankOption,
  type DuplicateCheckResult,
  type FeePreview,
  type NameEnquiryResult,
  type RecentTransfer,
  type TransferRequest,
} from '../api/paymentApi';

export function useAccounts() {
  return useQuery({
    queryKey: ['payments', 'accounts'],
    queryFn: () => paymentApi.getAccounts(),
  });
}

export function useBeneficiaries() {
  return useQuery({
    queryKey: ['payments', 'beneficiaries'],
    queryFn: () => paymentApi.getBeneficiaries(),
  });
}

// No backend endpoint — returns empty list
export function useBanks() {
  return useQuery<BankOption[]>({
    queryKey: ['payments', 'banks'],
    queryFn: () => Promise.resolve([] as BankOption[]),
    staleTime: 5 * 60 * 1000,
  });
}

// No backend endpoint — returns empty list
export function useRecentTransfers() {
  return useQuery<RecentTransfer[]>({
    queryKey: ['payments', 'recent'],
    queryFn: () => Promise.resolve([] as RecentTransfer[]),
  });
}

// No backend endpoint — mutation always rejects
export function useNameEnquiry() {
  return useMutation<NameEnquiryResult, Error, { accountNumber: string; bankCode: string }>({
    mutationFn: (_: { accountNumber: string; bankCode: string }) =>
      Promise.reject(new Error('Name enquiry not available')),
  });
}

// No backend endpoint — disabled query
export function useFeePreview(_amount: number, _transferType: string, _currency?: string) {
  return useQuery<FeePreview | null>({
    queryKey: ['payments', 'fee-preview'],
    queryFn: () => Promise.resolve(null),
    enabled: false,
  });
}

export function useInitiateTransfer() {
  return useMutation({
    mutationFn: (data: TransferRequest) => paymentApi.initiateTransfer(data),
  });
}

// No backend endpoint — mutation always rejects
export function useDuplicateCheck() {
  return useMutation<DuplicateCheckResult, Error, { account: string; amount: number }>({
    mutationFn: (_: { account: string; amount: number }) =>
      Promise.reject(new Error('Duplicate check not available')),
  });
}
