import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intelligenceApi } from '../api/intelligenceApi';
import type {
  ProductRecommendation,
  ChurnScoreResponse,
  CashflowForecast,
  DocumentProcessingJob,
  CustomerBehaviourEvent,
  DashboardDefinition,
  DashboardWidget,
} from '../api/intelligenceApi';

// Re-export types for convenience
export type {
  ProductRecommendation,
  ChurnScoreResponse,
  CashflowForecast,
  DocumentProcessingJob,
  CustomerBehaviourEvent,
  DashboardDefinition,
  DashboardWidget,
};

// ---- Query Keys ---------------------------------------------------------------

export const intelligenceKeys = {
  all: ['intelligence'] as const,
  events: () => [...intelligenceKeys.all, 'events'] as const,
  recommendations: (customerId: number) => [...intelligenceKeys.all, 'recommendations', customerId] as const,
  churnScore: (customerId: number) => [...intelligenceKeys.all, 'churn', customerId] as const,
  forecasts: () => [...intelligenceKeys.all, 'forecasts'] as const,
  forecastHistory: (entityType: string, entityId: string) =>
    [...intelligenceKeys.all, 'forecasts', entityType, entityId] as const,
  allJobs: () => [...intelligenceKeys.all, 'documents', 'all'] as const,
  pendingDocuments: () => [...intelligenceKeys.all, 'documents', 'pending'] as const,
  dashboards: () => [...intelligenceKeys.all, 'dashboards'] as const,
  dashboardsByType: (type: string) => [...intelligenceKeys.all, 'dashboards', 'type', type] as const,
  dashboardByCode: (code: string) => [...intelligenceKeys.all, 'dashboards', 'code', code] as const,
};

// ---- Behaviour: Events --------------------------------------------------------

export function useBehaviourEvents() {
  return useQuery({
    queryKey: intelligenceKeys.events(),
    queryFn: () => intelligenceApi.listEvents(),
    staleTime: 30_000,
  });
}

export function useTrackEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: Partial<CustomerBehaviourEvent>) => intelligenceApi.trackEvent(event),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.events() });
    },
  });
}

// ---- Behaviour: Recommendations -----------------------------------------------

export function useCustomerRecommendations(customerId: number) {
  return useQuery({
    queryKey: intelligenceKeys.recommendations(customerId),
    queryFn: () => intelligenceApi.getRecommendations(customerId),
    enabled: !!customerId,
  });
}

export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (customerId: number) => intelligenceApi.generateRecommendations(customerId),
    onSuccess: (_data, customerId) => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.recommendations(customerId) });
    },
  });
}

export function useRespondToRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accepted }: { id: number; customerId: number; accepted: boolean }) =>
      intelligenceApi.respondToRecommendation(id, accepted),
    onSuccess: (_data, { customerId }) => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.recommendations(customerId) });
    },
  });
}

// ---- Behaviour: Churn ---------------------------------------------------------

export function useChurnScore(customerId: number) {
  return useQuery({
    queryKey: intelligenceKeys.churnScore(customerId),
    queryFn: () => intelligenceApi.getChurnScore(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60_000,
  });
}

// ---- Cash Flow Forecasting ----------------------------------------------------

export function useAllForecasts() {
  return useQuery({
    queryKey: intelligenceKeys.forecasts(),
    queryFn: () => intelligenceApi.listForecasts(),
    staleTime: 60_000,
  });
}

export function useForecastHistory(entityType: string, entityId: string) {
  return useQuery({
    queryKey: intelligenceKeys.forecastHistory(entityType, entityId),
    queryFn: () => intelligenceApi.getForecastHistory(entityType, entityId),
    enabled: !!(entityType && entityId),
  });
}

export function useGenerateForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      entityType: string;
      entityId: string;
      currency?: string;
      horizonDays?: number;
      modelType?: string;
    }) => intelligenceApi.generateForecast(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.forecasts() });
    },
  });
}

export function useApproveForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (forecastId: string) => intelligenceApi.approveForecast(forecastId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.forecasts() });
    },
  });
}

// ---- Document Intelligence ----------------------------------------------------

export function useAllDocumentJobs() {
  return useQuery({
    queryKey: intelligenceKeys.allJobs(),
    queryFn: () => intelligenceApi.listAllJobs(),
    staleTime: 30_000,
  });
}

export function usePendingDocuments() {
  return useQuery({
    queryKey: intelligenceKeys.pendingDocuments(),
    queryFn: () => intelligenceApi.getPendingDocuments(),
    staleTime: 30_000,
  });
}

export function useSubmitDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (job: Partial<DocumentProcessingJob>) => intelligenceApi.submitDocument(job),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.allJobs() });
      qc.invalidateQueries({ queryKey: intelligenceKeys.pendingDocuments() });
    },
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      intelligenceApi.reviewDocument(jobId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.allJobs() });
      qc.invalidateQueries({ queryKey: intelligenceKeys.pendingDocuments() });
    },
  });
}

// ---- Dashboards ---------------------------------------------------------------

export function useAllDashboards() {
  return useQuery({
    queryKey: intelligenceKeys.dashboards(),
    queryFn: () => intelligenceApi.listAllDashboards(),
    staleTime: 60_000,
  });
}

export function useDashboardsByType(type: string) {
  return useQuery({
    queryKey: intelligenceKeys.dashboardsByType(type),
    queryFn: () => intelligenceApi.getDashboardsByType(type),
    enabled: !!type,
    staleTime: 60_000,
  });
}

export function useDashboardWithWidgets(code: string) {
  return useQuery({
    queryKey: intelligenceKeys.dashboardByCode(code),
    queryFn: () => intelligenceApi.getDashboardWithWidgets(code),
    enabled: !!code,
    staleTime: 60_000,
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dashboard: Partial<DashboardDefinition>) =>
      intelligenceApi.createDashboard(dashboard),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.dashboards() });
    },
  });
}

export function useAddWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dashboardId, widget }: { dashboardId: number; widget: Partial<DashboardWidget> }) =>
      intelligenceApi.addWidget(dashboardId, widget),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intelligenceKeys.dashboards() });
    },
  });
}
