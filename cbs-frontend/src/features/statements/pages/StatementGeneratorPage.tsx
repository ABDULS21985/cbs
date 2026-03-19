import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatementRequestForm } from '../components/StatementRequestForm';
import { StatementPreview } from '../components/StatementPreview';
import { CertificateOfBalance } from '../components/CertificateOfBalance';
import { AccountConfirmationLetter } from '../components/AccountConfirmationLetter';
import { StatementSubscriptionForm, type SubscriptionSavePayload } from '../components/StatementSubscriptionForm';
import { statementApi } from '../api/statementApi';
import type {
  StatementData,
  CertificateData,
  AccountConfirmationData,
  StatementFormat,
  StatementType,
} from '../api/statementApi';

// ─── Toast-style notification ─────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

function Toast({ message, type }: ToastProps) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium no-print ${
      type === 'success'
        ? 'bg-green-600 text-white'
        : 'bg-destructive text-destructive-foreground'
    }`}>
      {type === 'success' && <CheckCircle className="w-4 h-4" />}
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StatementGeneratorPage() {
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [confirmationData, setConfirmationData] = useState<AccountConfirmationData | null>(null);
  const [activeTab, setActiveTab] = useState<'statement' | 'certificate' | 'confirmation' | 'subscriptions'>('statement');
  const [currentAccountId, setCurrentAccountId] = useState('acc-001');
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Generate Statement ─────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: (params: { accountId: string; from: string; to: string; type: StatementType; format: StatementFormat }) =>
      statementApi.generateStatement(params),
    onSuccess: (data) => {
      setStatementData(data);
      setActiveTab('statement');
      showToast('Statement generated successfully');
    },
    onError: () => showToast('Failed to generate statement', 'error'),
  });

  // ── Certificate of Balance ─────────────────────────────────────
  const certMutation = useMutation({
    mutationFn: (accountId: string) =>
      statementApi.getCertificateData(accountId, new Date().toISOString().slice(0, 10)),
    onSuccess: (data) => {
      setCertificateData(data);
      setActiveTab('certificate');
    },
    onError: () => showToast('Failed to generate certificate', 'error'),
  });

  // ── Account Confirmation Letter ────────────────────────────────
  const confirmationMutation = useMutation({
    mutationFn: ({ accountId, purpose }: { accountId: string; purpose: string }) =>
      statementApi.getConfirmationData(accountId, purpose),
    onSuccess: (data) => {
      setConfirmationData(data);
      setActiveTab('confirmation');
    },
    onError: () => showToast('Failed to generate confirmation letter', 'error'),
  });

  // ── Download ───────────────────────────────────────────────────
  const downloadMutation = useMutation({
    mutationFn: ({ format }: { format: StatementFormat }) => {
      if (!statementData) throw new Error('No statement data');
      return statementApi.downloadStatement(
        currentAccountId,
        statementData.periodFrom,
        statementData.periodTo,
        format,
      );
    },
    onSuccess: (url, { format }) => {
      // Simulate download via anchor click
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement_${statementData?.accountNumber ?? 'account'}_${format.toLowerCase()}.${format === 'EXCEL' ? 'xlsx' : format.toLowerCase()}`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Downloading ${format} statement…`);
    },
    onError: () => showToast('Download failed', 'error'),
  });

  // ── Email ──────────────────────────────────────────────────────
  const emailMutation = useMutation({
    mutationFn: (email: string) => {
      if (!statementData) throw new Error('No statement data');
      return statementApi.emailStatement(
        currentAccountId,
        statementData.periodFrom,
        statementData.periodTo,
        email,
      );
    },
    onSuccess: () => showToast('Statement emailed successfully'),
    onError: () => showToast('Email failed — please try again', 'error'),
  });

  // ── Subscriptions ──────────────────────────────────────────────
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions', currentAccountId],
    queryFn: () => statementApi.getSubscriptions(currentAccountId),
  });

  const saveSub = useMutation({
    mutationFn: (data: SubscriptionSavePayload) => {
      const { id, ...rest } = data;
      if (id) return statementApi.updateSubscription(id, rest);
      return statementApi.createSubscription({ ...rest, accountId: currentAccountId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', currentAccountId] });
      showToast('Subscription saved');
    },
    onError: () => showToast('Failed to save subscription', 'error'),
  });

  const cancelSub = useMutation({
    mutationFn: (id: string) => statementApi.deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', currentAccountId] });
      showToast('Subscription cancelled');
    },
    onError: () => showToast('Failed to cancel subscription', 'error'),
  });

  // ── Handlers ───────────────────────────────────────────────────
  const handleGenerate = (params: { accountId: string; from: string; to: string; type: StatementType; format: StatementFormat }) => {
    setCurrentAccountId(params.accountId);
    generateMutation.mutate(params);
  };

  const handleCertificate = (accountId: string) => {
    setCurrentAccountId(accountId);
    certMutation.mutate(accountId);
  };

  const handleConfirmation = (accountId: string, purpose: string) => {
    setCurrentAccountId(accountId);
    confirmationMutation.mutate({ accountId, purpose });
  };

  return (
    <>
      <PageHeader
        title="Statement Generator"
        subtitle="Generate account statements, certificates, and formal banking letters."
      />

      <div className="page-container">
        {/* Main layout — form on left, preview on right */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          {/* ── Left panel: Request Form ──────────────────────────── */}
          <div className="space-y-4">
            <StatementRequestForm
              onGenerate={handleGenerate}
              onCertificate={handleCertificate}
              onConfirmation={handleConfirmation}
              accountId={currentAccountId}
              isGenerating={generateMutation.isPending || certMutation.isPending || confirmationMutation.isPending}
            />

            {/* Subscriptions panel */}
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Statement Subscriptions</h3>
              </div>
              <div className="px-5 py-4">
                <StatementSubscriptionForm
                  accountId={currentAccountId}
                  subscriptions={subscriptions}
                  onSave={(data: SubscriptionSavePayload) => { saveSub.mutate(data); }}
                  onCancel={(id: string) => cancelSub.mutateAsync(id)}
                  isSaving={saveSub.isPending}
                />
              </div>
            </div>
          </div>

          {/* ── Right panel: Preview ───────────────────────────────── */}
          <div>
            {/* Tab strip when multiple document types are ready */}
            {(statementData || certificateData || confirmationData) && (
              <div className="flex gap-1 mb-4 p-1 rounded-lg bg-muted w-fit no-print">
                {statementData && (
                  <button
                    onClick={() => setActiveTab('statement')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'statement'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Statement
                  </button>
                )}
                {certificateData && (
                  <button
                    onClick={() => setActiveTab('certificate')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'certificate'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Certificate
                  </button>
                )}
                {confirmationData && (
                  <button
                    onClick={() => setActiveTab('confirmation')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'confirmation'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Confirmation Letter
                  </button>
                )}
              </div>
            )}

            {/* ── Statement Preview ────────────────────────────────── */}
            {(activeTab === 'statement' || (!certificateData && !confirmationData)) && (
              <StatementPreview
                data={statementData}
                loading={generateMutation.isPending}
                onDownload={(format) => downloadMutation.mutate({ format })}
                onEmail={(email) => emailMutation.mutateAsync(email)}
              />
            )}

            {/* ── Certificate of Balance ───────────────────────────── */}
            {activeTab === 'certificate' && certificateData && (
              <div className="space-y-4">
                {certMutation.isPending ? (
                  <div className="h-48 rounded-lg border bg-muted animate-pulse" />
                ) : (
                  <CertificateOfBalance
                    data={certificateData}
                    onDownload={() => {
                      window.print();
                    }}
                  />
                )}
              </div>
            )}

            {/* ── Account Confirmation Letter ──────────────────────── */}
            {activeTab === 'confirmation' && confirmationData && (
              <div className="space-y-4">
                {confirmationMutation.isPending ? (
                  <div className="h-48 rounded-lg border bg-muted animate-pulse" />
                ) : (
                  <AccountConfirmationLetter
                    data={confirmationData}
                    onDownload={() => {
                      window.print();
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
