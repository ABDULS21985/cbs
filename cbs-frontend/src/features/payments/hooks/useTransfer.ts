import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentApi, type TransferRequest } from '../api/paymentApi';

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
  return useQuery({
    queryKey: ['payments', 'banks'],
    queryFn: () => paymentApi.getBanks(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentTransfers() {
  return useQuery({
    queryKey: ['payments', 'recent'],
    queryFn: () => paymentApi.getRecentTransfers(),
  });
}

export function useNameEnquiry() {
  return useMutation({
    mutationFn: ({ accountNumber, bankCode }: { accountNumber: string; bankCode: string }) =>
      paymentApi.verifyName(accountNumber, bankCode),
  });
}

export function useFeePreview(amount: number, transferType: string, currency?: string) {
  return useQuery({
    queryKey: ['payments', 'fee-preview', amount, transferType, currency],
    queryFn: () => paymentApi.previewFee(amount, transferType, currency),
    enabled: amount > 0 && !!transferType,
  });
}

export function useInitiateTransfer() {
  return useMutation({
    mutationFn: (data: TransferRequest) => paymentApi.initiateTransfer(data),
  });
}

export function useDuplicateCheck() {
  return useMutation({
    mutationFn: ({ account, amount }: { account: string; amount: number }) =>
      paymentApi.checkDuplicate(account, amount),
  });
}
