import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { DataValidationPanel } from '../components/returns/DataValidationPanel';
import { regulatoryApi } from '../api/regulatoryApi';

export function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: ret, isLoading } = useQuery({ queryKey: ['reg-returns', Number(id)], queryFn: () => regulatoryApi.getById(Number(id)), enabled: !!id });
  const { data: validations = [] } = useQuery({ queryKey: ['reg-returns', Number(id), 'validations'], queryFn: () => regulatoryApi.getValidationResults(Number(id)), enabled: !!id });

  const extractMutation = useMutation({ mutationFn: () => regulatoryApi.extractData(Number(id)), onSuccess: () => { toast.success('Data extracted'); queryClient.invalidateQueries({ queryKey: ['reg-returns'] }); } });
  const validateMutation = useMutation({ mutationFn: () => regulatoryApi.validate(Number(id)), onSuccess: (rules) => { toast.success(`Validation complete: ${rules.filter((r) => r.passed).length} passed`); queryClient.invalidateQueries({ queryKey: ['reg-returns'] }); } });
  const submitReviewMutation = useMutation({ mutationFn: () => regulatoryApi.submitForReview(Number(id)), onSuccess: () => { toast.success('Submitted for review'); queryClient.invalidateQueries({ queryKey: ['reg-returns'] }); } });
  const approveMutation = useMutation({ mutationFn: () => regulatoryApi.approve(Number(id)), onSuccess: () => { toast.success('Approved'); queryClient.invalidateQueries({ queryKey: ['reg-returns'] }); } });
  const submitMutation = useMutation({ mutationFn: () => regulatoryApi.submitToRegulator(Number(id)), onSuccess: () => { toast.success('Submitted to regulator'); queryClient.invalidateQueries({ queryKey: ['reg-returns'] }); } });

  if (isLoading || !ret) return <><PageHeader title="Return Detail" /><div className="page-container"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div></>;

  const workflow = [
    { status: 'SCHEDULED', action: 'Extract Data', fn: () => extractMutation.mutate(), pending: extractMutation.isPending },
    { status: 'DATA_EXTRACTION', action: 'Validate', fn: () => validateMutation.mutate(), pending: validateMutation.isPending },
    { status: 'VALIDATION', action: 'Submit for Review', fn: () => submitReviewMutation.mutate(), pending: submitReviewMutation.isPending },
    { status: 'REVIEW', action: 'Approve', fn: () => approveMutation.mutate(), pending: approveMutation.isPending },
    { status: 'APPROVED', action: 'Submit to Regulator', fn: () => submitMutation.mutate(), pending: submitMutation.isPending },
  ];

  const currentStep = workflow.find((w) => w.status === ret.status);

  return (
    <>
      <PageHeader
        title={ret.name}
        subtitle={`${ret.returnCode} · ${ret.regulatoryBody} · ${ret.period}`}
        actions={<button onClick={() => navigate('/compliance/returns')} className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"><ArrowLeft className="w-4 h-4" /> Back</button>}
      />
      <div className="page-container space-y-6">
        <FormSection title="Return Information">
          <InfoGrid columns={4} items={[
            { label: 'Regulatory Body', value: ret.regulatoryBody },
            { label: 'Frequency', value: ret.frequency },
            { label: 'Period', value: ret.period },
            { label: 'Due Date', value: ret.dueDate, format: 'date' },
            { label: 'Status', value: <StatusBadge status={ret.status} dot /> },
            { label: 'Submitted At', value: ret.submittedAt || '—', format: ret.submittedAt ? 'datetime' : undefined },
            { label: 'Confirmation Ref', value: ret.confirmationRef || '—', mono: true },
          ]} />
        </FormSection>

        {/* Workflow action */}
        {currentStep && (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5">
            <div>
              <p className="text-sm font-medium">Current Status: <StatusBadge status={ret.status} /></p>
              <p className="text-xs text-muted-foreground mt-0.5">Next step: {currentStep.action}</p>
            </div>
            <button onClick={currentStep.fn} disabled={currentStep.pending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {currentStep.pending ? 'Processing...' : currentStep.action}
            </button>
          </div>
        )}

        {ret.status === 'SUBMITTED' && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Return submitted successfully · Ref: {ret.confirmationRef}</span>
          </div>
        )}

        {validations.length > 0 && (
          <FormSection title="Data Validation" collapsible defaultOpen>
            <DataValidationPanel rules={validations} />
          </FormSection>
        )}
      </div>
    </>
  );
}
