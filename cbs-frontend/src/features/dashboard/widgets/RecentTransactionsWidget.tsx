import { formatMoney, formatRelative } from '@/lib/formatters';
import { StatusBadge, EmptyState } from '@/components/shared';
import { ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';

interface Transaction {
  id: number | string;
  ref?: string;
  referenceNumber?: string;
  type: string;
  description: string;
  amount: number;
  currency?: string;
  status: string;
  time?: string;
  createdAt?: string;
}

interface RecentTransactionsWidgetProps {
  transactions?: Transaction[];
  isLoading?: boolean;
}

function TransactionSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-1 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-4 w-20 bg-muted rounded ml-auto" />
            <div className="h-3 w-16 bg-muted rounded ml-auto" />
          </div>
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function RecentTransactionsWidget({ transactions, isLoading }: RecentTransactionsWidgetProps) {
  if (isLoading) {
    return <TransactionSkeleton />;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No recent transactions"
        description="Transactions will appear here once activity begins."
        className="py-10"
      />
    );
  }

  return (
    <div className="divide-y">
      {transactions.map((txn) => {
        const ref = txn.ref ?? txn.referenceNumber ?? '';
        const time = txn.time ?? txn.createdAt ?? '';
        const currency = txn.currency ?? 'NGN';
        const txnType = txn.type?.toUpperCase();

        return (
          <div key={txn.id} className="flex items-center gap-3 py-2.5 px-1 hover:bg-muted/30 transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txnType === 'CREDIT' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {txnType === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{txn.description}</p>
              {ref && <p className="text-xs text-muted-foreground font-mono">{ref}</p>}
            </div>
            <div className="text-right">
              <p className={`text-sm font-mono font-medium ${txnType === 'CREDIT' ? 'text-green-600' : 'text-foreground'}`}>
                {txnType === 'CREDIT' ? '+' : '-'}{formatMoney(txn.amount, currency)}
              </p>
              {time && <p className="text-xs text-muted-foreground">{formatRelative(time)}</p>}
            </div>
            <StatusBadge status={txn.status} size="sm" />
          </div>
        );
      })}
    </div>
  );
}
