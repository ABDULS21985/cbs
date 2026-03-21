import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, Edit, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { ConfirmDialog } from '@/components/shared';
import { useActivateAgreement, useTerminateAgreement } from '../hooks/useAgreementsExt';
import { formatDate } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import type { CustomerAgreement } from '../types/agreementExt';

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [activateOpen, setActivateOpen] = useState(false);

  const { data: agreement, isLoading } = useQuery({
    queryKey: ['agreements', 'detail', Number(id)],
    queryFn: () => apiGet<CustomerAgreement>(`/api/v1/agreements/${id}`),
    enabled: !!id && Number(id) > 0,
  });

  const activateMutation = useActivateAgreement();
  const terminateMutation = useTerminateAgreement();

  const handleActivate = () => {
    if (!agreement) return;
    activateMutation.mutate(agreement.agreementNumber, {
      onSuccess: () => {
        toast.success('Agreement activated');
        queryClient.invalidateQueries({ queryKey: ['agreements'] });
        setActivateOpen(false);
      },
      onError: () => toast.error('Failed to activate agreement'),
    });
  };

  const handleTerminate = () => {
    if (!agreement || !terminateReason.trim()) return;
    terminateMutation.mutate(agreement.agreementNumber, {
      onSuccess: () => {
        toast.success('Agreement terminated');
        queryClient.invalidateQueries({ queryKey: ['agreements'] });
        setTerminateOpen(false);
        setTerminateReason('');
      },
      onError: () => toast.error('Failed to terminate agreement'),
    });
  };

  if (isLoading || !agreement) {
    return (
      <>
        <PageHeader title="Agreement Detail" />
        <div className="page-container">
          <div className="animate-pulse space-y-4">
            <div className="h-52 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  const status = agreement.status;

  return (
    <>
      <PageHeader
        title={agreement.title}
        subtitle={`${agreement.agreementNumber} · ${agreement.agreementType.replace(/_/g, ' ')}`}
        backTo="/agreements/list"
        actions={
          <div className="flex items-center gap-2">
            {status === 'DRAFT' && (
              <>
                <button
                  onClick={() => setActivateOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Activate
                </button>
                <button
                  onClick={() => navigate(`/agreements/${id}/edit`)}
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
              </>
            )}
            {status === 'ACTIVE' && (
              <button
                onClick={() => setTerminateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Terminate
              </button>
            )}
            <button
              onClick={() => navigate('/agreements/list')}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {status === 'TERMINATED' && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Agreement Terminated</p>
              {agreement.terminationReason && (
                <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">{agreement.terminationReason}</p>
              )}
            </div>
          </div>
        )}

        <FormSection title="Agreement Information">
          <InfoGrid
            columns={4}
            items={[
              { label: 'Agreement Number', value: agreement.agreementNumber, mono: true, copyable: true },
              { label: 'Customer ID', value: String(agreement.customerId), mono: true },
              { label: 'Type', value: agreement.agreementType.replace(/_/g, ' ') },
              { label: 'Status', value: <StatusBadge status={agreement.status} dot /> },
              { label: 'Effective From', value: agreement.effectiveFrom || '—', format: agreement.effectiveFrom ? 'date' : undefined },
              { label: 'Effective To', value: agreement.effectiveTo || 'Open-ended', format: agreement.effectiveTo ? 'date' : undefined },
              { label: 'Auto-Renew', value: agreement.autoRenew ? `Yes (${agreement.renewalTermMonths ?? '?'} months)` : 'No' },
              { label: 'Notice Period', value: agreement.noticePeriodDays ? `${agreement.noticePeriodDays} days` : '—' },
              { label: 'Document Ref', value: agreement.documentRef || '—' },
              { label: 'Signed By Customer', value: agreement.signedByCustomer || 'Not yet' },
              { label: 'Signed By Bank', value: agreement.signedByBank || 'Not yet' },
              { label: 'Signed Date', value: agreement.signedDate || '—', format: agreement.signedDate ? 'date' : undefined },
              { label: 'Created At', value: agreement.createdAt, format: 'datetime' },
              { label: 'Updated At', value: agreement.updatedAt || '—', format: agreement.updatedAt ? 'datetime' : undefined },
            ]}
          />
        </FormSection>

        {agreement.description && (
          <FormSection title="Description">
            <p className="text-sm whitespace-pre-wrap">{agreement.description}</p>
          </FormSection>
        )}
      </div>

      <ConfirmDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivate}
        title="Activate Agreement"
        description={`This will activate agreement "${agreement.title}" (${agreement.agreementNumber}). The agreement will become effective immediately.`}
        confirmLabel="Activate"
        isLoading={activateMutation.isPending}
      />

      {terminateOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setTerminateOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Terminate Agreement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently terminate agreement <strong>{agreement.agreementNumber}</strong>. Please provide a reason.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={terminateReason}
                  onChange={e => setTerminateReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for termination..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setTerminateOpen(false); setTerminateReason(''); }}
                  disabled={terminateMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTerminate}
                  disabled={terminateMutation.isPending || !terminateReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {terminateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Terminate
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
