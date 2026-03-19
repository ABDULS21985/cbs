import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intelligenceApi } from '../api/intelligenceApi';

const KEYS = {
  recommendations: (customerId: string) => ['intelligence', 'recommendations', customerId],
  churnScore: (customerId: string) => ['intelligence', 'churn', customerId],
  pendingDocuments: () => ['intelligence', 'documents', 'pending'],
  forecastHistory: (entityType: string, entityId: string) => [
    'intelligence', 'cashflow', entityType, entityId,
  ],
};

export function useCustomerRecommendations(customerId: string) {
  return useQuery({
    queryKey: KEYS.recommendations(customerId),
    queryFn: () => intelligenceApi.getRecommendations(customerId),
    enabled: !!customerId,
  });
}

export function useChurnScore(customerId: string) {
  return useQuery({
    queryKey: KEYS.churnScore(customerId),
    queryFn: () => intelligenceApi.getChurnScore(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60_000,
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => intelligenceApi.generateRecommendations(customerId),
    onSuccess: (_data, customerId) => {
      queryClient.invalidateQueries({ queryKey: KEYS.recommendations(customerId) });
    },
  });
}

export function useRespondToRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      customerId: _customerId,
      action,
      reason,
    }: {
      id: number;
      customerId: string;
      action: 'ACCEPT' | 'DECLINE';
      reason?: string;
    }) => intelligenceApi.respondToRecommendation(id, action, reason),
    onSuccess: (_data, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: KEYS.recommendations(customerId) });
    },
  });
}

export function usePendingDocuments() {
  return useQuery({
    queryKey: KEYS.pendingDocuments(),
    queryFn: () => intelligenceApi.getPendingDocuments(),
    staleTime: 30_000,
  });
}

export function useSubmitDocument() {
  return useMutation({
    mutationFn: (payload: { file?: File; documentRef?: string; documentType: string }) =>
      intelligenceApi.submitDocument(payload),
  });
}

export function useReviewDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      action,
      notes,
    }: {
      jobId: string;
      action: 'APPROVE' | 'REJECT';
      notes?: string;
    }) => intelligenceApi.reviewDocument(jobId, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.pendingDocuments() });
    },
  });
}

export function useGenerateForecast() {
  return useMutation({
    mutationFn: (payload: {
      entityType: string;
      entityId: string;
      horizonDays: number;
      currency: string;
    }) => intelligenceApi.generateForecast(payload),
  });
}

export function useForecastHistory(entityType: string, entityId: string) {
  return useQuery({
    queryKey: KEYS.forecastHistory(entityType, entityId),
    queryFn: () => intelligenceApi.getForecastHistory(entityType, entityId),
    enabled: !!(entityType && entityId),
  });
}

export function useApproveForecast() {
  return useMutation({
    mutationFn: (forecastId: number) => intelligenceApi.approveForecast(forecastId),
  });
}
