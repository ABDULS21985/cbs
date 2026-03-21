import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, X, AlertTriangle, CheckCircle, Clock, Eye, MessageSquare, ArrowUpCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useDisputes } from '../hooks/useDisputes';
import { DisputeTrackingTable } from '../components/disputes/DisputeTrackingTable';
import type { DisputeRecord } from '../api/disputeApi';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

function DashboardCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn('p-1.5 rounded-lg', color)}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

type ActionType = 'respond' | 'escalate' | 'close' | null;

export function TransactionDisputePage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { disputes, dashboard, isLoading, respondMutation, escalateMutation, closeMutation } = useDisputes(statusFilter || undefined);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [actionDispute, setActionDispute] = useState<DisputeRecord | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [closeOutcome, setCloseOutcome] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');

  const dashboardCards = useMemo(
    () => [
      { label: 'Total Disputes', value: dashboard?.total ?? 0, icon: AlertTriangle, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' },
      { label: 'Pending Response', value: dashboard?.pendingResponse ?? 0, icon: Clock, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
      { label: 'Under Review', value: dashboard?.underReview ?? 0, icon: Eye, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
      { label: 'Escalated', value: dashboard?.escalated ?? 0, icon: ArrowUpCircle, color: 'bg-red-100 text-red-600 dark:bg-red-900/30' },
      { label: 'Resolved', value: dashboard?.resolved ?? 0, icon: CheckCircle, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
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
        await respondMutation.mutateAsync({ id: actionDispute.id, response: actionNotes });
        toast.success('Dispute moved to review');
      } else if (actionType === 'escalate') {
        await escalateMutation.mutateAsync({ id: actionDispute.id, notes: actionNotes });
        toast.success('Dispute escalated');
      } else if (actionType === 'close') {
        await closeMutation.mutateAsync({ id: actionDispute.id, response: closeOutcome, notes: actionNotes });
        toast.success(`Dispute ${closeOutcome.toLowerCase()}`);
      }
      setActionType(null);
      setActionDispute(null);
    } catch {
      toast.error('Failed to update dispute');
    }
  };

  const isActionPending = respondMutation.isPending || escalateMutation.isPending || closeMutation.isPending;

  return (
    <>
      <PageHeader
        title="Transaction Disputes"
        subtitle="Track open disputes, respond to cases, and close investigations."
      />

      <div className="page-container space-y-5">
        {/* Dashboard Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          {dashboardCards.map((card) => (
            <DashboardCard key={card.label} {...card} />
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Disputes Table */}
        <DisputeTrackingTable
          disputes={disputes}
          isLoading={isLoading}
          onView={setSelectedDispute}
          onRespond={(dispute) => openAction('respond', dispute)}
          onEscalate={(dispute) => openAction('escalate', dispute)}
          onClose={(dispute) => openAction('close', dispute)}
        />
      </div>

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setSelectedDispute(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-2xl border bg-card shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDispute.disputeRef}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Transaction: {selectedDispute.transactionRef}</p>
                </div>
                <button onClick={() => setSelectedDispute(null)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 space-y-4">
                {/* Status & Amount */}
                <div className="flex items-center gap-4">
                  <StatusBadge status={selectedDispute.status} />
                  <span className="text-lg font-bold font-mono">{formatMoney(selectedDispute.amount, selectedDispute.currencyCode)}</span>
                </div>

                {/* Detail Grid */}
                <div className="rounded-lg border divide-y text-sm">
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Dispute ID</span><span className="font-mono">#{selectedDispute.id}</span></div>
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Reason Code</span><span className="font-medium">{selectedDispute.reasonCode?.replace(/_/g, ' ')}</span></div>
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Filed</span><span>{formatDateTime(selectedDispute.filedAt)}</span></div>
                  {selectedDispute.filedBy && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Filed By</span><span>{selectedDispute.filedBy}</span></div>}
                  <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Last Updated</span><span>{formatRelative(selectedDispute.lastUpdatedAt)}</span></div>
                  {selectedDispute.assignedTo && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Assigned To</span><span>{selectedDispute.assignedTo}</span></div>}
                  {selectedDispute.contactEmail && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Contact Email</span><span>{selectedDispute.contactEmail}</span></div>}
                  {selectedDispute.contactPhone && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Contact Phone</span><span>{selectedDispute.contactPhone}</span></div>}
                  {selectedDispute.closedAt && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Closed At</span><span>{formatDateTime(selectedDispute.closedAt)}</span></div>}
                  {selectedDispute.closedBy && <div className="px-4 py-3 flex justify-between"><span className="text-muted-foreground">Closed By</span><span>{selectedDispute.closedBy}</span></div>}
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{selectedDispute.description}</p>
                </div>

                {/* Notes sections */}
                {selectedDispute.responseNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Response Notes</p>
                    <p className="text-sm bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3">{selectedDispute.responseNotes}</p>
                  </div>
                )}
                {selectedDispute.escalationNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Escalation Notes</p>
                    <p className="text-sm bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">{selectedDispute.escalationNotes}</p>
                  </div>
                )}
                {selectedDispute.closingNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Closing Notes</p>
                    <p className="text-sm bg-green-50 dark:bg-green-900/10 rounded-lg p-3">{selectedDispute.closingNotes}</p>
                  </div>
                )}

                {/* Supporting Documents */}
                {selectedDispute.supportingDocumentIds && selectedDispute.supportingDocumentIds.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Supporting Documents</p>
                    <div className="flex gap-2">
                      {selectedDispute.supportingDocumentIds.map(docId => (
                        <span key={docId} className="text-xs px-2 py-1 bg-muted rounded-md font-mono">Doc #{docId}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!['RESOLVED', 'REJECTED'].includes(selectedDispute.status) && (
                  <div className="flex gap-2 pt-2 border-t">
                    {selectedDispute.status === 'PENDING' && (
                      <button onClick={() => { setSelectedDispute(null); openAction('respond', selectedDispute); }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        <MessageSquare className="w-4 h-4" /> Respond
                      </button>
                    )}
                    {['PENDING', 'UNDER_REVIEW'].includes(selectedDispute.status) && (
                      <button onClick={() => { setSelectedDispute(null); openAction('escalate', selectedDispute); }}
                        className="flex items-center gap-2 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20">
                        <ArrowUpCircle className="w-4 h-4" /> Escalate
                      </button>
                    )}
                    <button onClick={() => { setSelectedDispute(null); openAction('close', selectedDispute); }}
                      className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
                      <XCircle className="w-4 h-4" /> Close
                    </button>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-card border-t px-6 py-3 flex justify-end">
                <button onClick={() => setSelectedDispute(null)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action Dialog */}
      {actionType && actionDispute && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setActionType(null)} />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl space-y-4">
              <h3 className="font-semibold text-lg">
                {actionType === 'respond' ? 'Respond to Dispute' : actionType === 'escalate' ? 'Escalate Dispute' : 'Close Dispute'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {actionDispute.disputeRef} — {formatMoney(actionDispute.amount, actionDispute.currencyCode)}
              </p>

              {actionType === 'close' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                  <div className="flex gap-2">
                    {(['RESOLVED', 'REJECTED'] as const).map(outcome => (
                      <button key={outcome} onClick={() => setCloseOutcome(outcome)}
                        className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                          closeOutcome === outcome
                            ? outcome === 'RESOLVED' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                            : 'hover:bg-muted')}>
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
                <textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)}
                  rows={4} placeholder="Enter notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setActionType(null)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button onClick={() => void executeAction()}
                  disabled={!actionNotes.trim() || isActionPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {isActionPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
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
