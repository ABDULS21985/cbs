import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { regulatoryApi } from '../api/regulatoryApi';

export function ReturnDetailPage() {
  // Route is /compliance/returns/:id but we navigate with reportCode as the id
  const { id: code } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submissionRef, setSubmissionRef] = useState('');

  const { data: allReturns = [], isLoading } = useQuery({
    queryKey: ['reg-returns', 'all'],
    queryFn: () => regulatoryApi.getAll(),
  });

  const ret = allReturns.find((r) => r.reportCode === code);

  const reviewMutation = useMutation({
    mutationFn: () => regulatoryApi.review(code!),
    onSuccess: () => {
      toast.success('Submitted for review');
      queryClient.invalidateQueries({ queryKey: ['reg-returns'] });
    },
    onError: () => toast.error('Failed to submit for review'),
  });

  const submitMutation = useMutation({
    mutationFn: () => regulatoryApi.submit(code!, submissionRef),
    onSuccess: () => {
      toast.success('Submitted to regulator');
      queryClient.invalidateQueries({ queryKey: ['reg-returns'] });
    },
    onError: () => toast.error('Failed to submit to regulator'),
  });

  const backButton = (
    <button
      onClick={() => navigate('/compliance/returns')}
      className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm hover:bg-muted"
    >
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );

  if (isLoading) {
    return (
      <>
        <PageHeader title="Return Detail" actions={backButton} />
        <div className="page-container">
          <div className="animate-pulse h-64 bg-muted rounded-lg" />
        </div>
      </>
    );
  }

  if (!ret) {
    return (
      <>
        <PageHeader title="Return Not Found" actions={backButton} />
        <div className="page-container">
          <p className="text-sm text-muted-foreground">No return found with code: {code}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={ret.reportName}
        subtitle={`${ret.reportCode} · ${ret.regulator} · ${ret.reportingPeriod}`}
        actions={backButton}
      />
      <div className="page-container space-y-6">
        <FormSection title="Return Information">
          <InfoGrid
            columns={4}
            items={[
              { label: 'Regulatory Body', value: ret.regulator },
              { label: 'Report Type', value: ret.reportType || '—' },
              { label: 'Period', value: ret.reportingPeriod },
              { label: 'Due Date', value: ret.dueDate, format: 'date' },
              { label: 'Status', value: <StatusBadge status={ret.status} dot /> },
              { label: 'Prepared By', value: ret.preparedBy || '—' },
              { label: 'Reviewed By', value: ret.reviewedBy || '—' },
              { label: 'Submission Ref', value: ret.submissionReference || '—', mono: true },
            ]}
          />
        </FormSection>

        {ret.status === 'DRAFT' && (
          <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5">
            <div>
              <p className="text-sm font-medium">Ready for Review</p>
              <p className="text-xs text-muted-foreground mt-0.5">Submit this return for compliance review</p>
            </div>
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {reviewMutation.isPending ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        )}

        {ret.status === 'REVIEWED' && (
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 space-y-3">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Reviewed — Ready for Submission</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Enter the submission reference from your regulator portal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={submissionRef}
                onChange={(e) => setSubmissionRef(e.target.value)}
                placeholder="e.g. CBN/2026/Q1/001"
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !submissionRef.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit to Regulator'}
              </button>
            </div>
          </div>
        )}

        {ret.status === 'SUBMITTED' && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Return submitted successfully · Ref: {ret.submissionReference}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
