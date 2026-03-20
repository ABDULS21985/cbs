import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, InfoGrid, FormSection, AuditTimeline } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { useCustomer, useCustomerAudit, useKycVerifyDocument } from '../hooks/useCustomers';
import { DocumentVerificationCard } from '../components/DocumentVerificationCard';
import { RiskAssessmentForm } from '../components/RiskAssessmentForm';
import { KycDecisionPanel } from '../components/KycDecisionPanel';

export function KycReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = parseInt(id ?? '0', 10);

  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const { data: auditTrail = [] } = useCustomerAudit(customerId);
  const verifyDocMut = useKycVerifyDocument();

  if (isLoading) {
    return (
      <>
        <PageHeader title="KYC Review" backTo="/customers/kyc" />
        <div className="page-container"><div className="h-64 bg-muted animate-pulse rounded-xl" /></div>
      </>
    );
  }

  if (isError || !customer) {
    return (
      <>
        <PageHeader title="Customer Not Found" backTo="/customers/kyc" />
        <div className="page-container">
          <div className="rounded-xl border p-12 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Customer could not be loaded</p>
          </div>
        </div>
      </>
    );
  }

  const handleVerifyDoc = (docId: number) => {
    verifyDocMut.mutate(
      { customerId, documentId: docId, decision: 'VERIFIED' },
      { onSuccess: () => toast.success('Document verified'), onError: () => toast.error('Verification failed') },
    );
  };

  const handleRejectDoc = (docId: number, reason: string) => {
    verifyDocMut.mutate(
      { customerId, documentId: docId, decision: 'REJECTED', reason },
      { onSuccess: () => toast.success('Document rejected'), onError: () => toast.error('Rejection failed') },
    );
  };

  return (
    <>
      <PageHeader
        title={customer.fullName}
        subtitle={`${customer.customerNumber} · KYC Review`}
        backTo="/customers/kyc"
        actions={<StatusBadge status={customer.kycStatus} />}
      />

      <div className="page-container space-y-6">
        {/* Customer summary */}
        <FormSection title="Customer Summary">
          <InfoGrid columns={4} items={[
            { label: 'Customer Number', value: customer.customerNumber, mono: true, copyable: true },
            { label: 'Type', value: customer.type },
            { label: 'Status', value: <StatusBadge status={customer.status} dot /> },
            { label: 'Risk Rating', value: <StatusBadge status={customer.riskRating ?? 'MEDIUM'} /> },
            { label: 'Branch', value: customer.branchCode ?? '—' },
            { label: 'Nationality', value: customer.nationality ?? '—' },
            { label: 'Created', value: customer.createdAt ?? '—', format: customer.createdAt ? 'date' : undefined },
            { label: 'KYC Expiry', value: customer.kycExpiryDate ?? '—', format: customer.kycExpiryDate ? 'date' : undefined },
          ]} />
        </FormSection>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Documents */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Identification Documents ({customer.identifications.length})</h3>
            {customer.identifications.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                <p className="text-sm">No documents on file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.identifications.map((doc) => (
                  <DocumentVerificationCard
                    key={doc.id}
                    doc={doc}
                    onVerify={handleVerifyDoc}
                    onReject={handleRejectDoc}
                    isLoading={verifyDocMut.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          {/* CENTER: Risk Assessment */}
          <div>
            <RiskAssessmentForm currentRating={customer.riskRating ?? 'MEDIUM'} />
          </div>

          {/* RIGHT: Decision */}
          <div>
            <KycDecisionPanel
              customerId={customerId}
              currentKycStatus={customer.kycStatus}
              onDecision={() => navigate('/customers/kyc')}
            />
          </div>
        </div>

        {/* BVN Verification (for individuals) */}
        {customer.type === 'INDIVIDUAL' && (
          <FormSection title="BVN Verification" collapsible defaultOpen={false}>
            <div className="text-sm text-muted-foreground">
              {customer.identifications.some((d) => d.idType === 'BVN' && d.isVerified) ? (
                <p className="text-green-700 dark:text-green-400 font-medium">BVN verified</p>
              ) : (
                <p>BVN not yet verified. Use the onboarding workflow to verify BVN.</p>
              )}
            </div>
          </FormSection>
        )}

        {/* Audit Trail */}
        <FormSection title="KYC Audit Trail" collapsible defaultOpen={false}>
          {auditTrail.length > 0 ? (
            <AuditTimeline events={auditTrail} />
          ) : (
            <p className="text-sm text-muted-foreground">No audit events recorded</p>
          )}
        </FormSection>
      </div>
    </>
  );
}
