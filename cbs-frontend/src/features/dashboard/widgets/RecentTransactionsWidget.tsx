import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatRelative } from '@/lib/formatters';
import { StatusBadge, EmptyState } from '@/components/shared';
import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

interface RecentTxn {
  id: number;
  ref: string;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  amount: number;
  currency: string;
  status: string;
  time: string;
}

export function RecentTransactionsWidget() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: queryKeys.dashboard.recentTransactions,
    queryFn: () => apiGet<RecentTxn[]>('/api/v1/dashboard/recent-transactions'),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (transactions.length === 0) return <EmptyState title="No recent transactions" />;

  return (
    <div className="divide-y">
      {transactions.map((txn) => (
        <div key={txn.id} className="flex items-center gap-3 py-2.5 px-1 hover:bg-muted/30 transition-colors">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.type === 'CREDIT' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {txn.type === 'CREDIT' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{txn.description}</p>
            <p className="text-xs text-muted-foreground font-mono">{txn.ref}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-mono font-medium ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-foreground'}`}>
              {txn.type === 'CREDIT' ? '+' : '-'}{formatMoney(txn.amount, txn.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{formatRelative(txn.time)}</p>
          </div>
          <StatusBadge status={txn.status} size="sm" />
        </div>
      ))}
    </div>
  );
}
