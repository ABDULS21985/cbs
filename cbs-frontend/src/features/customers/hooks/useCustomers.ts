import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { queryKeys } from '@/lib/queryKeys';
import { customerApi } from '../api/customerApi';
import type { CustomerFilters } from '../types/customer';

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters as Record<string, unknown>),
    queryFn: () => customerApi.list(filters),
    staleTime: 30_000,
  });
}

export function useCustomerCounts() {
  return useQuery({
    queryKey: [...queryKeys.customers.all, 'counts'],
    queryFn: () => customerApi.counts(),
    staleTime: 60_000,
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customerApi.getById(id),
    enabled: !!id,
  });
}

export function useCustomerAccounts(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.accounts(id),
    queryFn: () => customerApi.getAccounts(id),
    enabled: !!id,
  });
}

export function useCustomerLoans(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'loans'],
    queryFn: () => customerApi.getLoans(id),
    enabled: !!id && enabled,
  });
}

export function useCustomerCards(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'cards'],
    queryFn: () => customerApi.getCards(id),
    enabled: !!id && enabled,
  });
}

export function useCustomerCases(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'cases'],
    queryFn: () => customerApi.getCases(id),
    enabled: !!id && enabled,
  });
}

export function useCustomerDocuments(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'documents'],
    queryFn: () => customerApi.getDocuments(id),
    enabled: !!id && enabled,
  });
}

export function useCustomerTransactions(id: number, params: Record<string, unknown> = {}, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'transactions', params],
    queryFn: () => customerApi.getTransactions(id, params as { page?: number; size?: number; sort?: string; direction?: 'ASC' | 'DESC' }),
    enabled: !!id && enabled,
  });
}

export function useCustomerCommunications(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'communications'],
    queryFn: () => customerApi.getCommunications(id),
    enabled: !!id && enabled,
  });
}

export function useCustomerAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'audit'],
    queryFn: () => customerApi.getAuditTrail(id),
    enabled: !!id && enabled,
  });
}

export function useKycStats() {
  return useQuery({
    queryKey: ['kyc', 'stats'],
    queryFn: () => customerApi.kycStats(),
    staleTime: 60_000,
  });
}

export function useKycList(params: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['kyc', 'list', params],
    queryFn: () => customerApi.kycList(params),
    staleTime: 30_000,
  });
}

export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customers', 'segments'],
    queryFn: () => customerApi.getSegments(),
    staleTime: 5 * 60_000,
  });
}

export function useSegmentDetail(code: string) {
  return useQuery({
    queryKey: ['customers', 'segments', code],
    queryFn: () => customerApi.getSegmentDetail(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useSegmentCustomers(code: string, params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: ['customers', 'segments', code, 'customers', params],
    queryFn: () => customerApi.getSegmentCustomers(code, params),
    enabled: !!code,
    staleTime: 30_000,
  });
}

export function useSegmentAnalytics() {
  return useQuery({
    queryKey: ['customers', 'segments', 'analytics'],
    queryFn: () => customerApi.getSegmentAnalytics(),
    staleTime: 60_000,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: import('../types/customer').CreateSegmentPayload) => customerApi.createSegment(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers', 'segments'] }); },
  });
}

export function useUpdateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...data }: { code: string } & Partial<import('../types/customer').CreateSegmentPayload>) =>
      customerApi.updateSegment(code, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers', 'segments'] }); },
  });
}

export function useKycDecide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, decision, notes, riskRating }: { customerId: number; decision: string; notes?: string; riskRating?: string }) =>
      customerApi.kycDecide(customerId, decision, notes, riskRating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useKycVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, documentId, decision, reason }: { customerId: number; documentId: number; decision: 'VERIFIED' | 'REJECTED'; reason?: string }) =>
      customerApi.kycVerifyDocument(customerId, documentId, decision, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useUploadIdentification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, data, file }: {
      customerId: number;
      data: { idType: string; idNumber: string; issueDate?: string; expiryDate?: string; issuingAuthority?: string; issuingCountry?: string };
      file?: File;
    }) => customerApi.uploadIdentification(customerId, data, file),
    onSuccess: (_data, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.customers.detail(customerId), 'documents'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    },
  });
}

export function useVerifyIdentification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, docId, decision, reason }: {
      customerId: number; docId: number; decision: 'VERIFIED' | 'REJECTED'; reason?: string;
    }) => customerApi.verifyIdentification(customerId, docId, decision, reason),
    onSuccess: (_data, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.customers.detail(customerId), 'documents'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    },
  });
}

export function useDeleteIdentification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, docId }: { customerId: number; docId: number }) =>
      customerApi.deleteIdentification(customerId, docId),
    onSuccess: (_data, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.customers.detail(customerId), 'documents'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    },
  });
}

export function useCustomerFiltersFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<CustomerFilters>(() => ({
    search: searchParams.get('search') || undefined,
    type: (searchParams.get('type') as CustomerFilters['type']) || undefined,
    status: (searchParams.get('status') as CustomerFilters['status']) || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    size: searchParams.get('size') ? Number(searchParams.get('size')) : 25,
    sort: searchParams.get('sort') || undefined,
    direction: (searchParams.get('direction') as CustomerFilters['direction']) || undefined,
  }), [searchParams]);

  const setFilters = (updates: Partial<CustomerFilters>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (!('page' in updates)) {
        next.set('page', '0');
      }
      return next;
    });
  };

  return { filters, setFilters };
}
