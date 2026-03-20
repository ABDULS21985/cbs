import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Printer, Download, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { InfoGrid, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { transactionApi, type Transaction } from '../api/transactionApi';
import { TransactionReceipt } from './TransactionReceipt';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, open, onClose }: TransactionDetailModalProps) {
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const queryClient = useQueryClient();
  const {
    data: transactionDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['transactions', 'detail', transaction?.id],
    queryFn: () => transactionApi.getTransaction(transaction!.id),
    enabled: open && Boolean(transaction?.id),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open) {
      setReverseOpen(false);
      setReverseReason('');
    }
  }, [open]);

  useEffect(() => {
    setReverseOpen(false);
    setReverseReason('');
  }, [transaction?.id]);

  const reverseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      transactionApi.reverseTransaction(id, reason),
    onSuccess: () => {
      toast.success('Transaction reversed successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setReverseOpen(false);
      setReverseReason('');
      onClose();
    },
    onError: () => {
      toast.error('Failed to reverse transaction');
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => transactionApi.downloadReceipt(id),
    onSuccess: () => toast.success('Receipt downloaded'),
    onError: () => toast.error('Failed to download receipt'),
  });

  if (!open || !transaction) return null;
  const detail = transactionDetail ?? transaction;

  const handlePrint = () => {
    const receiptEl = document.getElementById('txn-receipt-root');
    if (receiptEl) receiptEl.style.display = 'block';
    window.print();
    if (receiptEl) receiptEl.style.display = 'none';
  };

  const canReverse = detail.status === 'COMPLETED';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold">Transaction Details</h2>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{detail.reference}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {isDetailError && !isDetailLoading && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Could not load full transaction details. Showing the search result snapshot.</span>
                </div>
                <button
                  onClick={() => refetchDetail()}
                  className="rounded-md border border-amber-200 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 dark:border-amber-900/40 dark:hover:bg-amber-900/20"
                >
                  Retry
                </button>
              </div>
            )}

            {isDetailLoading ? (
              <>
                <div className="flex flex-wrap items-center gap-3 animate-pulse">
                  <div className="h-8 w-24 rounded-md bg-muted" />
                  <div className="h-4 w-10 rounded bg-muted" />
                  <div className="h-8 w-28 rounded-md bg-muted" />
                  <div className="h-8 w-24 rounded-full bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4">
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 w-12 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 w-8 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 rounded-lg border bg-muted/20 px-4 py-3 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-6 w-28 rounded bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-6 w-28 rounded bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-10 rounded bg-muted" />
                    <div className="h-5 w-20 rounded bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 animate-pulse">
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                  </div>
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-4 w-24 rounded bg-muted" />
                  </div>
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-4 w-24 rounded bg-muted" />
                  </div>
                  <div className="space-y-2 rounded-lg border p-4 md:col-span-3">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Type / Channel / Status row */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-sm font-medium">
                    {detail.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-muted-foreground text-sm">via</span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-sm font-medium">
                    {detail.channel} Banking
                  </span>
                  <StatusBadge status={detail.status} size="md" dot />
                </div>

                {/* From / To */}
                {(detail.fromAccount || detail.toAccount) && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    {detail.fromAccount && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">From</p>
                        <p className="font-mono text-sm font-semibold">
                          {detail.fromAccount.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}
                        </p>
                        {detail.fromAccountName && (
                          <p className="text-sm text-muted-foreground mt-0.5">{detail.fromAccountName}</p>
                        )}
                      </div>
                    )}
                    {detail.toAccount && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">To</p>
                        <p className="font-mono text-sm font-semibold">
                          {detail.toAccount.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}
                        </p>
                        {detail.toAccountName && (
                          <p className="text-sm text-muted-foreground mt-0.5">{detail.toAccountName}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Amount row */}
                <div className="flex flex-wrap gap-6 px-4 py-3 bg-muted/20 rounded-lg border">
                  {detail.debitAmount !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Debit Amount</p>
                      <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                        {formatMoney(detail.debitAmount)}
                      </p>
                    </div>
                  )}
                  {detail.creditAmount !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Credit Amount</p>
                      <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                        {formatMoney(detail.creditAmount)}
                      </p>
                    </div>
                  )}
                  {detail.fee !== undefined && detail.fee > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Fee</p>
                      <p className="font-mono text-base font-semibold text-amber-600 dark:text-amber-400">
                        {formatMoney(detail.fee)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <InfoGrid
                  columns={3}
                  items={[
                    { label: 'Date & Time', value: detail.dateTime, format: 'datetime' },
                    { label: 'Value Date', value: detail.valueDate, format: 'date' },
                    { label: 'Posting Date', value: detail.postingDate, format: 'date' },
                    { label: 'Narration', value: detail.narration, span: 3 },
                  ]}
                />

                {/* GL Entries */}
                {detail.glEntries && detail.glEntries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">GL Entries</h3>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">Account</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">Amount</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {detail.glEntries.map((entry, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold',
                                    entry.type === 'DR'
                                      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                  )}
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">
                                {entry.account.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs font-medium">
                                {formatMoney(entry.amount)}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{entry.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={isDetailLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                onClick={() => downloadMutation.mutate(detail.id)}
                disabled={downloadMutation.isPending || isDetailLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>
            </div>

            {canReverse && (
              <button
                onClick={() => setReverseOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reverse Transaction
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden printable receipt */}
      <TransactionReceipt transaction={detail} />

      {/* Reverse confirmation */}
      {reverseOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Reverse Transaction</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You are about to reverse transaction <span className="font-mono font-medium">{detail.reference}</span>.
                  This action cannot be undone.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Reason for Reversal</label>
                <textarea
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  rows={3}
                  placeholder="Enter reason for reversing this transaction..."
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setReverseOpen(false); setReverseReason(''); }}
                  disabled={reverseMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => reverseMutation.mutate({ id: detail.id, reason: reverseReason })}
                  disabled={reverseMutation.isPending || !reverseReason.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {reverseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Reversal
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
