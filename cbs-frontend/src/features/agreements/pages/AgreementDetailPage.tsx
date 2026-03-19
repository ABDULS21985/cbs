import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FormSection } from '@/components/shared/FormSection';
import { AgreementViewer } from '../components/AgreementViewer';
import { SignaturePad } from '../components/SignaturePad';
import { AmendmentTimeline } from '../components/AmendmentTimeline';
import { agreementApi } from '../api/agreementApi';

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  if (isLoading || !agreement) {
    return (
      <>
        <PageHeader title="Agreement Detail" />
        <div className="page-container"><div className="animate-pulse h-64 bg-muted rounded-lg" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={agreement.title}
        subtitle={`${agreement.agreementCode} · v${agreement.version}`}
        actions={
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />
      <div className="page-container space-y-6">
        <FormSection title="Agreement Information">
          <InfoGrid
            columns={4}
            items={[
              { label: 'Type', value: agreement.agreementType.replace(/_/g, ' ') },
              { label: 'Status', value: <StatusBadge status={agreement.status} /> },
              { label: 'Customer', value: agreement.customerName },
              { label: 'Product', value: agreement.productName || '—' },
              { label: 'Effective Date', value: agreement.effectiveDate || '—', format: 'date' },
              { label: 'Expiry Date', value: agreement.expiryDate || '—', format: 'date' },
              { label: 'Signed', value: agreement.signedAt || 'Not yet signed', format: agreement.signedAt ? 'datetime' : undefined },
              { label: 'Version', value: `v${agreement.version}` },
            ]}
          />
        </FormSection>

        <AgreementViewer title="Agreement Content" content={agreement.content} />

        {agreement.status === 'PENDING_SIGNATURE' && (
          <FormSection title="Digital Signature">
            <SignaturePad
              onSignatureChange={(sig, type) => {
                if (sig) signMutation.mutate({ sig, type });
              }}
            />
          </FormSection>
        )}

        <FormSection title="Amendment History" collapsible defaultOpen={false}>
          <AmendmentTimeline amendments={agreement.amendments || []} />
        </FormSection>
      </div>
    </>
  );
}
