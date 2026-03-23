import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  RotateCcw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, formatMoney, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/hooks/usePermission';
import { TransactionErrorState } from '../components/TransactionErrorState';
import { transactionApi } from '../api/transactionApi';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

function DashboardCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ElementType;
  tone: string;
}) {
  return (
    <div className="surface-card px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn('rounded-lg p-1.5', tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

export function ReversalApprovalPage() {
  const queryClient = useQueryClient();
  const canApprove = useHasRole('CBS_ADMIN');
  const canViewQueue = useHasRole(['CBS_ADMIN', 'CBS_OFFICER']);
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [mineOnly, setMineOnly] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedReversalId, setSelectedReversalId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    document.title = 'Reversal Queue | CBS';
  }, []);

  useEffect(() => {
    if (!canApprove) {
      setMineOnly(true);
    }
  }, [canApprove]);

  const reversalsQuery = useQuery({
    queryKey: ['transaction-reversals', statusFilter, mineOnly, pageIndex, pageSize],
    queryFn: () => transactionApi.listReversals({
      status: statusFilter || undefined,
      mine: mineOnly,
      page: pageIndex,
      size: pageSize,
    }),
    staleTime: 15_000,
    enabled: canViewQueue,
  });

  const countsQuery = useQuery({
    queryKey: ['transaction-reversals', 'counts'],
    queryFn: () => transactionApi.getReversalCounts(),
    staleTime: 15_000,
    enabled: canViewQueue,
  });

  const detailQuery = useQuery({
    queryKey: ['transaction-reversals', 'detail', selectedReversalId],
    queryFn: () => transactionApi.getReversal(selectedReversalId!),
    enabled: selectedReversalId !== null,
    staleTime: 15_000,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['transaction-reversals'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => transactionApi.approveReversal(id),
    onSuccess: (result) => {
      toast.success(result.message || 'Reversal approved');
      invalidateAll();
      setSelectedReversalId(null);
    },
    onError: () => toast.error('Failed to approve reversal'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => transactionApi.rejectReversal(id, reason),
    onSuccess: (result) => {
      toast.success(result.message || 'Reversal rejected');
      invalidateAll();
      setSelectedReversalId(null);
      setRejectDialogOpen(false);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject reversal'),
  });

  const pageMeta = reversalsQuery.data?.page;
  const items = reversalsQuery.data?.content ?? [];
  const selectedReversal = detailQuery.data ?? items.find((item) => item.id === selectedReversalId) ?? null;
  const totalPages = pageMeta?.totalPages ?? Math.max(1, Math.ceil((reversalsQuery.data?.totalElements ?? 0) / pageSize));

  const dashboardCards = useMemo(
    () => [
      {
        label: 'Pending Approval',
        value: countsQuery.data?.pendingApproval ?? 0,
        icon: Clock,
        tone: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
      },
      {
        label: 'Completed',
        value: countsQuery.data?.completed ?? 0,
        icon: CheckCircle,
        tone: 'bg-green-100 text-green-600 dark:bg-green-900/30',
      },
      {
        label: 'Rejected',
        value: countsQuery.data?.rejected ?? 0,
        icon: XCircle,
        tone: 'bg-red-100 text-red-600 dark:bg-red-900/30',
      },
    ],
    [countsQuery.data],
  );

  if (!canViewQueue) {
    return (
      <div className="page-container py-10">
        <TransactionErrorState
          title="Access denied"
          description="You do not have permission to review transaction reversals."
          compact
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Reversal Queue"
        subtitle="Review reversal requests, track approvals, and download final advice letters."
        actions={(
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(event) => {
                  setMineOnly(event.target.checked);
                  setPageIndex(0);
                }}
                disabled={!canApprove}
                className="rounded border-border"
              />
              My requests only
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              Page size
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPageIndex(0);
                }}
                className="rounded-lg border bg-background px-2 py-1 text-sm"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      />

      <div className="page-container space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {dashboardCards.map((card) => (
            <DashboardCard key={card.label} {...card} />
          ))}
        </div>

        {!canApprove && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            CBS Officers can submit and monitor reversal requests here. Approval and rejection actions are restricted to CBS Administrators.
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setPageIndex(0);
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === filter.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {reversalsQuery.isError ? (
          <TransactionErrorState
            error={reversalsQuery.error}
            onRetry={() => void reversalsQuery.refetch()}
          />
        ) : reversalsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <RotateCcw className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No reversal requests found for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-hidden surface-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Request Ref</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Transaction</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Account</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Requested By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Requested At</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 text-sm font-mono">{item.requestRef}</td>
                    <td className="px-4 py-3 text-sm font-mono">{item.transactionRef}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-mono">{item.accountNumber}</p>
                      <p className="text-xs text-muted-foreground">{item.accountName}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                      {formatMoney(item.amount, item.currencyCode)}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.requestedBy}</td>
                    <td className="px-4 py-3 text-sm">{formatRelative(item.requestedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status.replaceAll('_', ' ')} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedReversalId(item.id)}
                          className="rounded-md p-1.5 hover:bg-muted"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canApprove && item.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(item.id)}
                              disabled={approveMutation.isPending}
                              className="rounded-md p-1.5 text-green-600 hover:bg-green-50"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReversalId(item.id);
                                setRejectDialogOpen(true);
                              }}
                              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Showing page {(pageMeta?.page ?? pageIndex) + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                  disabled={pageIndex === 0}
                  className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPageIndex((current) => current + 1)}
                  disabled={pageMeta?.last ?? (pageIndex + 1 >= totalPages)}
                  className="rounded-lg border px-3 py-1.5 hover:bg-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedReversalId !== null && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setSelectedReversalId(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto surface-card shadow-xl">
              <div className="sticky top-0 flex items-center justify-between border-b bg-card px-6 py-4">
                <h3 className="font-semibold">Reversal Request Details</h3>
                <button onClick={() => setSelectedReversalId(null)} className="rounded-lg p-1.5 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {detailQuery.isLoading && !selectedReversal ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : detailQuery.isError ? (
                  <TransactionErrorState error={detailQuery.error} onRetry={() => void detailQuery.refetch()} compact />
                ) : selectedReversal ? (
                  <>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={selectedReversal.status.replaceAll('_', ' ')} />
                      <span className="text-lg font-bold font-mono">
                        {formatMoney(selectedReversal.amount, selectedReversal.currencyCode)}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-lg border text-sm">
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Request Ref</span>
                        <span className="font-mono">{selectedReversal.requestRef}</span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Transaction Ref</span>
                        <span className="font-mono">{selectedReversal.transactionRef}</span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Account</span>
                        <span className="text-right">
                          <span className="block font-mono">{selectedReversal.accountNumber}</span>
                          <span className="text-xs text-muted-foreground">{selectedReversal.accountName}</span>
                        </span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Reason</span>
                        <span>{selectedReversal.reasonCategory?.replaceAll('_', ' ')}</span>
                      </div>
                      {selectedReversal.subReason && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Sub reason</span>
                          <span>{selectedReversal.subReason}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Requested Settlement</span>
                        <span>{selectedReversal.requestedSettlement?.replaceAll('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Requested By</span>
                        <span>{selectedReversal.requestedBy}</span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Requested At</span>
                        <span>{formatDateTime(selectedReversal.requestedAt)}</span>
                      </div>
                      {selectedReversal.approvalRequestCode && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Approval Code</span>
                          <span className="font-mono">{selectedReversal.approvalRequestCode}</span>
                        </div>
                      )}
                      {selectedReversal.approvedBy && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Approved By</span>
                          <span>{selectedReversal.approvedBy}</span>
                        </div>
                      )}
                      {selectedReversal.approvedAt && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Approved At</span>
                          <span>{formatDateTime(selectedReversal.approvedAt)}</span>
                        </div>
                      )}
                      {selectedReversal.rejectedBy && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Rejected By</span>
                          <span className="text-red-600">{selectedReversal.rejectedBy}</span>
                        </div>
                      )}
                      {selectedReversal.rejectionReason && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Rejection Reason</span>
                          <span className="text-right text-red-600">{selectedReversal.rejectionReason}</span>
                        </div>
                      )}
                      {selectedReversal.reversalRef && (
                        <div className="flex justify-between px-4 py-3">
                          <span className="text-muted-foreground">Reversal Ref</span>
                          <span className="font-mono text-green-600">{selectedReversal.reversalRef}</span>
                        </div>
                      )}
                    </div>

                    {selectedReversal.notes && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                        <p className="rounded-lg bg-muted/30 p-3 text-sm">{selectedReversal.notes}</p>
                      </div>
                    )}

                    {selectedReversal.status === 'PENDING_APPROVAL' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="mt-0.5 h-4 w-4" />
                          <p>This reversal exceeds the dual-authorization threshold and must be approved by a CBS Administrator.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 border-t pt-2">
                      {canApprove && selectedReversal.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(selectedReversal.id)}
                            disabled={approveMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Approve Reversal
                          </button>
                          <button
                            onClick={() => setRejectDialogOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {selectedReversal.status === 'COMPLETED' && selectedReversal.adviceDownloadUrl && (
                        <button
                          onClick={() => void transactionApi.downloadReversalAdvice(selectedReversal.adviceDownloadUrl!)}
                          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <Download className="h-4 w-4" />
                          Download Advice
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      {rejectDialogOpen && selectedReversal && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/50"
            onClick={() => {
              setRejectDialogOpen(false);
              setRejectReason('');
            }}
          />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4 surface-card p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-red-600">Reject Reversal</h3>
              <p className="text-sm text-muted-foreground">
                {selectedReversal.requestRef} — {formatMoney(selectedReversal.amount, selectedReversal.currencyCode)}
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={3}
                  placeholder="Enter reason for rejection..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setRejectDialogOpen(false);
                    setRejectReason('');
                  }}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => rejectMutation.mutate({ id: selectedReversal.id, reason: rejectReason.trim() })}
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
