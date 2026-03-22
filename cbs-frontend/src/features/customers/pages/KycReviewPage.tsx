import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ShieldAlert,
  Shield,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, InfoGrid, FormSection, AuditTimeline } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useCustomer, useCustomerAudit, useKycVerifyDocument } from '../hooks/useCustomers';
import {
  useKycDecision,
  useKycRequestInfo,
  useInitiateEdd,
  useEddStatus,
  useUpdateEddChecklist,
  useApproveEdd,
} from '../hooks/useKycWorkflow';
import { DocumentVerificationCard } from '../components/DocumentVerificationCard';
import { RiskAssessmentForm } from '../components/RiskAssessmentForm';
import { KycDecisionPanel } from '../components/KycDecisionPanel';

const EDD_CHECKLIST_ITEMS = [
  { key: 'sourceOfFunds', label: 'Source of Funds Verified' },
  { key: 'sourceOfWealth', label: 'Source of Wealth Verified' },
  { key: 'enhancedMonitoring', label: 'Enhanced Monitoring Enabled' },
  { key: 'seniorMgmtApproval', label: 'Senior Management Approval' },
  { key: 'ongoingMonitoring', label: 'Ongoing Monitoring Plan' },
  { key: 'beneficialOwnership', label: 'Beneficial Ownership Verified' },
  { key: 'adverseMedia', label: 'Adverse Media Screening Complete' },
  { key: 'pepScreening', label: 'PEP Screening Complete' },
];

export function KycReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = parseInt(id ?? '0', 10);

  // Dialogs
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRequestInfoDialog, setShowRequestInfoDialog] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState('');

  // Data hooks
  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const { data: auditTrail = [] } = useCustomerAudit(customerId);
  const verifyDocMut = useKycVerifyDocument();
  const kycDecisionMut = useKycDecision();
  const requestInfoMut = useKycRequestInfo();
  const initiateEddMut = useInitiateEdd();
  const { data: eddData } = useEddStatus(customerId);
  const updateEddChecklistMut = useUpdateEddChecklist();
  const approveEddMut = useApproveEdd();

  // EDD checklist state - initialize from server data
  const [eddChecklist, setEddChecklist] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(EDD_CHECKLIST_ITEMS.map((item) => [item.key, false])),
  );

  // Sync EDD data from server
  useEffect(() => {
    if (eddData && typeof eddData === 'object') {
      const serverChecklist = (eddData as Record<string, unknown>).checklist as Record<string, boolean> | undefined;
      if (serverChecklist) {
        setEddChecklist((prev) => ({ ...prev, ...serverChecklist }));
      }
    }
  }, [eddData]);

  useEffect(() => {
    if (customer) {
      document.title = `KYC Review - ${customer.fullName}`;
    } else {
      document.title = 'KYC Review';
    }
  }, [customer]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="KYC Review" backTo="/customers/kyc" />
        <div className="page-container">
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
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

  const isHighRisk =
    customer.riskRating === 'HIGH' ||
    customer.riskRating === 'VERY_HIGH' ||
    customer.riskRating === 'PEP';
  const eddInitiated = !!(eddData && typeof eddData === 'object' && (eddData as Record<string, unknown>).status);
  const allEddComplete = EDD_CHECKLIST_ITEMS.every((item) => eddChecklist[item.key]);

  // Handlers
  const handleVerifyDoc = (docId: number) => {
    verifyDocMut.mutate(
      { customerId, documentId: docId, decision: 'VERIFIED' },
      {
        onSuccess: () => toast.success('Document verified'),
        onError: () => toast.error('Verification failed'),
      },
    );
  };

  const handleRejectDoc = (docId: number, reason: string) => {
    verifyDocMut.mutate(
      { customerId, documentId: docId, decision: 'REJECTED', reason },
      {
        onSuccess: () => toast.success('Document rejected'),
        onError: () => toast.error('Rejection failed'),
      },
    );
  };

  const handleVerifyCustomer = () => {
    kycDecisionMut.mutate(
      { customerId, decision: 'APPROVE', notes: 'KYC approved via review page' },
      { onSuccess: () => navigate('/customers/kyc') },
    );
  };

  const handleRejectCustomer = () => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    kycDecisionMut.mutate(
      { customerId, decision: 'REJECT', notes: rejectReason.trim() },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setRejectReason('');
          navigate('/customers/kyc');
        },
      },
    );
  };

  const handleRequestInfo = () => {
    if (!requestInfoMessage.trim()) {
      toast.error('Message is required');
      return;
    }
    requestInfoMut.mutate(
      { customerId, message: requestInfoMessage.trim() },
      {
        onSuccess: () => {
          setShowRequestInfoDialog(false);
          setRequestInfoMessage('');
        },
      },
    );
  };

  const handleEscalate = () => {
    kycDecisionMut.mutate(
      { customerId, decision: 'ESCALATE', notes: 'Escalated for senior review' },
      { onSuccess: () => toast.success('Case escalated') },
    );
  };

  const handleInitiateEdd = () => {
    initiateEddMut.mutate(customerId);
  };

  const handleToggleEddItem = (key: string) => {
    const updated = { ...eddChecklist, [key]: !eddChecklist[key] };
    setEddChecklist(updated);
    updateEddChecklistMut.mutate({ customerId, data: updated });
  };

  const handleApproveEdd = () => {
    approveEddMut.mutate(
      { customerId, approvedBy: 'CURRENT_USER' },
      { onError: () => toast.error('Failed to approve EDD') },
    );
  };

  const inputCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader
        title={customer.fullName}
        subtitle={`${customer.customerNumber} -- KYC Review`}
        backTo="/customers/kyc"
        actions={<StatusBadge status={customer.kycStatus} />}
      />

      <div className="page-container space-y-6">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <button
            onClick={handleVerifyCustomer}
            disabled={kycDecisionMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verify
          </button>
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={kycDecisionMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            onClick={() => setShowRequestInfoDialog(true)}
            disabled={requestInfoMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-background hover:bg-muted disabled:opacity-50"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Request Info
          </button>
          <button
            onClick={handleEscalate}
            disabled={kycDecisionMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-background hover:bg-muted disabled:opacity-50"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Escalate
          </button>
          {isHighRisk && !eddInitiated && (
            <button
              onClick={handleInitiateEdd}
              disabled={initiateEddMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {initiateEddMut.isPending ? 'Initiating...' : 'Initiate EDD'}
            </button>
          )}
        </div>

        {/* Reject Dialog */}
        {showRejectDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-semibold">Reject KYC</h3>
              <p className="text-sm text-muted-foreground">
                Please provide a mandatory reason for rejecting this customer's KYC.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Enter rejection reason..."
                className={cn(inputCls, 'resize-none')}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectCustomer}
                  disabled={!rejectReason.trim() || kycDecisionMut.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {kycDecisionMut.isPending ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Info Dialog */}
        {showRequestInfoDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-semibold">Request Information</h3>
              <p className="text-sm text-muted-foreground">
                Send a request for additional information or documents from the customer.
              </p>
              <textarea
                value={requestInfoMessage}
                onChange={(e) => setRequestInfoMessage(e.target.value)}
                rows={4}
                placeholder="Describe the information needed..."
                className={cn(inputCls, 'resize-none')}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRequestInfoDialog(false);
                    setRequestInfoMessage('');
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestInfo}
                  disabled={!requestInfoMessage.trim() || requestInfoMut.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {requestInfoMut.isPending ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Summary */}
        <FormSection title="Customer Summary">
          <InfoGrid
            columns={4}
            items={[
              { label: 'Customer Number', value: customer.customerNumber, mono: true, copyable: true },
              { label: 'Type', value: customer.type },
              { label: 'Status', value: <StatusBadge status={customer.status} dot /> },
              {
                label: 'Risk Rating',
                value: <StatusBadge status={customer.riskRating ?? 'MEDIUM'} />,
              },
              { label: 'Branch', value: customer.branchCode ?? '--' },
              { label: 'Nationality', value: customer.nationality ?? '--' },
              {
                label: 'Created',
                value: customer.createdAt ?? '--',
                format: customer.createdAt ? 'date' : undefined,
              },
              {
                label: 'KYC Expiry',
                value: customer.kycExpiryDate ?? '--',
                format: customer.kycExpiryDate ? 'date' : undefined,
              },
            ]}
          />
        </FormSection>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Documents + Customer Info (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <FormSection title="Customer Information">
              <InfoGrid
                columns={3}
                items={[
                  { label: 'Full Name', value: customer.fullName },
                  { label: 'Email', value: customer.email ?? '--' },
                  { label: 'Phone', value: customer.phone ?? '--' },
                  { label: 'Date of Birth', value: customer.dateOfBirth ?? '--', format: customer.dateOfBirth ? 'date' : undefined },
                  { label: 'Gender', value: customer.gender ?? '--' },
                  { label: 'Marital Status', value: customer.maritalStatus ?? '--' },
                  { label: 'Address', value: customer.homeAddress ?? '--', span: 2 },
                  { label: 'Relationship Manager', value: customer.relationshipManager ?? '--' },
                ]}
              />
            </FormSection>

            {/* Document list */}
            <FormSection title={`Identification Documents (${customer.identifications.length})`}>
              {customer.identifications.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                  <p className="text-sm">No documents on file</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            </FormSection>
          </div>

          {/* RIGHT: Risk + Decision + EDD + Audit (1/3) */}
          <div className="space-y-6">
            {/* Risk Assessment */}
            <RiskAssessmentForm currentRating={customer.riskRating ?? 'MEDIUM'} />

            {/* KYC Decision */}
            <KycDecisionPanel
              customerId={customerId}
              currentKycStatus={customer.kycStatus}
              onDecision={() => navigate('/customers/kyc')}
            />

            {/* EDD Checklist */}
            {(eddInitiated || isHighRisk) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    EDD Checklist
                  </h3>
                  {eddInitiated && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      EDD Active
                    </span>
                  )}
                </div>

                {!eddInitiated ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      EDD has not been initiated for this customer.
                    </p>
                    <button
                      onClick={handleInitiateEdd}
                      disabled={initiateEddMut.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {initiateEddMut.isPending ? 'Initiating...' : 'Initiate EDD'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {EDD_CHECKLIST_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          eddChecklist[item.key]
                            ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/30'
                            : 'hover:bg-muted/30',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={eddChecklist[item.key]}
                          onChange={() => handleToggleEddItem(item.key)}
                          disabled={updateEddChecklistMut.isPending}
                          className="accent-green-600"
                        />
                        <span className="text-sm">{item.label}</span>
                        {eddChecklist[item.key] && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 ml-auto" />
                        )}
                      </label>
                    ))}

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Completion</span>
                        <span className="font-mono">
                          {EDD_CHECKLIST_ITEMS.filter((item) => eddChecklist[item.key]).length}/
                          {EDD_CHECKLIST_ITEMS.length}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{
                            width: `${
                              (EDD_CHECKLIST_ITEMS.filter((item) => eddChecklist[item.key]).length /
                                EDD_CHECKLIST_ITEMS.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {allEddComplete && (
                      <button
                        onClick={handleApproveEdd}
                        disabled={approveEddMut.isPending}
                        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {approveEddMut.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve EDD
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Audit Trail */}
            <FormSection title="KYC Audit Trail" collapsible defaultOpen={false}>
              {auditTrail.length > 0 ? (
                <AuditTimeline events={auditTrail.map(e => ({ ...e, details: e.details ?? undefined }))} />
              ) : (
                <p className="text-sm text-muted-foreground">No audit events recorded</p>
              )}
            </FormSection>
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
      </div>
    </>
  );
}
