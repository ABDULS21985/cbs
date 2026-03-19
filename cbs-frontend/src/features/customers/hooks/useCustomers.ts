import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { customerApi } from '../api/customerApi';
import type { CustomerFilters } from '../types/customer';

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters as Record<string, unknown>),
    queryFn: () => customerApi.list(filters).then(r => r.data.data),
    staleTime: 30_000,
  });
}

export function useCustomerCounts() {
  return useQuery({
    queryKey: [...queryKeys.customers.all, 'counts'],
    queryFn: () => customerApi.counts().then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customerApi.getById(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useCustomerAccounts(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.accounts(id),
    queryFn: () => customerApi.getAccounts(id).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useCustomerLoans(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'loans'],
    queryFn: () => customerApi.getLoans(id).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useCustomerCards(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'cards'],
    queryFn: () => customerApi.getCards(id).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useCustomerCases(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'cases'],
    queryFn: () => customerApi.getCases(id).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useCustomerDocuments(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'documents'],
    queryFn: () => customerApi.getDocuments(id).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useCustomerTransactions(id: number, params: Record<string, unknown> = {}, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'transactions', params],
    queryFn: () => customerApi.getTransactions(id, params as { page?: number; size?: number; sort?: string; direction?: 'ASC' | 'DESC'; accountId?: number }).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useCustomerCommunications(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'communications'],
    queryFn: () => customerApi.getCommunications(id).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useCustomerAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.customers.detail(id), 'audit'],
    queryFn: () => customerApi.getAuditTrail(id).then(r => r.data.data),
    enabled: !!id && enabled,
  });
}

export function useKycStats() {
  return useQuery({
    queryKey: ['kyc', 'stats'],
    queryFn: () => customerApi.kycStats().then(r => r.data.data),
    staleTime: 60_000,
  });
}

export function useKycList(params: { status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['kyc', 'list', params],
    queryFn: () => customerApi.kycList(params).then(r => r.data.data),
    staleTime: 30_000,
  });
}

export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customers', 'segments'],
    queryFn: () => customerApi.getSegments().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
}

export function useKycDecide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, decision, notes }: { customerId: number; decision: 'approve' | 'reject' | 'request_docs'; notes?: string }) =>
      customerApi.kycDecide(customerId, decision, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
  });
}

export function useCustomerFiltersFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<CustomerFilters>(() => ({
    search: searchParams.get('search') || undefined,
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    segment: searchParams.get('segment') || undefined,
    branchId: searchParams.get('branchId') ? Number(searchParams.get('branchId')) : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
    size: searchParams.get('size') ? Number(searchParams.get('size')) : 25,
  }), [searchParams]);

  const setFilters = (updates: Partial<CustomerFilters>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      if (!('page' in updates)) next.set('page', '0');
      return next;
    });
  };

  return { filters, setFilters };
}
