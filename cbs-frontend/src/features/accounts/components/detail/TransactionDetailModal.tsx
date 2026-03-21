import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Printer, RotateCcw, Download, Loader2, AlertTriangle, MessageSquareWarning, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import { accountDetailApi, type Transaction, type ReversalRequest, type ReversalPreview } from '../../api/accountDetailApi';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

const REVERSAL_REASONS = [
  { value: 'DUPLICATE_POSTING', label: 'Duplicate Posting' },
  { value: 'WRONG_AMOUNT', label: 'Wrong Amount' },
  { value: 'WRONG_ACCOUNT', label: 'Wrong Account' },
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
  { value: 'FRAUD', label: 'Fraud / Unauthorized' },
  { value: 'SYSTEM_ERROR', label: 'System Error' },
  { value: 'COMPLIANCE', label: 'Compliance / Regulatory' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function TransactionDetailModal({ transaction, open, onClose }: TransactionDetailModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showReverseForm, setShowReverseForm] = useState(false);
  const [reversalPreview, setReversalPreview] = useState<ReversalPreview | null>(null);
  const [reversalForm, setReversalForm] = useState<ReversalRequest>({
    reasonCategory: 'DUPLICATE_POSTING',
    subReason: '',
    notes: '',
    requestedSettlement: 'IMMEDIATE',
  });

  const previewMut = useMutation({
    mutationFn: () =>
      accountDetailApi.previewReversal(Number(transaction?.id ?? 0), reversalForm),
    onSuccess: (data) => setReversalPreview(data),
    onError: () => toast.error('Failed to preview reversal'),
  });

  const reverseMut = useMutation({
    mutationFn: () =>
      accountDetailApi.reverseTransaction(Number(transaction?.id ?? 0), reversalForm),
    onSuccess: (result) => {
      if (result.approvalRequired) {
        toast.success(`Reversal submitted for approval (ref: ${result.approvalRequestCode ?? result.requestRef})`);
      } else {
        toast.success(`Transaction reversed successfully (ref: ${result.reversalRef ?? result.requestRef})`);
      }
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowReverseForm(false);
      setReversalPreview(null);
      onClose();
    },
    onError: () => toast.error('Failed to reverse transaction'),
  });

  const handleDownloadReceipt = async () => {
    if (!transaction) return;
    try {
      await accountDetailApi.downloadReceipt(transaction.id);
    } catch {
      // Fallback: print current modal content
      window.print();
    }
  };

  const handleClose = () => {
    setShowReverseForm(false);
    setReversalPreview(null);
    setReversalForm({ reasonCategory: 'DUPLICATE_POSTING', subReason: '', notes: '', requestedSettlement: 'IMMEDIATE' });
    onClose();
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
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-base font-semibold">Transaction Details</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{transaction.reference}</p>
            </div>
            <button onClick={handleClose} className="p-1 rounded-md hover:bg-muted transition-colors">
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
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Status</p>
                <p>{transaction.status}</p>
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Receipt
              </button>
              <button onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => { handleClose(); navigate(`/payments/disputes`); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <MessageSquareWarning className="w-4 h-4" /> Dispute
              </button>
            </div>
            {transaction.status !== 'REVERSED' && (
              <button onClick={() => setShowReverseForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <RotateCcw className="w-4 h-4" /> Reverse
              </button>
            )}
          </div>

          {/* Reverse form with reason/preview workflow */}
          {showReverseForm && (
            <div className="px-6 pb-4 space-y-3">
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-400">Request Reversal</span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-red-700 dark:text-red-400">Reason Category *</label>
                    <select
                      value={reversalForm.reasonCategory}
                      onChange={(e) => setReversalForm((p) => ({ ...p, reasonCategory: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    >
                      {REVERSAL_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-red-700 dark:text-red-400">Notes *</label>
                    <textarea
                      value={reversalForm.notes}
                      onChange={(e) => setReversalForm((p) => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-md border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                      placeholder="Explain why this transaction should be reversed..."
                    />
                  </div>
                </div>

                {/* Preview result */}
                {reversalPreview && (
                  <div className="rounded-md border border-red-300 bg-white dark:bg-card p-3 space-y-2 text-xs">
                    <p className="font-semibold text-red-700 dark:text-red-400">Reversal Preview</p>
                    <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                      <span>Original Direction:</span>
                      <span className="font-medium text-foreground">{reversalPreview.originalDirection}</span>
                      <span>Reversal Direction:</span>
                      <span className="font-medium text-foreground">{reversalPreview.reversalDirection}</span>
                      <span>Amount:</span>
                      <span className="font-mono font-medium text-foreground">{formatMoney(reversalPreview.originalAmount)}</span>
                      <span>Settlement:</span>
                      <span className="font-medium text-foreground">{reversalPreview.settlementTiming ?? 'IMMEDIATE'}</span>
                      <span>Dual Auth Required:</span>
                      <span className={`font-semibold ${reversalPreview.dualAuthorizationRequired ? 'text-amber-600' : 'text-green-600'}`}>
                        {reversalPreview.dualAuthorizationRequired ? 'Yes — approval needed' : 'No'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowReverseForm(false); setReversalPreview(null); }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  {!reversalPreview && (
                    <button
                      onClick={() => previewMut.mutate()}
                      disabled={!reversalForm.notes?.trim() || previewMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                    >
                      {previewMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Preview Impact
                    </button>
                  )}
                  <button
                    onClick={() => reverseMut.mutate()}
                    disabled={!reversalForm.notes?.trim() || reverseMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {reverseMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Submit Reversal
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
