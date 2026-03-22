import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { regulatoryReportApi } from '../api/regulatoryReportApi';
import type { CreateDefinitionPayload } from '../api/regulatoryReportApi';

const queryKeys = {
  definitions: ['regulatory-reports', 'definitions'] as const,
  runs: (reportCode: string) => ['regulatory-reports', 'runs', reportCode] as const,
};

export function useRegulatoryDefinitions(regulator?: string) {
  return useQuery({
    queryKey: [...queryKeys.definitions, regulator],
    queryFn: () =>
      regulator
        ? regulatoryReportApi.getDefinitionsByRegulator(regulator)
        : regulatoryReportApi.getDefinitions(),
  });
}

export function useRegulatoryRuns(reportCode: string, page?: number, size?: number) {
  return useQuery({
    queryKey: [...queryKeys.runs(reportCode), { page, size }],
    queryFn: () => regulatoryReportApi.getRuns(reportCode, { page, size }),
    enabled: !!reportCode,
  });
}

export function useCreateDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDefinitionPayload) => regulatoryReportApi.createDefinition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.definitions });
      toast.success('Definition created');
    },
    onError: () => {
      toast.error('Failed to create definition');
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { reportCode: string; periodStart: string; periodEnd: string }) =>
      regulatoryReportApi.generateReport(params),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(vars.reportCode) });
      toast.success('Report generation started');
    },
    onError: () => {
      toast.error('Failed to generate report');
    },
  });
}

export function useSubmitRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => regulatoryReportApi.submitRun(runId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(data.reportCode) });
      toast.success('Report submitted');
    },
    onError: () => {
      toast.error('Failed to submit report');
    },
  });
}
