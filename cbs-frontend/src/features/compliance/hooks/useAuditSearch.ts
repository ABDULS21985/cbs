import { useQuery } from '@tanstack/react-query';
import { auditApi, type AuditSearchParams } from '../api/auditApi';

export function useAuditSearch(params: AuditSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ['audit', 'search', params],
    queryFn: () => auditApi.search(params),
    enabled,
  });
}

export function useAuditSummary(params: AuditSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ['audit', 'summary', params],
    queryFn: () => auditApi.getSummary(params),
    enabled,
  });
}
