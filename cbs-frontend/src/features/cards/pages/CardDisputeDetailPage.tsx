import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock, Loader2, ChevronRight,
  FileText, Send, Shield, ArrowUpRight, MessageSquare, X,
  CreditCard, User, Building2, Scale,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, InfoGrid, EmptyState } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCardDispute } from '../hooks/useCardsExt';
import { cardsApi } from '../api/cardExtApi';
import type { CardDispute, DisputeTimeline } from '../types/cardExt';

// ─── SLA Countdown ──────────────────────────────────────────────────────────

function SlaCountdown({ deadline, breached }: { deadline: string; breached: boolean }) {
  const remaining = useMemo(() => {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  }, [deadline]);

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold',
      breached ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    )}>
      <Clock className="w-3 h-3" />
      SLA: {remaining}
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function TimelineView({ events }: { events: DisputeTimeline[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No timeline events recorded.</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-3 h-3 rounded-full border-2 flex-shrink-0',
              i === 0 ? 'bg-primary border-primary' : 'bg-background border-border',
            )} />
            {i < events.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
          </div>
          <div className="pb-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{event.action}</p>
              <span className="text-xs text-muted-foreground">by {event.actor}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(event.timestamp)}</p>
            {event.notes && <p className="text-xs text-muted-foreground mt-1 bg-muted/30 px-2 py-1 rounded">{event.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Resolve Form ─────────────────────────────────────────────────────────────

function ResolveForm({ dispute, onClose }: { dispute: CardDispute; onClose: () => void }) {
  const [resolutionType, setResolutionType] = useState('REFUND');
  const [amount, setAmount] = useState(dispute.disputeAmount);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Dispute ${dispute.disputeRef} resolved as ${resolutionType}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Resolve Dispute</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Resolution Type</label>
            <select value={resolutionType} onChange={(e) => setResolutionType(e.target.value)} className="w-full mt-1 input">
              <option value="REFUND">Full Refund</option>
              <option value="PARTIAL">Partial Refund</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Resolution Amount</label>
            <input type="number" className="w-full mt-1 input" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} min={0} step="0.01" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full mt-1 input h-20 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resolution notes..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Resolve</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Note Form ────────────────────────────────────────────────────────────

function AddNoteSection() {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!note.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      toast.success('Note added to dispute');
      setNote('');
      setSubmitting(false);
    }, 500);
  };

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Communication Log
      </h3>
      <div className="flex gap-2">
        <textarea
          className="flex-1 input h-16 resize-none text-sm"
          placeholder="Add a note to this dispute..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={handleSubmit}
          disabled={!note.trim() || submitting}
          className="self-end px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CardDisputeDetailPage() {
  const { disputeId = '' } = useParams<{ disputeId: string }>();
  const id = parseInt(disputeId, 10);
  useEffect(() => { document.title = `Dispute #${disputeId} | CBS`; }, [disputeId]);

  const { data: dispute, isLoading } = useCardDispute(id);
  const [showResolve, setShowResolve] = useState(false);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/cards/disputes" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!dispute) {
    return (
      <>
        <PageHeader title="Dispute Not Found" backTo="/cards/disputes" />
        <div className="page-container">
          <EmptyState title="Dispute not found" description={`No dispute found with ID "${disputeId}".`} />
        </div>
      </>
    );
  }

  return (
    <>
      {showResolve && <ResolveForm dispute={dispute} onClose={() => setShowResolve(false)} />}

      <PageHeader
        title={dispute.disputeRef}
        subtitle={`Filed ${formatDate(dispute.createdAt)}`}
        backTo="/cards/disputes"
      />

      <div className="page-container space-y-6">
        {/* Header bar with status + amount + SLA */}
        <div className="flex items-center gap-4 flex-wrap">
          <StatusBadge status={dispute.status} />
          <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            {formatMoney(dispute.disputeAmount, dispute.disputeCurrency)}
          </span>
          {dispute.filingDeadline && (
            <SlaCountdown deadline={dispute.filingDeadline} breached={dispute.isSlaBreached} />
          )}
          {dispute.disputeType && <StatusBadge status={dispute.disputeType} />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute Summary Card */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Dispute Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Customer
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Customer ID:</span>
                      <p className="font-medium">{dispute.customerId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Card:</span>
                      <p className="font-mono font-medium">
                        <Link to={`/cards/${dispute.cardId}`} className="text-primary hover:underline">
                          Card #{dispute.cardId}
                        </Link>
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Account:</span>
                      <p className="font-medium">#{dispute.accountId}</p>
                    </div>
                    {dispute.cardScheme && (
                      <div>
                        <span className="text-muted-foreground text-xs">Scheme:</span>
                        <p className="font-medium">{dispute.cardScheme}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Transaction
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Date:</span>
                      <p className="font-medium">{formatDate(dispute.transactionDate)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Merchant:</span>
                      <p className="font-medium">
                        {dispute.merchantId ? (
                          <Link to={`/cards/merchants/${dispute.merchantId}`} className="text-primary hover:underline flex items-center gap-1">
                            {dispute.merchantName} <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          dispute.merchantName ?? '—'
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Amount:</span>
                      <p className="font-mono font-medium">{formatMoney(dispute.transactionAmount, dispute.transactionCurrency)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Ref:</span>
                      <p className="font-mono text-xs">{dispute.transactionRef}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Reason:</span>
                      <p className="font-medium">{dispute.disputeReason}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provisional credit */}
              {dispute.provisionalCreditAmount > 0 && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">Provisional Credit:</span>
                  <span className="font-mono font-bold">{formatMoney(dispute.provisionalCreditAmount, dispute.disputeCurrency)}</span>
                  {dispute.provisionalCreditDate && <span className="text-xs text-muted-foreground">on {formatDate(dispute.provisionalCreditDate)}</span>}
                  {dispute.provisionalCreditReversed && <span className="text-xs text-red-500 font-medium">(Reversed)</span>}
                </div>
              )}

              {/* Resolution */}
              {dispute.resolutionType && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resolution</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground text-xs">Type:</span><p className="font-medium">{dispute.resolutionType}</p></div>
                    <div><span className="text-muted-foreground text-xs">Amount:</span><p className="font-mono font-medium">{formatMoney(dispute.resolutionAmount, dispute.disputeCurrency)}</p></div>
                    <div><span className="text-muted-foreground text-xs">Date:</span><p className="font-medium">{dispute.resolutionDate ? formatDate(dispute.resolutionDate) : '—'}</p></div>
                  </div>
                  {dispute.resolutionNotes && <p className="text-xs text-muted-foreground mt-2">{dispute.resolutionNotes}</p>}
                </div>
              )}

              {/* Merchant response */}
              {dispute.merchantResponse && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Merchant Response
                  </h4>
                  <p className="text-sm bg-muted/30 px-3 py-2 rounded">{dispute.merchantResponse}</p>
                  {dispute.merchantResponseDate && <p className="text-xs text-muted-foreground mt-1">Received: {formatDate(dispute.merchantResponseDate)}</p>}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Dispute Timeline</h3>
              <TimelineView events={dispute.timeline ?? []} />
            </div>

            {/* Communication log */}
            <AddNoteSection />
          </div>

          {/* Right column — Actions */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold">Actions</h3>

              {dispute.status === 'OPEN' && (
                <button
                  onClick={() => toast.success('Dispute moved to INVESTIGATING')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Scale className="w-4 h-4" /> Start Investigation
                </button>
              )}

              {(dispute.status === 'OPEN' || dispute.status === 'INVESTIGATING') && (
                <>
                  <button
                    onClick={() => toast.success('Chargeback request filed')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Request Chargeback
                  </button>

                  <button
                    onClick={() => setShowResolve(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Resolve
                  </button>

                  <button
                    onClick={() => toast.success('Dispute escalated')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" /> Escalate
                  </button>
                </>
              )}
            </div>

            {/* Key dates */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Key Dates</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filed</span>
                  <span className="font-medium">{formatDate(dispute.createdAt)}</span>
                </div>
                {dispute.filingDeadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filing Deadline</span>
                    <span className="font-medium">{formatDate(dispute.filingDeadline)}</span>
                  </div>
                )}
                {dispute.responseDeadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Deadline</span>
                    <span className="font-medium">{formatDate(dispute.responseDeadline)}</span>
                  </div>
                )}
                {dispute.arbitrationDeadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Arbitration Deadline</span>
                    <span className="font-medium">{formatDate(dispute.arbitrationDeadline)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Assignment</h3>
              <div className="text-sm">
                <span className="text-muted-foreground">Assigned to: </span>
                <span className="font-medium">{dispute.assignedTo || 'Unassigned'}</span>
              </div>
              {dispute.schemeCaseId && (
                <div className="text-sm mt-2">
                  <span className="text-muted-foreground">Scheme Case: </span>
                  <span className="font-mono text-xs">{dispute.schemeCaseId}</span>
                </div>
              )}
            </div>

            {/* Evidence */}
            {dispute.evidenceDocuments && dispute.evidenceDocuments.length > 0 && (
              <div className="rounded-lg border bg-card p-5">
                <h3 className="text-sm font-semibold mb-3">Evidence Documents</h3>
                <ul className="space-y-1.5">
                  {dispute.evidenceDocuments.map((doc, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                      <FileText className="w-3.5 h-3.5" /> {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
