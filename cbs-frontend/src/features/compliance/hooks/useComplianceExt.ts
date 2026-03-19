import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { regulatoryApi } from '../api/regulatoryExtApi';
import { gapAnalysisApi } from '../api/gapAnalysisApi';
import { guidelineAssessmentsApi } from '../api/guidelineApi';
import { auditApi } from '../api/auditExtApi';
import { taxApi } from '../api/taxApi';
import type { RegulatoryReportDefinition } from '../types/regulatoryExt';
import type { TaxRule } from '../types/tax';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  regulatory: {
    all: ['compliance', 'regulatory'] as const,
    definitions: (params?: Record<string, unknown>) =>
      ['compliance', 'regulatory', 'definitions', params] as const,
    byRegulator: (regulator: string) =>
      ['compliance', 'regulatory', 'regulator', regulator] as const,
    runs: (reportCode: string) =>
      ['compliance', 'regulatory', 'runs', reportCode] as const,
  },
  gapAnalysis: {
    all: ['compliance', 'gap-analysis'] as const,
    dashboard: (params?: Record<string, unknown>) =>
      ['compliance', 'gap-analysis', 'dashboard', params] as const,
    overdue: (params?: Record<string, unknown>) =>
      ['compliance', 'gap-analysis', 'overdue', params] as const,
  },
  guidelines: {
    all: ['compliance', 'guidelines'] as const,
    bySource: (source: string) => ['compliance', 'guidelines', 'source', source] as const,
    byRating: (rating: string) => ['compliance', 'guidelines', 'rating', rating] as const,
  },
  audit: {
    all: ['compliance', 'audit'] as const,
    entity: (entityType: string, entityId: number) =>
      ['compliance', 'audit', 'entity', entityType, entityId] as const,
    user: (performedBy: string) => ['compliance', 'audit', 'user', performedBy] as const,
    action: (action: string) => ['compliance', 'audit', 'action', action] as const,
  },
  tax: {
    all: ['compliance', 'tax'] as const,
    preview: (params?: Record<string, unknown>) =>
      ['compliance', 'tax', 'preview', params] as const,
    accountHistory: (accountId: number) =>
      ['compliance', 'tax', 'history', accountId] as const,
    pendingRemittance: (params?: Record<string, unknown>) =>
      ['compliance', 'tax', 'pending-remittance', params] as const,
  },
} as const;

// ─── Regulatory ───────────────────────────────────────────────────────────────

export function useRegulatoryDefinitions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.regulatory.definitions(params),
    queryFn: () => regulatoryApi.getAll(params),
    staleTime: 60_000,
  });
}

export function useRegulatoryByRegulator(regulator: string) {
  return useQuery({
    queryKey: KEYS.regulatory.byRegulator(regulator),
    queryFn: () => regulatoryApi.getByRegulator(regulator),
    enabled: !!regulator,
    staleTime: 60_000,
  });
}

export function useRegulatoryRuns(reportCode: string) {
  return useQuery({
    queryKey: KEYS.regulatory.runs(reportCode),
    queryFn: () => regulatoryApi.getRuns(reportCode),
    enabled: !!reportCode,
    staleTime: 30_000,
  });
}

export function useCreateRegulatoryDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RegulatoryReportDefinition>) =>
      regulatoryApi.createDefinition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.regulatory.all });
    },
  });
}

// ─── Gap Analysis ─────────────────────────────────────────────────────────────

export function useGapAnalysisDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.gapAnalysis.dashboard(params),
    queryFn: () => gapAnalysisApi.dashboard(params),
    staleTime: 60_000,
  });
}

export function useOverdueGapAnalysis(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.gapAnalysis.overdue(params),
    queryFn: () => gapAnalysisApi.overdue(params),
    staleTime: 30_000,
  });
}

export function usePlanGapAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => gapAnalysisApi.plan(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.gapAnalysis.all });
    },
  });
}

export function useProgressGapAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => gapAnalysisApi.progress(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.gapAnalysis.all });
    },
  });
}

export function useCloseGapAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => gapAnalysisApi.close(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.gapAnalysis.all });
    },
  });
}

export function useVerifyGapAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => gapAnalysisApi.verify(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.gapAnalysis.all });
    },
  });
}

export function useAcceptGapAnalysisRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => gapAnalysisApi.acceptRisk(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.gapAnalysis.all });
    },
  });
}

// ─── Guideline Assessments ────────────────────────────────────────────────────

export function useGuidelinesBySource(source: string) {
  return useQuery({
    queryKey: KEYS.guidelines.bySource(source),
    queryFn: () => guidelineAssessmentsApi.getBySource(source),
    enabled: !!source,
    staleTime: 60_000,
  });
}

export function useGuidelinesByRating(rating: string) {
  return useQuery({
    queryKey: KEYS.guidelines.byRating(rating),
    queryFn: () => guidelineAssessmentsApi.getByRating(rating),
    enabled: !!rating,
    staleTime: 60_000,
  });
}

export function useCompleteGuidelineAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => guidelineAssessmentsApi.complete(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.guidelines.all });
    },
  });
}

// ─── Audit Ext ────────────────────────────────────────────────────────────────

export function useAuditEntityTrail(entityType: string, entityId: number) {
  return useQuery({
    queryKey: KEYS.audit.entity(entityType, entityId),
    queryFn: () => auditApi.getEntityTrail(entityType, entityId),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
  });
}

export function useAuditUserTrail(performedBy: string) {
  return useQuery({
    queryKey: KEYS.audit.user(performedBy),
    queryFn: () => auditApi.getUserTrail(performedBy),
    enabled: !!performedBy,
    staleTime: 30_000,
  });
}

export function useAuditByAction(action: string) {
  return useQuery({
    queryKey: KEYS.audit.action(action),
    queryFn: () => auditApi.getByAction(action),
    enabled: !!action,
    staleTime: 30_000,
  });
}

// ─── Tax ──────────────────────────────────────────────────────────────────────

export function useTaxPreview(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.tax.preview(params),
    queryFn: () => taxApi.preview(params),
    staleTime: 60_000,
  });
}

export function useTaxAccountHistory(accountId: number) {
  return useQuery({
    queryKey: KEYS.tax.accountHistory(accountId),
    queryFn: () => taxApi.getAccountHistory(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

export function useTaxPendingRemittance(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: KEYS.tax.pendingRemittance(params),
    queryFn: () => taxApi.getPendingRemittance(params),
    staleTime: 30_000,
  });
}

export function useCreateTaxRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TaxRule>) => taxApi.createRule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.tax.all });
    },
  });
}
