import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
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

export function useBanks() {
  return useQuery<BankOption[]>({
    queryKey: ['payments', 'banks'],
    queryFn: () => apiGet<BankOption[]>('/api/v1/payments/banks'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentTransfers() {
  return useQuery<RecentTransfer[]>({
    queryKey: ['payments', 'recent'],
    queryFn: () => apiGet<RecentTransfer[]>('/api/v1/payments/recent'),
  });
}

export function useNameEnquiry() {
  return useMutation<NameEnquiryResult, Error, { accountNumber: string; bankCode: string }>({
    mutationFn: (data) =>
      apiPost<NameEnquiryResult>('/api/v1/payments/name-enquiry', data),
  });
}

export function useFeePreview(amount: number, transferType: string, currency?: string) {
  return useQuery<FeePreview | null>({
    queryKey: ['payments', 'fee-preview', amount, transferType, currency],
    queryFn: () => apiGet<FeePreview>('/api/v1/payments/fee-preview', { amount, transferType, currency }),
    enabled: amount > 0 && !!transferType,
  });
}

export function useInitiateTransfer() {
  return useMutation({
    mutationFn: (data: TransferRequest) => paymentApi.initiateTransfer(data),
  });
}

export function useDuplicateCheck() {
  return useMutation<DuplicateCheckResult, Error, { account: string; amount: number }>({
    mutationFn: (data) =>
      apiGet<DuplicateCheckResult>('/api/v1/payments/check-duplicate', { beneficiaryAccount: data.account, amount: data.amount }),
  });
}
