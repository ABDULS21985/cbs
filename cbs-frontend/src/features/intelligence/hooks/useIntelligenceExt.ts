import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intelligenceApi } from '../api/intelligenceExtApi';
import { customerBehaviorApi } from '../api/customerBehaviorApi';
import type { DashboardWidget, CustomerBehaviourEvent } from '../types/intelligenceExt';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  documents: {
    all: ['intelligence', 'documents'] as const,
    jobs: (params?: Record<string, unknown>) =>
      ['intelligence', 'documents', 'jobs', params] as const,
  },
  dashboards: {
    all: ['intelligence', 'dashboards'] as const,
    byCode: (code: string) => ['intelligence', 'dashboards', 'code', code] as const,
    byType: (type: string) => ['intelligence', 'dashboards', 'type', type] as const,
  },
  cashflow: {
    all: ['intelligence', 'cashflow'] as const,
    forecasts: (params?: Record<string, unknown>) =>
      ['intelligence', 'cashflow', 'forecasts', params] as const,
  },
  behaviour: {
    all: ['intelligence', 'behaviour'] as const,
  },
  customerBehavior: {
    all: ['intelligence', 'customer-behavior'] as const,
    byCustomer: (id: number) =>
      ['intelligence', 'customer-behavior', 'customer', id] as const,
    byType: (id: number, type: string) =>
      ['intelligence', 'customer-behavior', 'customer', id, 'type', type] as const,
  },
} as const;

// ─── Intelligence Ext ────────────────────────────────────────────────────────

export function useDocumentProcessingJobs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.documents.jobs(params),
    queryFn: () => intelligenceApi.listJobs(params),
    staleTime: 30_000,
  });
}

export function useDashboardWithWidgets(code: string) {
  return useQuery({
    queryKey: KEYS.dashboards.byCode(code),
    queryFn: () => intelligenceApi.getWithWidgets(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useDashboardsByType(type: string) {
  return useQuery({
    queryKey: KEYS.dashboards.byType(type),
    queryFn: () => intelligenceApi.getByType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useCashflowForecasts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.cashflow.forecasts(params),
    queryFn: () => intelligenceApi.listForecasts(params),
    staleTime: 60_000,
  });
}

export function useAddDashboardWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DashboardWidget>; dashboardCode?: string }) =>
      intelligenceApi.addWidget(id, data),
    onSuccess: (_result, { dashboardCode }) => {
      qc.invalidateQueries({ queryKey: KEYS.dashboards.all });
      // Invalidate the specific dashboard-with-widgets cache so the viewer
      // reflects the new widget without a manual page refresh.
      if (dashboardCode) {
        qc.invalidateQueries({ queryKey: KEYS.dashboards.byCode(dashboardCode) });
      }
    },
  });
}

export function useTrackBehaviourEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CustomerBehaviourEvent>) => intelligenceApi.track(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.behaviour.all });
    },
  });
}

// ─── Customer Behavior ───────────────────────────────────────────────────────

export function useCustomerBehaviorModels(id: number) {
  return useQuery({
    queryKey: KEYS.customerBehavior.byCustomer(id),
    queryFn: () => customerBehaviorApi.getCurrentModels(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCustomerBehaviorByType(id: number, type: string) {
  return useQuery({
    queryKey: KEYS.customerBehavior.byType(id, type),
    queryFn: () => customerBehaviorApi.getByType(id, type),
    enabled: !!id && !!type,
    staleTime: 60_000,
  });
}
