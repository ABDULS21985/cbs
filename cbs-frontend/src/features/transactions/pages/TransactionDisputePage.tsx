import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  MessageSquare,
  X,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime, formatMoney, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useHasRole } from '@/hooks/usePermission';
import { TransactionErrorState } from '../components/TransactionErrorState';
import { DisputeTrackingTable } from '../components/disputes/DisputeTrackingTable';
import { disputeApi, type DisputeRecord } from '../api/disputeApi';
import { useDisputes } from '../hooks/useDisputes';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

type ActionType = 'respond' | 'escalate' | 'close' | null;

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
    <div className="rounded-xl border bg-card px-4 py-3">
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

export function TransactionDisputePage() {
  const canManageDisputes = useHasRole(['CBS_ADMIN', 'CBS_OFFICER']);
  const canViewDisputes = canManageDisputes || useHasRole('PORTAL_USER');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [actionDispute, setActionDispute] = useState<DisputeRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [closeOutcome, setCloseOutcome] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');

  useEffect(() => {
    document.title = 'Transaction Disputes | CBS';
  }, []);

  const {
    disputes,
    dashboard,
    isLoading,
    isError,
    refetch,
    pageMeta,
    totalDisputes,
    respondMutation,
    escalateMutation,
    closeMutation,
  } = useDisputes({ status: statusFilter || undefined, page: pageIndex, size: pageSize });

  const detailQuery = useQuery({
    queryKey: ['transaction-disputes', 'detail', selectedDisputeId],
    queryFn: () => disputeApi.getDispute(selectedDisputeId!),
    enabled: selectedDisputeId !== null,
    staleTime: 30_000,
  });

  const selectedDispute = detailQuery.data ?? disputes.find((dispute) => dispute.id === selectedDisputeId) ?? null;

  const dashboardCards = useMemo(
    () => [
      {
        label: 'Total Disputes',
        value: dashboard?.total ?? 0,
        icon: AlertTriangle,
        tone: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30',
      },
      {
        label: 'Pending Response',
        value: dashboard?.pendingResponse ?? 0,
        icon: Clock,
        tone: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
      },
      {
        label: 'Under Review',
        value: dashboard?.underReview ?? 0,
        icon: Eye,
        tone: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
      },
      {
        label: 'Escalated',
        value: dashboard?.escalated ?? 0,
        icon: ArrowUpCircle,
        tone: 'bg-red-100 text-red-600 dark:bg-red-900/30',
      },
      {
        label: 'Resolved',
        value: dashboard?.resolved ?? 0,
        icon: CheckCircle,
        tone: 'bg-green-100 text-green-600 dark:bg-green-900/30',
      },
    ],
    [dashboard],
  );

  const openAction = (type: ActionType, dispute: DisputeRecord) => {
    setActionType(type);
    setActionDispute(dispute);
    setActionNotes('');
    setCloseOutcome('RESOLVED');
  };

  const executeAction = async () => {
    if (!actionDispute || !actionType) return;
    try {
      if (actionType === 'respond') {
        await respondMutation.mutateAsync({ id: actionDispute.id, response: actionNotes.trim() });
        toast.success('Dispute moved to review');
      } else if (actionType === 'escalate') {
        await escalateMutation.mutateAsync({ id: actionDispute.id, notes: actionNotes.trim() });
        toast.success('Dispute escalated');
      } else if (actionType === 'close') {
        await closeMutation.mutateAsync({ id: actionDispute.id, response: closeOutcome, notes: actionNotes.trim() });
        toast.success(`Dispute ${closeOutcome.toLowerCase()}`);
      }
      setActionType(null);
      setActionDispute(null);
      setSelectedDisputeId(null);
    } catch {
      toast.error('Failed to update dispute');
    }
  };

  const isActionPending = respondMutation.isPending || escalateMutation.isPending || closeMutation.isPending;
  const totalPages = pageMeta?.totalPages ?? Math.max(1, Math.ceil(totalDisputes / pageSize));

  if (!canViewDisputes) {
    return (
      <div className="page-container py-10">
        <TransactionErrorState
          title="Access denied"
          description="You do not have permission to review transaction disputes."
          compact
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Transaction Disputes"
        subtitle={canManageDisputes
          ? 'Track open disputes, respond to customer cases, and close investigations.'
          : 'Track the disputes you have filed and download supporting documents.'}
        actions={(
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
        )}
      />

      <div className="page-container space-y-5">
        <div className="grid gap-4 md:grid-cols-5">
          {dashboardCards.map((card) => (
            <DashboardCard key={card.label} {...card} />
          ))}
        </div>

        {!canManageDisputes && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
            Portal users can track disputes here. Investigation actions remain restricted to internal operations roles.
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

        {isError ? (
          <TransactionErrorState onRetry={() => refetch()} />
        ) : (
          <DisputeTrackingTable
            disputes={disputes}
            isLoading={isLoading}
            onView={(dispute) => setSelectedDisputeId(dispute.id)}
            onRespond={canManageDisputes ? (dispute) => openAction('respond', dispute) : undefined}
            onEscalate={canManageDisputes ? (dispute) => openAction('escalate', dispute) : undefined}
            onClose={canManageDisputes ? (dispute) => openAction('close', dispute) : undefined}
            pageIndex={pageMeta?.page ?? pageIndex}
            pageSize={pageMeta?.size ?? pageSize}
            totalRows={totalDisputes}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(0);
            }}
          />
        )}

        {!isLoading && totalDisputes > 0 && (
          <div className="flex items-center justify-between text-sm">
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
        )}
      </div>

      {selectedDisputeId !== null && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setSelectedDisputeId(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b bg-card px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDispute?.disputeRef ?? 'Dispute Detail'}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Transaction: {selectedDispute?.transactionRef ?? 'Loading...'}
                  </p>
                </div>
                <button onClick={() => setSelectedDisputeId(null)} className="rounded-lg p-2 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {detailQuery.isLoading && !selectedDispute ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : detailQuery.isError ? (
                  <TransactionErrorState error={detailQuery.error} onRetry={() => void detailQuery.refetch()} compact />
                ) : selectedDispute ? (
                  <>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={selectedDispute.status} />
                      <span className="text-lg font-bold font-mono">
                        {formatMoney(selectedDispute.amount, selectedDispute.currencyCode)}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-lg border text-sm">
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Dispute ID</span>
                        <span className="font-mono">#{selectedDispute.id}</span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Reason Code</span>
                        <span className="font-medium">{selectedDispute.reasonCode?.replaceAll('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Filed</span>
                        <span>{formatDateTime(selectedDispute.filedAt)}</span>
                      </div>
                      {selectedDispute.filedBy && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Filed By</span>
                          <span>{selectedDispute.filedBy}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b px-4 py-3">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>{formatRelative(selectedDispute.lastUpdatedAt)}</span>
                      </div>
                      {selectedDispute.updatedBy && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Updated By</span>
                          <span>{selectedDispute.updatedBy}</span>
                        </div>
                      )}
                      {selectedDispute.assignedTo && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Assigned To</span>
                          <span>{selectedDispute.assignedTo}</span>
                        </div>
                      )}
                      {selectedDispute.contactEmail && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Contact Email</span>
                          <span>{selectedDispute.contactEmail}</span>
                        </div>
                      )}
                      {selectedDispute.contactPhone && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Contact Phone</span>
                          <span>{selectedDispute.contactPhone}</span>
                        </div>
                      )}
                      {selectedDispute.closedAt && (
                        <div className="flex justify-between border-b px-4 py-3">
                          <span className="text-muted-foreground">Closed At</span>
                          <span>{formatDateTime(selectedDispute.closedAt)}</span>
                        </div>
                      )}
                      {selectedDispute.closedBy && (
                        <div className="flex justify-between px-4 py-3">
                          <span className="text-muted-foreground">Closed By</span>
                          <span>{selectedDispute.closedBy}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
                      <p className="rounded-lg bg-muted/30 p-3 text-sm">{selectedDispute.description}</p>
                    </div>

                    {selectedDispute.responseNotes && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Response Notes</p>
                        <p className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-900/10">{selectedDispute.responseNotes}</p>
                      </div>
                    )}
                    {selectedDispute.escalationNotes && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Escalation Notes</p>
                        <p className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/10">{selectedDispute.escalationNotes}</p>
                      </div>
                    )}
                    {selectedDispute.closingNotes && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Closing Notes</p>
                        <p className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-900/10">{selectedDispute.closingNotes}</p>
                      </div>
                    )}

                    {selectedDispute.supportingDocumentIds && selectedDispute.supportingDocumentIds.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Supporting Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDispute.supportingDocumentIds.map((documentId) => (
                            <button
                              key={documentId}
                              onClick={() => void disputeApi.downloadSupportingDocument(documentId)}
                              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Document #{documentId}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {canManageDisputes && !['RESOLVED', 'REJECTED'].includes(selectedDispute.status) && (
                      <div className="flex flex-wrap gap-2 border-t pt-2">
                        {selectedDispute.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedDisputeId(null);
                              openAction('respond', selectedDispute);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Respond
                          </button>
                        )}
                        {['PENDING', 'UNDER_REVIEW'].includes(selectedDispute.status) && (
                          <button
                            onClick={() => {
                              setSelectedDisputeId(null);
                              openAction('escalate', selectedDispute);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                            Escalate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedDisputeId(null);
                            openAction('close', selectedDispute);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          <XCircle className="h-4 w-4" />
                          Close
                        </button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              <div className="sticky bottom-0 flex justify-end border-t bg-card px-6 py-3">
                <button onClick={() => setSelectedDisputeId(null)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {actionType && actionDispute && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setActionType(null)} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-xl">
              <h3 className="text-lg font-semibold">
                {actionType === 'respond' ? 'Respond to Dispute' : actionType === 'escalate' ? 'Escalate Dispute' : 'Close Dispute'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {actionDispute.disputeRef} — {formatMoney(actionDispute.amount, actionDispute.currencyCode)}
              </p>

              {actionType === 'close' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                  <div className="flex gap-2">
                    {(['RESOLVED', 'REJECTED'] as const).map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() => setCloseOutcome(outcome)}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                          closeOutcome === outcome
                            ? outcome === 'RESOLVED'
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-red-600 bg-red-600 text-white'
                            : 'hover:bg-muted',
                        )}
                      >
                        {outcome === 'RESOLVED' ? 'Resolve in Favor' : 'Reject Dispute'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {actionType === 'respond' ? 'Response Notes' : actionType === 'escalate' ? 'Escalation Notes' : 'Closing Notes'}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(event) => setActionNotes(event.target.value)}
                  rows={4}
                  placeholder="Enter notes..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setActionType(null)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={() => void executeAction()}
                  disabled={!actionNotes.trim() || isActionPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isActionPending ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
                  {actionType === 'respond' ? 'Submit Response' : actionType === 'escalate' ? 'Escalate' : 'Close Dispute'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
