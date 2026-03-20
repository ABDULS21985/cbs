import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  FileText, Clock, Eye, OctagonX, Timer, Plus, Loader2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, ConfirmDialog } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { apiGet, apiPost } from '@/lib/api';
import { bankDraftsApi } from '../api/bankDraftApi';
import type { BankDraft } from '../types/bankDraft';
import {
  usePresentBankDraft,
  usePayBankDraft,
  useStopBankDraft,
  useReissueBankDraft,
} from '../hooks/useOperationsData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IssueDraftForm {
  amount: string;
  currency: string;
  payeeName: string;
  issuingBranch: string;
  purchaserName: string;
  purchaserAccountId: string;
  remarks: string;
}

const DEFAULT_ISSUE_FORM: IssueDraftForm = {
  amount: '',
  currency: 'NGN',
  payeeName: '',
  issuingBranch: '',
  purchaserName: '',
  purchaserAccountId: '',
  remarks: '',
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export function BankDraftPage() {
  const qc = useQueryClient();

  // Dialogs
  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueDraftForm>(DEFAULT_ISSUE_FORM);
  const [stopDraft, setStopDraft] = useState<BankDraft | null>(null);
  const [stopReason, setStopReason] = useState('');
  const [payDraft, setPayDraft] = useState<BankDraft | null>(null);
  const [reissueDraft, setReissueDraft] = useState<BankDraft | null>(null);

  // Data
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['bank-drafts', 'all'],
    queryFn: () => apiGet<BankDraft[]>('/api/v1/bank-drafts'),
    staleTime: 15_000,
  });

  // Mutations
  const issueMutation = useMutation({
    mutationFn: (data: Partial<BankDraft>) => apiPost<BankDraft>('/api/v1/bank-drafts', data),
    onSuccess: () => {
      toast.success('Bank draft issued successfully');
      qc.invalidateQueries({ queryKey: ['bank-drafts'] });
      setShowIssue(false);
      setIssueForm(DEFAULT_ISSUE_FORM);
    },
    onError: () => toast.error('Failed to issue bank draft'),
  });

  const presentMutation = usePresentBankDraft();
  const payMutation = usePayBankDraft();
  const stopMutation = useStopBankDraft();
  const reissueMutation = useReissueBankDraft();

  // Stats
  const totalIssued = drafts.length;
  const outstanding = drafts.filter((d) => d.status === 'ISSUED').length;
  const presented = drafts.filter((d) => d.status === 'PRESENTED').length;
  const stopped = drafts.filter((d) => d.status === 'STOPPED').length;
  const expired = drafts.filter((d) => d.status === 'EXPIRED').length;

  const isExpiryClose = (expiryDate: string): boolean => {
    if (!expiryDate) return false;
    const diff = new Date(expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  const handlePresent = (draft: BankDraft) => {
    presentMutation.mutate(draft.draftNumber, {
      onSuccess: () => {
        toast.success(`Draft ${draft.draftNumber} presented`);
        qc.invalidateQueries({ queryKey: ['bank-drafts'] });
      },
      onError: () => toast.error('Failed to present draft'),
    });
  };

  const handleStop = () => {
    if (!stopDraft) return;
    stopMutation.mutate(stopDraft.draftNumber, {
      onSuccess: () => {
        toast.success(`Draft ${stopDraft.draftNumber} stopped`);
        qc.invalidateQueries({ queryKey: ['bank-drafts'] });
        setStopDraft(null);
        setStopReason('');
      },
      onError: () => toast.error('Failed to stop draft'),
    });
  };

  const handlePay = () => {
    if (!payDraft) return;
    payMutation.mutate(payDraft.draftNumber, {
      onSuccess: () => {
        toast.success(`Draft ${payDraft.draftNumber} paid`);
        qc.invalidateQueries({ queryKey: ['bank-drafts'] });
        setPayDraft(null);
      },
      onError: () => toast.error('Failed to pay draft'),
    });
  };

  const handleReissue = () => {
    if (!reissueDraft) return;
    reissueMutation.mutate(reissueDraft.draftNumber, {
      onSuccess: () => {
        toast.success(`Draft ${reissueDraft.draftNumber} reissued`);
        qc.invalidateQueries({ queryKey: ['bank-drafts'] });
        setReissueDraft(null);
      },
      onError: () => toast.error('Failed to reissue draft'),
    });
  };

  const handleIssueSubmit = () => {
    if (!issueForm.amount || !issueForm.payeeName || !issueForm.issuingBranch) {
      toast.error('Please fill in all required fields');
      return;
    }
    issueMutation.mutate({
      amount: Number(issueForm.amount),
      currency: issueForm.currency,
      payeeName: issueForm.payeeName,
      issueBranchId: Number(issueForm.issuingBranch) || 0,
      deliveryAddress: issueForm.remarks,
    });
  };

  const columns = useMemo<ColumnDef<BankDraft, unknown>[]>(
    () => [
      {
        accessorKey: 'draftNumber',
        header: 'Draft Number',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.draftNumber}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatMoney(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      { accessorKey: 'currency', header: 'Currency' },
      { accessorKey: 'payeeName', header: 'Payee' },
      {
        accessorKey: 'issueBranchId',
        header: 'Issuing Branch',
        cell: ({ row }) => <span className="text-sm">{row.original.issueBranchId}</span>,
      },
      {
        accessorKey: 'issueDate',
        header: 'Issue Date',
        cell: ({ row }) =>
          row.original.issueDate ? (
            <span className="text-sm">{formatDate(row.original.issueDate)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry Date',
        cell: ({ row }) => {
          if (!row.original.expiryDate)
            return <span className="text-sm text-muted-foreground">--</span>;
          const close = isExpiryClose(row.original.expiryDate);
          return (
            <span className={`text-sm ${close ? 'text-red-600 font-medium' : ''}`}>
              {formatDate(row.original.expiryDate)}
              {close && <Timer className="inline w-3 h-3 ml-1" />}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const { status, draftNumber } = row.original;
          return (
            <div className="flex gap-1.5">
              {status === 'ISSUED' && (
                <>
                  <button
                    onClick={() => handlePresent(row.original)}
                    disabled={presentMutation.isPending}
                    className="px-2 py-1 text-xs font-medium rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Present
                  </button>
                  <button
                    onClick={() => setStopDraft(row.original)}
                    className="px-2 py-1 text-xs font-medium rounded-md border text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Stop
                  </button>
                </>
              )}
              {status === 'PRESENTED' && (
                <>
                  <button
                    onClick={() => setPayDraft(row.original)}
                    className="px-2 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Pay
                  </button>
                  <button
                    onClick={() => setStopDraft(row.original)}
                    className="px-2 py-1 text-xs font-medium rounded-md border text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Stop
                  </button>
                </>
              )}
              {status === 'STOPPED' && (
                <button
                  onClick={() => setReissueDraft(row.original)}
                  className="px-2 py-1 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
                >
                  <RefreshCw className="inline w-3 h-3 mr-1" />
                  Reissue
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [presentMutation.isPending],
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Bank Drafts"
        subtitle="Issue, present, pay, and manage bank drafts"
        actions={
          <button
            onClick={() => setShowIssue(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Issue Draft
          </button>
        }
      />

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Issued" value={totalIssued} format="number" icon={FileText} />
          <StatCard label="Outstanding" value={outstanding} format="number" icon={Clock} />
          <StatCard label="Presented" value={presented} format="number" icon={Eye} />
          <StatCard label="Stopped" value={stopped} format="number" icon={OctagonX} />
          <StatCard label="Expired" value={expired} format="number" icon={Timer} />
        </div>

        <DataTable columns={columns} data={drafts} isLoading={isLoading} enableGlobalFilter pageSize={15} />
      </div>

      {/* Issue Draft Dialog */}
      {showIssue && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowIssue(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">Issue Bank Draft</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Amount *</label>
                  <input
                    type="number"
                    value={issueForm.amount}
                    onChange={(e) => setIssueForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    min={0}
                    step="0.01"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={issueForm.currency}
                    onChange={(e) => setIssueForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium">Payee Name *</label>
                  <input
                    type="text"
                    value={issueForm.payeeName}
                    onChange={(e) => setIssueForm((f) => ({ ...f, payeeName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Issuing Branch *</label>
                  <input
                    type="text"
                    value={issueForm.issuingBranch}
                    onChange={(e) =>
                      setIssueForm((f) => ({ ...f, issuingBranch: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Branch ID"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchaser Name</label>
                  <input
                    type="text"
                    value={issueForm.purchaserName}
                    onChange={(e) =>
                      setIssueForm((f) => ({ ...f, purchaserName: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Purchaser Account</label>
                  <input
                    type="text"
                    value={issueForm.purchaserAccountId}
                    onChange={(e) =>
                      setIssueForm((f) => ({ ...f, purchaserAccountId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Remarks</label>
                  <input
                    type="text"
                    value={issueForm.remarks}
                    onChange={(e) => setIssueForm((f) => ({ ...f, remarks: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowIssue(false);
                    setIssueForm(DEFAULT_ISSUE_FORM);
                  }}
                  disabled={issueMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssueSubmit}
                  disabled={issueMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {issueMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Issue Draft
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stop Dialog */}
      {stopDraft && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setStopDraft(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-semibold">Stop Bank Draft</h3>
              <p className="text-sm text-muted-foreground">
                Stop payment on draft{' '}
                <span className="font-mono font-medium text-foreground">
                  {stopDraft.draftNumber}
                </span>{' '}
                for {formatMoney(stopDraft.amount, stopDraft.currency)}.
              </p>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason *</label>
                <textarea
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                  placeholder="Enter reason for stopping this draft..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setStopDraft(null);
                    setStopReason('');
                  }}
                  disabled={stopMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStop}
                  disabled={stopMutation.isPending || !stopReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {stopMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Stop Draft
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pay Confirmation Dialog */}
      <ConfirmDialog
        open={!!payDraft}
        onClose={() => setPayDraft(null)}
        onConfirm={handlePay}
        title="Pay Bank Draft"
        description={
          payDraft
            ? `Confirm payment of draft ${payDraft.draftNumber} for ${formatMoney(payDraft.amount, payDraft.currency)} to ${payDraft.payeeName}.`
            : ''
        }
        confirmLabel="Confirm Payment"
        isLoading={payMutation.isPending}
      />

      {/* Reissue Dialog */}
      {reissueDraft && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setReissueDraft(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-semibold">Reissue Bank Draft</h3>
              <p className="text-sm text-muted-foreground">
                Reissue a new draft based on stopped draft{' '}
                <span className="font-mono font-medium text-foreground">
                  {reissueDraft.draftNumber}
                </span>
                .
              </p>

              <div className="rounded-lg border p-3 space-y-2 bg-muted/30 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {formatMoney(reissueDraft.amount, reissueDraft.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payee</span>
                  <span className="font-medium">{reissueDraft.payeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{reissueDraft.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{reissueDraft.issueBranchId}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setReissueDraft(null)}
                  disabled={reissueMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReissue}
                  disabled={reissueMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {reissueMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reissue Draft
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
