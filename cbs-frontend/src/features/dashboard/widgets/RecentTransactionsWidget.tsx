import { formatMoney, formatRelative } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const mockTransactions = [
  { id: 1, ref: 'TXN-2026031801', type: 'CREDIT', description: 'Salary Payment - Dangote Plc', amount: 450000, currency: 'NGN', status: 'COMPLETED', time: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 2, ref: 'TXN-2026031802', type: 'DEBIT', description: 'SWIFT Transfer - USD Account', amount: 25000, currency: 'USD', status: 'PROCESSING', time: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 3, ref: 'TXN-2026031803', type: 'DEBIT', description: 'Bill Payment - EKEDC', amount: 35000, currency: 'NGN', status: 'COMPLETED', time: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 4, ref: 'TXN-2026031804', type: 'CREDIT', description: 'POS Collection - Store #42', amount: 89000, currency: 'NGN', status: 'COMPLETED', time: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 5, ref: 'TXN-2026031805', type: 'DEBIT', description: 'Loan Repayment - LN00234', amount: 125000, currency: 'NGN', status: 'COMPLETED', time: new Date(Date.now() - 5 * 3600000).toISOString() },
];

export function RecentTransactionsWidget() {
  return (
    <div className="divide-y">
      {mockTransactions.map((txn) => (
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
