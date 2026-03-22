import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { complianceReportApi } from '../api/complianceReportApi';
import type { CreateComplianceReportPayload } from '../api/complianceReportApi';

const COMPLIANCE_KEY = 'compliance-reports';

export function useComplianceReports(page?: number, size?: number) {
  return useQuery({
    queryKey: [COMPLIANCE_KEY, 'all', { page, size }],
    queryFn: () => complianceReportApi.getAll({ page, size }),
  });
}

export function useComplianceReportsByRegulator(regulator: string) {
  return useQuery({
    queryKey: [COMPLIANCE_KEY, 'by-regulator', regulator],
    queryFn: () => complianceReportApi.getByRegulator(regulator),
  });
}

export function useOverdueComplianceReports() {
  return useQuery({
    queryKey: [COMPLIANCE_KEY, 'overdue'],
    queryFn: () => complianceReportApi.getOverdue(),
  });
}

export function useComplianceStats() {
  return useQuery({
    queryKey: [COMPLIANCE_KEY, 'stats'],
    queryFn: () => complianceReportApi.getStats(),
  });
}

export function useComplianceReturns(page?: number, size?: number) {
  return useQuery({
    queryKey: [COMPLIANCE_KEY, 'returns', { page, size }],
    queryFn: () => complianceReportApi.getReturns({ page, size }),
  });
}

export function useComplianceAssessments(page?: number, size?: number) {
  return useQuery({
    queryKey: [COMPLIANCE_KEY, 'assessments', { page, size }],
    queryFn: () => complianceReportApi.getAssessments({ page, size }),
  });
}

export function useCreateComplianceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComplianceReportPayload) => complianceReportApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPLIANCE_KEY] });
      toast.success('Compliance report created');
    },
    onError: () => {
      toast.error('Failed to create compliance report');
    },
  });
}

export function useReviewComplianceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => complianceReportApi.review(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPLIANCE_KEY] });
      toast.success('Compliance report reviewed');
    },
    onError: () => {
      toast.error('Failed to review compliance report');
    },
  });
}

export function useSubmitComplianceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, submissionReference }: { code: string; submissionReference: string }) =>
      complianceReportApi.submit(code, submissionReference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPLIANCE_KEY] });
      toast.success('Compliance report submitted');
    },
    onError: () => {
      toast.error('Failed to submit compliance report');
    },
  });
}
