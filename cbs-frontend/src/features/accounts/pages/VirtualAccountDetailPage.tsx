import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Wallet, CheckCircle2, AlertCircle, Hash, Link2, X, CheckCheck,
  ArrowDownUp, Plus, Minus, Power, DollarSign, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable } from '@/components/shared/DataTable';
import { MatchingRuleEditor } from '../components/virtual/MatchingRuleEditor';
import { UnmatchedItemsTable } from '../components/virtual/UnmatchedItemsTable';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  getVirtualAccountById,
  getVATransactions,
  getMatchingRules,
  updateMatchingRules,
  getSweepHistory,
  creditVirtualAccount,
  debitVirtualAccount,
  deactivateVirtualAccount,
  sweepVirtualAccount,
  manualMatchTransaction,
  type VATransaction,
  type MatchingRule,
  type VASweepHistory,
} from '../api/virtualAccountApi';

// ── Match Status Colors ─────────────────────────────────────────────────────

const MATCH_STATUS_COLORS: Record<string, string> = {
  MATCHED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UNMATCHED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PARTIAL: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// ── Action Modal ────────────────────────────────────────────────────────────

interface ActionModalProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  confirmLabel: string;
  confirmClass?: string;
  error?: string | null;
  children: React.ReactNode;
}

function ActionModal({ title, icon, open, onClose, onConfirm, isPending, confirmLabel, confirmClass, error, children }: ActionModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {children}
          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60',
                confirmClass || 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {confirmLabel}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Transactions Tab ────────────────────────────────────────────────────────

function TransactionsTab({ vaId }: { vaId: number }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['va-transactions', vaId],
    queryFn: () => getVATransactions(vaId),
  });

  const columns = useMemo<ColumnDef<VATransaction, unknown>[]>(
    () => [
      {
        accessorKey: 'transactionDate',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.transactionDate)}</span>
        ),
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground max-w-[200px] block truncate">
            {row.original.description || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-mono text-sm font-medium tabular-nums',
              row.original.transactionType === 'CREDIT'
                ? 'text-green-700 dark:text-green-400'
                : row.original.transactionType === 'DEBIT'
                ? 'text-red-700 dark:text-red-400'
                : 'text-blue-700 dark:text-blue-400',
            )}
          >
            {row.original.transactionType === 'CREDIT' ? '+' : '-'}
            {formatMoney(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'transactionType',
        header: 'Type',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              row.original.transactionType === 'CREDIT'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : row.original.transactionType === 'DEBIT'
                ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            )}
          >
            {row.original.transactionType}
          </span>
        ),
      },
      {
        accessorKey: 'matchStatus',
        header: 'Match Status',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              MATCH_STATUS_COLORS[row.original.matchStatus],
            )}
          >
            {row.original.matchStatus}
          </span>
        ),
      },
      {
        accessorKey: 'matchedRef',
        header: 'Matched Ref',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.matchedRef || '—'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={transactions}
        isLoading={isLoading}
        enableGlobalFilter
        enableColumnVisibility
        emptyMessage="No transactions for this virtual account"
      />
    </div>
  );
}

// ── Matching Rules Tab ──────────────────────────────────────────────────────

function MatchingRulesTab({ vaId }: { vaId: number }) {
  const queryClient = useQueryClient();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['va-rules', vaId],
    queryFn: () => getMatchingRules(vaId),
  });

  const saveMutation = useMutation({
    mutationFn: (updatedRules: MatchingRule[]) => updateMatchingRules(vaId, updatedRules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['va-rules', vaId] });
      setToastMsg('Matching rules saved successfully');
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to save matching rules'),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const handleSave = (updatedRules: MatchingRule[]) => {
    saveMutation.mutate(updatedRules);
  };

  return (
    <div className="p-6">
      {toastMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 px-4 py-3">
          <CheckCheck className="w-4 h-4 text-green-700 dark:text-green-400 flex-shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-400">{toastMsg}</span>
        </div>
      )}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Define rules that determine how incoming payment references are matched to this virtual account.
          Rules are evaluated in priority order (lowest number first).
        </p>
      </div>
      <MatchingRuleEditor rules={rules} onSave={handleSave} />
    </div>
  );
}

// ── Unmatched Tab ───────────────────────────────────────────────────────────

function UnmatchedTab({ vaId }: { vaId: number }) {
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['va-transactions', vaId],
    queryFn: () => getVATransactions(vaId),
  });

  const matchMutation = useMutation({
    mutationFn: ({ txnId, matchedRef }: { txnId: number; matchedRef: string }) =>
      manualMatchTransaction(txnId, matchedRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['va-transactions', vaId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to match transaction'),
  });

  const [toastInfo, setToastInfo] = useState<{ type: 'match' | 'writeoff'; ref: string } | null>(null);

  const handleMatch = (txn: VATransaction) => {
    matchMutation.mutate({ txnId: txn.id, matchedRef: `MANUAL-${txn.reference}` });
    setToastInfo({ type: 'match', ref: txn.reference });
    setTimeout(() => setToastInfo(null), 4000);
  };

  const handleWriteOff = (txn: VATransaction) => {
    matchMutation.mutate({ txnId: txn.id, matchedRef: 'WRITE-OFF' });
    setToastInfo({ type: 'writeoff', ref: txn.reference });
    setTimeout(() => setToastInfo(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {toastInfo && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3',
            toastInfo.type === 'match'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40',
          )}
        >
          {toastInfo.type === 'match' ? (
            <Link2 className="w-4 h-4 text-blue-700 dark:text-blue-400 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0" />
          )}
          <span
            className={cn(
              'text-sm',
              toastInfo.type === 'match'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {toastInfo.type === 'match'
              ? `Manual match initiated for reference: ${toastInfo.ref}`
              : `Write-off initiated for reference: ${toastInfo.ref}`}
          </span>
        </div>
      )}
      <UnmatchedItemsTable
        transactions={transactions}
        onMatch={handleMatch}
        onWriteOff={handleWriteOff}
      />
    </div>
  );
}

// ── Sweep History Tab ───────────────────────────────────────────────────────

function SweepHistoryTab({ vaId }: { vaId: number }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['va-sweep-history', vaId],
    queryFn: () => getSweepHistory(vaId),
  });

  const columns = useMemo<ColumnDef<VASweepHistory, unknown>[]>(
    () => [
      {
        accessorKey: 'sweptAt',
        header: 'Swept At',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.sweptAt)}</span>
        ),
      },
      {
        accessorKey: 'sweepAmount',
        header: 'Amount Swept',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tabular-nums text-blue-700 dark:text-blue-400">
            {formatMoney(row.original.sweepAmount)}
          </span>
        ),
      },
      {
        accessorKey: 'direction',
        header: 'Direction',
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {row.original.direction}
          </span>
        ),
      },
      {
        accessorKey: 'balanceBefore',
        header: 'Balance Before',
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.balanceBefore)}</span>
        ),
      },
      {
        accessorKey: 'balanceAfter',
        header: 'Balance After',
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.balanceAfter)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={history}
        isLoading={isLoading}
        emptyMessage="No sweep history for this virtual account"
      />
    </div>
  );
}

// ── Main Detail Page ────────────────────────────────────────────────────────

export function VirtualAccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Modals
  const [creditModal, setCreditModal] = useState(false);
  const [debitModal, setDebitModal] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [sweepModal, setSweepModal] = useState(false);

  // Form state for credit/debit
  const [creditAmount, setCreditAmount] = useState('');
  const [creditRef, setCreditRef] = useState('');
  const [debitAmount, setDebitAmount] = useState('');

  const { data: account, isLoading, error } = useQuery({
    queryKey: ['virtual-account', id],
    queryFn: () => getVirtualAccountById(id!),
    enabled: !!id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['va-transactions', id ? Number(id) : 0],
    queryFn: () => getVATransactions(id!),
    enabled: !!id,
  });

  const { data: sweepHistory = [] } = useQuery({
    queryKey: ['va-sweep-history', id ? Number(id) : 0],
    queryFn: () => getSweepHistory(id!),
    enabled: !!id,
  });

  const unmatchedCount = transactions.filter(
    (t) => t.matchStatus === 'UNMATCHED' || t.matchStatus === 'PARTIAL',
  ).length;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const creditMutation = useMutation({
    mutationFn: () => creditVirtualAccount(account!.virtualAccountNumber, Number(creditAmount), creditRef || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', id] });
      queryClient.invalidateQueries({ queryKey: ['va-transactions'] });
      setCreditModal(false);
      setCreditAmount('');
      setCreditRef('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to credit account'),
  });

  const debitMutation = useMutation({
    mutationFn: () => debitVirtualAccount(account!.virtualAccountNumber, Number(debitAmount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', id] });
      queryClient.invalidateQueries({ queryKey: ['va-transactions'] });
      setDebitModal(false);
      setDebitAmount('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to debit account'),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateVirtualAccount(account!.virtualAccountNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', id] });
      setDeactivateModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to deactivate account'),
  });

  const sweepMutation = useMutation({
    mutationFn: () => sweepVirtualAccount(account!.virtualAccountNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', id] });
      queryClient.invalidateQueries({ queryKey: ['va-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['va-sweep-history'] });
      setSweepModal(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Sweep failed'),
  });

  // ── Loading / Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Virtual Account" backTo="/accounts/virtual-accounts" />
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div>
        <PageHeader title="Not Found" backTo="/accounts/virtual-accounts" />
        <div className="page-container">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 dark:text-red-400 font-medium">Virtual account not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={account.virtualAccountNumber}
        subtitle={`${account.accountName} · ${account.currency}`}
        backTo="/accounts/virtual-accounts"
        actions={
          <div className="flex items-center gap-2">
            {/* Action buttons */}
            <button
              onClick={() => setCreditModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-green-50 hover:border-green-200 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Credit
            </button>
            <button
              onClick={() => setDebitModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            >
              <Minus className="w-4 h-4" />
              Debit
            </button>
            <button
              onClick={() => setSweepModal(true)}
              disabled={account.virtualBalance === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowDownUp className="w-4 h-4" />
              Sweep
            </button>
            <button
              onClick={() => setDeactivateModal(true)}
              disabled={!account.isActive}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Power className="w-4 h-4" />
              Deactivate
            </button>

            <StatusBadge status={account.isActive ? 'ACTIVE' : 'INACTIVE'} dot />
          </div>
        }
      />

      <div className="page-container">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Balance"
            value={account.virtualBalance}
            format="money"
            currency={account.currency}
            icon={Wallet}
          />
          <StatCard
            label="Transactions"
            value={transactions.length}
            format="number"
            icon={CheckCircle2}
          />
          <StatCard
            label="Unmatched Items"
            value={unmatchedCount}
            format="number"
            icon={AlertCircle}
          />
          <StatCard
            label="VA Number"
            value={account.virtualAccountNumber}
            icon={Hash}
          />
        </div>

        {/* Account detail row */}
        <div className="rounded-lg border bg-card px-5 py-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Physical Account</div>
              <Link
                to={`/accounts/${account.masterAccountId}`}
                className="font-mono font-medium text-primary hover:underline"
              >
                Master #{account.masterAccountId}
              </Link>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Customer ID</div>
              <div className="font-medium">{account.customerId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Purpose</div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {account.accountPurpose}
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Created</div>
              <div className="font-medium">{formatDateTime(account.createdAt)}</div>
            </div>
            {account.referencePattern && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Reference Pattern</div>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{account.referencePattern}</code>
              </div>
            )}
            {account.externalReference && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">External Reference</div>
                <div className="font-mono text-xs">{account.externalReference}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Auto Sweep</div>
              <div className="font-medium">
                {account.autoSweepEnabled ? (
                  <span className="text-green-700 dark:text-green-400">
                    Enabled (threshold: {formatMoney(account.sweepThreshold ?? 0, account.currency)})
                  </span>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Sweep Direction</div>
              <div className="font-medium">{account.sweepDirection}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <TabsPage
            tabs={[
              {
                id: 'transactions',
                label: 'Transactions',
                badge: transactions.length,
                content: <TransactionsTab vaId={account.id} />,
              },
              {
                id: 'rules',
                label: 'Matching Rules',
                content: <MatchingRulesTab vaId={account.id} />,
              },
              {
                id: 'unmatched',
                label: 'Unmatched Items',
                badge: unmatchedCount > 0 ? unmatchedCount : undefined,
                content: <UnmatchedTab vaId={account.id} />,
              },
              {
                id: 'sweep-history',
                label: 'Sweep History',
                badge: sweepHistory.length > 0 ? sweepHistory.length : undefined,
                content: <SweepHistoryTab vaId={account.id} />,
              },
            ]}
          />
        </div>
      </div>

      {/* ── Credit Modal ───────────────────────────────────────────────────── */}
      <ActionModal
        title="Credit Virtual Account"
        icon={<div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30"><DollarSign className="w-4 h-4 text-green-700 dark:text-green-400" /></div>}
        open={creditModal}
        onClose={() => { setCreditModal(false); setCreditAmount(''); setCreditRef(''); }}
        onConfirm={() => creditMutation.mutate()}
        isPending={creditMutation.isPending}
        confirmLabel="Credit Account"
        confirmClass="bg-green-600 text-white hover:bg-green-700"
        error={creditMutation.isError ? 'Failed to credit account. Please try again.' : null}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount <span className="text-red-500">*</span></label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reference (optional)</label>
          <input
            type="text"
            value={creditRef}
            onChange={(e) => setCreditRef(e.target.value)}
            placeholder="e.g. INV-2024-0012"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Current balance: <span className="font-mono font-medium">{formatMoney(account.virtualBalance, account.currency)}</span>
        </p>
      </ActionModal>

      {/* ── Debit Modal ────────────────────────────────────────────────────── */}
      <ActionModal
        title="Debit Virtual Account"
        icon={<div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30"><Minus className="w-4 h-4 text-red-700 dark:text-red-400" /></div>}
        open={debitModal}
        onClose={() => { setDebitModal(false); setDebitAmount(''); }}
        onConfirm={() => debitMutation.mutate()}
        isPending={debitMutation.isPending}
        confirmLabel="Debit Account"
        confirmClass="bg-red-600 text-white hover:bg-red-700"
        error={debitMutation.isError ? 'Insufficient balance or debit failed.' : null}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount <span className="text-red-500">*</span></label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={debitAmount}
            onChange={(e) => setDebitAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Available balance: <span className="font-mono font-medium">{formatMoney(account.virtualBalance, account.currency)}</span>
        </p>
      </ActionModal>

      {/* ── Deactivate Modal ───────────────────────────────────────────────── */}
      <ActionModal
        title="Deactivate Virtual Account"
        icon={<div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30"><Power className="w-4 h-4 text-red-700 dark:text-red-400" /></div>}
        open={deactivateModal}
        onClose={() => setDeactivateModal(false)}
        onConfirm={() => deactivateMutation.mutate()}
        isPending={deactivateMutation.isPending}
        confirmLabel="Deactivate"
        confirmClass="bg-red-600 text-white hover:bg-red-700"
        error={deactivateMutation.isError ? 'Cannot deactivate account with non-zero balance.' : null}
      >
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">
            Are you sure you want to deactivate <span className="font-mono font-semibold">{account.virtualAccountNumber}</span>?
            This will prevent all future transactions. The account must have a zero balance.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Current balance: <span className="font-mono font-medium">{formatMoney(account.virtualBalance, account.currency)}</span>
        </p>
      </ActionModal>

      {/* ── Sweep Modal ────────────────────────────────────────────────────── */}
      <ActionModal
        title="Sweep to Physical Account"
        icon={<div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><ArrowDownUp className="w-4 h-4 text-blue-700 dark:text-blue-400" /></div>}
        open={sweepModal}
        onClose={() => setSweepModal(false)}
        onConfirm={() => sweepMutation.mutate()}
        isPending={sweepMutation.isPending}
        confirmLabel="Sweep Now"
        confirmClass="bg-blue-600 text-white hover:bg-blue-700"
        error={sweepMutation.isError ? 'Sweep failed. Balance may already be zero.' : null}
      >
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/40 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Move the entire virtual account balance of{' '}
            <span className="font-mono font-semibold">{formatMoney(account.virtualBalance, account.currency)}</span>{' '}
            back to the physical (master) account #{account.masterAccountId}.
          </p>
        </div>
      </ActionModal>
    </div>
  );
}
