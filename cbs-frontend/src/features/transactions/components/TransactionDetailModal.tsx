import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Loader2, Printer, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { InfoGrid, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { transactionApi, type Transaction } from '../api/transactionApi';
import { TransactionReceipt } from './TransactionReceipt';
import { AuditTrailTimeline } from './AuditTrailTimeline';
import { DisputeFilingForm } from './disputes/DisputeFilingForm';
import { EnhancedReversalWorkflow } from './reversals/EnhancedReversalWorkflow';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onClose: () => void;
}

type DetailTab = 'details' | 'audit';

function isDisputeEligible(transaction: Transaction) {
  if (transaction.status !== 'COMPLETED' || !transaction.postingDate) {
    return false;
  }
  const postedAt = new Date(transaction.postingDate);
  const ageMs = Date.now() - postedAt.getTime();
  return ageMs <= 90 * 24 * 60 * 60 * 1000;
}

export function TransactionDetailModal({ transaction, open, onClose }: TransactionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reversalOpen, setReversalOpen] = useState(false);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

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
      setActiveTab('details');
      setDisputeOpen(false);
      setReversalOpen(false);
    }
  }, [open]);

  useEffect(() => {
    setActiveTab('details');
    setDisputeOpen(false);
    setReversalOpen(false);
  }, [transaction?.id]);

  const downloadMutation = useMutation({
    mutationFn: (id: string) => transactionApi.downloadReceipt(id),
    onSuccess: () => toast.success('Receipt downloaded'),
    onError: () => toast.error('Failed to download receipt'),
  });

  const detail = transactionDetail ?? transaction;
  const canReverse = detail?.status === 'COMPLETED';
  const canDispute = detail ? isDisputeEligible(detail) : false;

  const auditEvents = useMemo(() => detail?.auditTrail ?? [], [detail?.auditTrail]);

  if (!open || !transaction || !detail) return null;

  const handlePrint = () => {
    const receiptEl = document.getElementById('txn-receipt-root');
    if (receiptEl) receiptEl.style.display = 'block';
    window.print();
    if (receiptEl) receiptEl.style.display = 'none';
  };

  const refreshTransaction = () => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void refetchDetail();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Transaction Details</h2>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{detail.reference}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-b px-6 py-3 text-sm">
            <button
              onClick={() => setActiveTab('details')}
              className={cn('rounded-lg px-3 py-1.5 font-medium', activeTab === 'details' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={cn('rounded-lg px-3 py-1.5 font-medium', activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              Audit Trail
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
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

            {detail.amlFlag && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-semibold">
                      AML Flag: {detail.amlFlag.description} (Score: {detail.amlFlag.score}/100)
                    </p>
                    <p className="mt-1 text-xs">
                      Flagged {detail.amlFlag.flaggedAt} | Case: {detail.amlFlag.caseRef}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {detail.latestDispute && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
                Latest dispute {detail.latestDispute.disputeRef} is {detail.latestDispute.status.replaceAll('_', ' ')}.
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
                  </div>
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 w-8 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
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
                </div>
              </>
            ) : activeTab === 'audit' ? (
              <AuditTrailTimeline events={auditEvents} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-sm font-medium">
                    {detail.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-muted-foreground">via</span>
                  <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-sm font-medium">
                    {detail.channel} Banking
                  </span>
                  <StatusBadge status={detail.status} size="md" dot />
                </div>

                {(detail.fromAccount || detail.toAccount) && (
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4">
                    {detail.fromAccount && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">From</p>
                        <p className="font-mono text-sm font-semibold">{detail.fromAccount}</p>
                        {detail.fromAccountName && <p className="mt-0.5 text-sm text-muted-foreground">{detail.fromAccountName}</p>}
                      </div>
                    )}
                    {detail.toAccount && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">To</p>
                        <p className="font-mono text-sm font-semibold">{detail.toAccount}</p>
                        {detail.toAccountName && <p className="mt-0.5 text-sm text-muted-foreground">{detail.toAccountName}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-6 rounded-lg border bg-muted/20 px-4 py-3">
                  {detail.debitAmount !== undefined && (
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">Debit Amount</p>
                      <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">{formatMoney(detail.debitAmount)}</p>
                    </div>
                  )}
                  {detail.creditAmount !== undefined && (
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">Credit Amount</p>
                      <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">{formatMoney(detail.creditAmount)}</p>
                    </div>
                  )}
                  {detail.fee !== undefined && detail.fee > 0 && (
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">Fee</p>
                      <p className="font-mono text-base font-semibold text-amber-600 dark:text-amber-400">{formatMoney(detail.fee)}</p>
                    </div>
                  )}
                </div>

                <InfoGrid
                  columns={3}
                  items={[
                    { label: 'Date & Time', value: detail.dateTime, format: 'datetime' },
                    { label: 'Value Date', value: detail.valueDate, format: 'date' },
                    { label: 'Posting Date', value: detail.postingDate, format: 'date' },
                    { label: 'Customer Email', value: detail.customerEmail || 'N/A' },
                    { label: 'Customer Phone', value: detail.customerPhone || 'N/A' },
                    { label: 'Narration', value: detail.narration, span: 3 },
                  ]}
                />

                {detail.glEntries && detail.glEntries.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">GL Entries</h3>
                    <div className="overflow-hidden rounded-lg border">
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
                          {detail.glEntries.map((entry, index) => (
                            <tr key={index} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold',
                                    entry.type === 'DR'
                                      ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                  )}
                                >
                                  {entry.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{entry.account}</td>
                              <td className="px-3 py-2 text-right font-mono text-xs font-medium">{formatMoney(entry.amount)}</td>
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

          <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={isDetailLoading}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button
                onClick={() => downloadMutation.mutate(detail.id)}
                disabled={downloadMutation.isPending || isDetailLoading}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                {downloadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Receipt
              </button>
            </div>

            <div className="flex items-center gap-2">
              {canDispute && (
                <button
                  onClick={() => setDisputeOpen(true)}
                  className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-950/20"
                >
                  Raise Dispute
                </button>
              )}
              {canReverse && (
                <button
                  onClick={() => setReversalOpen(true)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                >
                  Reverse Transaction
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionReceipt transaction={detail} />

      <DisputeFilingForm
        open={disputeOpen}
        transaction={detail}
        defaultEmail={detail.customerEmail || user?.email}
        defaultPhone={detail.customerPhone}
        onClose={() => setDisputeOpen(false)}
        onSubmitted={refreshTransaction}
      />

      <EnhancedReversalWorkflow
        open={reversalOpen}
        transaction={detail}
        onClose={() => setReversalOpen(false)}
        onCompleted={refreshTransaction}
      />
    </>
  );
}
