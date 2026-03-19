import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Wallet, CheckCircle2, AlertCircle, Hash, Link2, X, CheckCheck,
} from 'lucide-react';
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
  type VATransaction,
  type MatchingRule,
} from '../api/virtualAccountApi';

const MATCH_STATUS_COLORS: Record<VATransaction['matchStatus'], string> = {
  MATCHED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  UNMATCHED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PARTIAL: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function TransactionsTab({ vaId }: { vaId: string }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['va-transactions', vaId],
    queryFn: () => getVATransactions(vaId),
  });

  const columns = useMemo<ColumnDef<VATransaction, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.date)}</span>
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
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span
            className={[
              'font-mono text-sm font-medium tabular-nums',
              row.original.type === 'CREDIT'
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400',
            ].join(' ')}
          >
            {row.original.type === 'CREDIT' ? '+' : '-'}
            {formatMoney(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              row.original.type === 'CREDIT'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            )}
          >
            {row.original.type}
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

function MatchingRulesTab({ vaId }: { vaId: string }) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['va-rules', vaId],
    queryFn: () => getMatchingRules(vaId),
  });

  const saveMutation = useMutation({
    mutationFn: (updatedRules: MatchingRule[]) => updateMatchingRules(vaId, updatedRules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['va-rules', vaId] });
      setToast('Matching rules saved successfully');
      setTimeout(() => setToast(null), 3000);
    },
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

  return (
    <div className="p-6">
      {toast && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 px-4 py-3">
          <CheckCheck className="w-4 h-4 text-green-700 dark:text-green-400 flex-shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-400">{toast}</span>
        </div>
      )}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Define rules that determine how incoming payment references are matched to this virtual account.
          Rules are evaluated in priority order (lowest number first).
        </p>
      </div>
      <MatchingRuleEditor rules={rules} onSave={(r) => saveMutation.mutate(r)} />
    </div>
  );
}

function UnmatchedTab({ vaId }: { vaId: string }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['va-transactions', vaId],
    queryFn: () => getVATransactions(vaId),
  });

  const [toast, setToast] = useState<{ type: 'match' | 'writeoff'; ref: string } | null>(null);

  const handleMatch = (txn: VATransaction) => {
    setToast({ type: 'match', ref: txn.reference });
    setTimeout(() => setToast(null), 4000);
  };

  const handleWriteOff = (txn: VATransaction) => {
    setToast({ type: 'writeoff', ref: txn.reference });
    setTimeout(() => setToast(null), 4000);
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
      {toast && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3',
            toast.type === 'match'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40',
          )}
        >
          {toast.type === 'match' ? (
            <Link2 className="w-4 h-4 text-blue-700 dark:text-blue-400 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0" />
          )}
          <span
            className={cn(
              'text-sm',
              toast.type === 'match'
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {toast.type === 'match'
              ? `Manual match initiated for reference: ${toast.ref}`
              : `Write-off initiated for reference: ${toast.ref}`}
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

export function VirtualAccountDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: account, isLoading, error } = useQuery({
    queryKey: ['virtual-account', id],
    queryFn: () => getVirtualAccountById(id!),
    enabled: !!id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['va-transactions', id],
    queryFn: () => getVATransactions(id!),
    enabled: !!id,
  });

  const unmatchedCount = transactions.filter(
    (t) => t.matchStatus === 'UNMATCHED' || t.matchStatus === 'PARTIAL',
  ).length;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Loading..." backTo="/accounts/virtual-accounts" />
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
        title={account.vaNumber}
        subtitle={`${account.customerName} · ${account.currency}`}
        backTo="/accounts/virtual-accounts"
        actions={
          <StatusBadge status={account.status} dot />
        }
      />

      <div className="page-container">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Balance"
            value={account.balance}
            format="money"
            currency={account.currency}
            icon={Wallet}
          />
          <StatCard
            label="Matched MTD"
            value={account.matchedMTD}
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
            value={account.vaNumber}
            icon={Hash}
          />
        </div>

        {/* Account detail row */}
        <div className="rounded-lg border bg-card px-5 py-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Parent Account</div>
              <div className="font-mono font-medium">{account.parentAccountNumber}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Customer ID</div>
              <div className="font-medium">{account.customerId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Pattern</div>
              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{account.pattern}</code>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Created</div>
              <div className="font-medium">{formatDateTime(account.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <TabsPage
            tabs={[
              {
                id: 'rules',
                label: 'Matching Rules',
                content: <MatchingRulesTab vaId={account.id} />,
              },
              {
                id: 'transactions',
                label: 'Transactions',
                badge: transactions.length,
                content: <TransactionsTab vaId={account.id} />,
              },
              {
                id: 'unmatched',
                label: 'Unmatched Items',
                badge: unmatchedCount > 0 ? unmatchedCount : undefined,
                content: <UnmatchedTab vaId={account.id} />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
