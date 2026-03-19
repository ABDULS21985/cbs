import { X, Printer, Download } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime, formatDate } from '@/lib/formatters';
import type { Transaction } from '../../api/accountDetailApi';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, open, onClose }: TransactionDetailModalProps) {
  if (!open || !transaction) return null;

  const isDebit = !!transaction.debitAmount;
  const amount = transaction.debitAmount ?? transaction.creditAmount ?? 0;
  const txnType = isDebit ? 'DEBIT' : 'CREDIT';

  const glEntries = isDebit
    ? [
        { side: 'DR', account: 'Customer Account', amount },
        { side: 'CR', account: 'Suspense / Payable GL', amount },
      ]
    : [
        { side: 'DR', account: 'Suspense / Receivable GL', amount },
        { side: 'CR', account: 'Customer Account', amount },
      ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-base font-semibold">Transaction Details</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{transaction.reference}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Amount + type */}
            <div className="text-center py-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground font-medium uppercase mb-1">{txnType}</p>
              <p className={`text-2xl font-semibold font-mono ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                {isDebit ? '−' : '+'}{formatMoney(amount)}
              </p>
              <div className="mt-2">
                <StatusBadge status={transaction.status} dot />
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Reference</p>
                <p className="font-mono text-xs">{transaction.reference}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Channel</p>
                <p>{transaction.channel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Posting Date</p>
                <p>{formatDateTime(transaction.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Value Date</p>
                <p>{formatDate(transaction.valueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Running Balance</p>
                <p className="font-mono">{formatMoney(transaction.runningBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Fee</p>
                <p className="font-mono">{formatMoney(0)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Description</p>
                <p>{transaction.description}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Narration</p>
                <p className="text-muted-foreground">{transaction.narration}</p>
              </div>
            </div>

            {/* GL Entries */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">GL Entries</p>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Side</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Account</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glEntries.map((entry, i) => (
                      <tr key={i} className={i < glEntries.length - 1 ? 'border-b' : ''}>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-semibold font-mono px-1.5 py-0.5 rounded ${entry.side === 'DR' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {entry.side}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.account}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatMoney(entry.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t bg-muted/20">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
