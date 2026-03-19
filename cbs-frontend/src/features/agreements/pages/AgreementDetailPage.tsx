import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, Edit, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { ConfirmDialog } from '@/components/shared';
import { AgreementViewer } from '../components/AgreementViewer';
import { SignaturePad } from '../components/SignaturePad';
import { AmendmentTimeline } from '../components/AmendmentTimeline';
import { agreementApi } from '../api/agreementApi';
import { useActivateAgreement, useTerminateAgreement } from '../hooks/useAgreementsExt';
import { formatDate } from '@/lib/formatters';

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [activateOpen, setActivateOpen] = useState(false);

  const { data: agreement, isLoading } = useQuery({
    queryKey: ['agreements', 'detail', Number(id)],
    queryFn: () => agreementApi.getById(Number(id)),
    enabled: !!id,
  });

  const signMutation = useMutation({
    mutationFn: ({ sig, type }: { sig: string; type: 'CANVAS' | 'TYPED' }) =>
      agreementApi.sign(Number(id), sig, type),
    onSuccess: () => {
      toast.success('Agreement signed successfully');
      queryClient.invalidateQueries({ queryKey: ['agreements'] });
    },
    onError: () => toast.error('Failed to sign agreement'),
  });

  const activateMutation = useActivateAgreement();
  const terminateMutation = useTerminateAgreement();

  const handleActivate = () => {
    if (!agreement) return;
    activateMutation.mutate(agreement.agreementCode, {
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
    terminateMutation.mutate(
      { id: agreement.id, reason: terminateReason },
      {
        onSuccess: () => {
          toast.success('Agreement terminated');
          queryClient.invalidateQueries({ queryKey: ['agreements'] });
          setTerminateOpen(false);
          setTerminateReason('');
        },
        onError: () => toast.error('Failed to terminate agreement'),
      },
    );
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
        subtitle={`${agreement.agreementCode} · v${agreement.version}`}
        backTo="/agreements"
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
              onClick={() => navigate('/agreements')}
              className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {/* Termination banner */}
        {status === 'TERMINATED' && agreement.amendments && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Agreement Terminated</p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-0.5">
                This agreement has been terminated and is no longer active.
              </p>
            </div>
          </div>
        )}

        {/* Info section */}
        <FormSection title="Agreement Information">
          <InfoGrid
            columns={4}
            items={[
              { label: 'Agreement Number', value: agreement.agreementCode, mono: true, copyable: true },
              { label: 'Customer', value: agreement.customerName || String(agreement.customerId) },
              { label: 'Type', value: agreement.agreementType.replace(/_/g, ' ') },
              { label: 'Status', value: <StatusBadge status={agreement.status} dot /> },
              { label: 'Effective Date', value: agreement.effectiveDate || '—', format: agreement.effectiveDate ? 'date' : undefined },
              { label: 'Expiry Date', value: agreement.expiryDate || '—', format: agreement.expiryDate ? 'date' : undefined },
              { label: 'Auto-Renew', value: '—' },
              { label: 'Notice Period', value: '—' },
              { label: 'Product', value: agreement.productName || '—' },
              { label: 'Document Ref', value: '—' },
              { label: 'Signed', value: agreement.signedAt || 'Not yet signed', format: agreement.signedAt ? 'datetime' : undefined },
              { label: 'Version', value: `v${agreement.version}` },
              { label: 'Created At', value: agreement.createdAt, format: 'datetime' },
              { label: 'Updated At', value: agreement.updatedAt, format: 'datetime' },
            ]}
          />
        </FormSection>

        {/* Description */}
        {agreement.content && (
          <AgreementViewer title="Agreement Content" content={agreement.content} />
        )}

        {/* Signature pad */}
        {agreement.status === 'PENDING_SIGNATURE' && (
          <FormSection title="Digital Signature">
            <SignaturePad
              onSignatureChange={(sig, type) => {
                if (sig) signMutation.mutate({ sig, type });
              }}
            />
          </FormSection>
        )}

        {/* Amendment timeline */}
        <FormSection title="Amendment History" collapsible defaultOpen={false}>
          <AmendmentTimeline amendments={agreement.amendments || []} />
        </FormSection>
      </div>

      {/* Activate confirmation */}
      <ConfirmDialog
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        onConfirm={handleActivate}
        title="Activate Agreement"
        description={`This will activate agreement "${agreement.title}" (${agreement.agreementCode}). The agreement will become effective immediately.`}
        confirmLabel="Activate"
        isLoading={activateMutation.isPending}
      />

      {/* Terminate dialog with reason */}
      {terminateOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setTerminateOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Terminate Agreement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently terminate agreement <strong>{agreement.agreementCode}</strong>. Please provide a reason.
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
