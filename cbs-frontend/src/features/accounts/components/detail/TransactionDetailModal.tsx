import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Printer, RotateCcw, Download, Loader2, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { accountDetailApi, type Transaction } from '../../api/accountDetailApi';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, open, onClose }: TransactionDetailModalProps) {
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);

  const reverseMut = useMutation({
    mutationFn: () => accountDetailApi.reverseTransaction(Number(transaction?.id ?? 0)),
    onSuccess: () => { toast.success('Transaction reversed successfully'); setShowReverseConfirm(false); onClose(); },
    onError: () => toast.error('Failed to reverse transaction'),
  });

  const handleDownloadReceipt = async () => {
    if (!transaction) return;
    try {
      const response = await fetch(`/api/v1/transactions/${transaction.id}/receipt`, {
        headers: { 'Accept': 'text/html' },
      });
      if (!response.ok) throw new Error('Failed to fetch receipt');
      const html = await response.text();
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.print(); }
    } catch {
      // Fallback: print current modal
      window.print();
    }
  };

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
                {isDebit ? '−' : '+'}{formatMoney(amount, transaction.currency)}
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
                <p className="font-mono">{formatMoney(transaction.runningBalance, transaction.currency)}</p>
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
          <div className="flex flex-wrap gap-2 justify-between px-6 py-4 border-t bg-muted/20">
            <div className="flex gap-2">
              <button onClick={handleDownloadReceipt}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Receipt
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
            {transaction.status !== 'REVERSED' && (
              <button onClick={() => setShowReverseConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <RotateCcw className="w-4 h-4" /> Reverse
              </button>
            )}
          </div>

          {/* Reverse confirmation dialog */}
          {showReverseConfirm && (
            <div className="px-6 pb-4">
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
                <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm font-semibold text-red-700 dark:text-red-400">Confirm Reversal</span></div>
                <p className="text-xs text-red-600 dark:text-red-400">This will reverse the {txnType.toLowerCase()} of {formatMoney(amount)} (ref: {transaction.reference}). This action cannot be undone.</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowReverseConfirm(false)} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">Cancel</button>
                  <button onClick={() => reverseMut.mutate()} disabled={reverseMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                    {reverseMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Reverse Transaction
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
