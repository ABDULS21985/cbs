import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, AlertTriangle, CreditCard, Shield, Scale, ArrowUpRight,
  CheckCircle2, X, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCardDispute,
  useProvisionalCredit,
  useFileChargeback,
  useSubmitRepresentment,
  useEscalateToArbitration,
  useResolveDispute,
} from '../hooks/useCardsExt';
import { DisputeWorkflow } from '../components/DisputeWorkflow';
import { DisputeTimelineView } from '../components/DisputeTimeline';
import type { DisputeStatus } from '../types/cardExt';
import { DISPUTE_STATUS_LABELS, isTerminalDisputeStatus } from '../types/cardExt';

const STATUS_COLORS: Record<string, string> = {
  INITIATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  INVESTIGATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CHARGEBACK_FILED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  REPRESENTMENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  PRE_ARBITRATION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ARBITRATION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RESOLVED_CUSTOMER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RESOLVED_MERCHANT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  WITHDRAWN: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

function InfoItem({ label, value, mono, red }: { label: string; value: string | number | null | undefined; mono?: boolean; red?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={cn('text-sm font-medium', mono && 'font-mono', red && 'text-red-600 dark:text-red-400')}>{value ?? '—'}</p>
    </div>
  );
}

function DeadlineItem({ label, date, breached }: { label: string; date: string | null | undefined; breached?: boolean }) {
  const d = date ? new Date(date) : null;
  const isPast = d && d < new Date();
  const isNear = d && !isPast && (d.getTime() - Date.now()) < 3 * 86400000;
  return (
    <div className={cn('rounded-lg border p-3', breached || isPast ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-900/40' : isNear ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/40' : '')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-medium mt-0.5', breached || isPast ? 'text-red-700 dark:text-red-400' : isNear ? 'text-amber-700 dark:text-amber-400' : '')}>{date ? formatDate(date) : '—'}</p>
      {(breached || isPast) && date && <p className="text-[10px] text-red-600 font-semibold mt-0.5">BREACHED</p>}
      {isNear && !isPast && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">DUE SOON</p>}
    </div>
  );
}

export function CardDisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Dispute Detail | CBS'; }, []);

  const { data: dispute, isLoading, isError, refetch } = useCardDispute(Number(disputeId));

  // Mutations
  const provisionalCredit = useProvisionalCredit();
  const fileChargeback = useFileChargeback();
  const submitRepresentment = useSubmitRepresentment();
  const escalateArbitration = useEscalateToArbitration();
  const resolveDispute = useResolveDispute();

  // Dialog states
  const [showChargeback, setShowChargeback] = useState(false);
  const [showRepresentment, setShowRepresentment] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [showArbitration, setShowArbitration] = useState(false);

  // Forms
  const [cbForm, setCbForm] = useState({ schemeCaseId: '', schemeReasonCode: '' });
  const [repForm, setRepForm] = useState({ merchantResponse: '' });
  const [resForm, setResForm] = useState({ resolutionType: 'CUSTOMER_FAVOR', resolutionAmount: 0, notes: '' });
  const [arbNotes, setArbNotes] = useState('');

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (isLoading) return (
    <><PageHeader title="Dispute Detail" backTo="/cards/disputes" />
      <div className="page-container"><div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div></div></>
  );

  if (isError || !dispute) return (
    <><PageHeader title="Dispute Not Found" backTo="/cards/disputes" />
      <div className="page-container"><div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center"><AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" /><p className="text-red-700 dark:text-red-400 font-medium">Dispute not found.</p></div></div></>
  );

  const status = dispute.status as DisputeStatus;
  const canCredit = (status === 'INITIATED' || status === 'INVESTIGATION') && !dispute.provisionalCreditAmount;
  const canChargeback = status === 'INVESTIGATION';
  const canRepresent = status === 'CHARGEBACK_FILED';
  const canArbitrate = status === 'REPRESENTMENT' || status === 'PRE_ARBITRATION';
  const canResolve = ['INVESTIGATION', 'REPRESENTMENT', 'PRE_ARBITRATION', 'ARBITRATION'].includes(status);
  const isTerminal = isTerminalDisputeStatus(status);

  return (
    <>
      <PageHeader title={dispute.disputeRef} subtitle={`${dispute.merchantName ?? 'Unknown Merchant'} · ${dispute.cardScheme}`}
        backTo="/cards/disputes"
        actions={<span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>{DISPUTE_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')}</span>} />

      <div className="page-container space-y-6">
        {/* Workflow stepper */}
        <div className="bg-card rounded-lg border p-6">
          <DisputeWorkflow currentStatus={status} timeline={dispute.timeline} />
        </div>

        {/* Info grid */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">Dispute Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            <InfoItem label="Dispute Ref" value={dispute.disputeRef} mono />
            <InfoItem label="Card ID" value={dispute.cardId} mono />
            <InfoItem label="Customer ID" value={dispute.customerId} />
            <InfoItem label="Account ID" value={dispute.accountId} />
            <InfoItem label="Transaction Ref" value={dispute.transactionRef} mono />
            <InfoItem label="Transaction Date" value={dispute.transactionDate ? formatDate(dispute.transactionDate) : null} />
            <InfoItem label="Transaction Amount" value={dispute.transactionAmount ? formatMoney(dispute.transactionAmount, dispute.transactionCurrency) : null} mono red />
            <InfoItem label="Merchant" value={dispute.merchantName} />
            <InfoItem label="Merchant ID" value={dispute.merchantId} mono />
            <InfoItem label="Card Scheme" value={dispute.cardScheme} />
            <InfoItem label="Dispute Type" value={(dispute.disputeType ?? '').replace(/_/g, ' ')} />
            <InfoItem label="Dispute Reason" value={dispute.disputeReason} />
            <InfoItem label="Disputed Amount" value={formatMoney(dispute.disputeAmount, dispute.disputeCurrency)} mono red />
            <InfoItem label="Scheme Case ID" value={dispute.schemeCaseId} mono />
            <InfoItem label="Scheme Reason Code" value={dispute.schemeReasonCode} mono />
            <InfoItem label="Assigned To" value={dispute.assignedTo} />
          </div>
        </div>

        {/* Deadlines */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> SLA Deadlines
            {dispute.isSlaBreached && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">SLA BREACHED</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DeadlineItem label="Filing Deadline" date={dispute.filingDeadline} />
            <DeadlineItem label="Response Deadline" date={dispute.responseDeadline} />
            <DeadlineItem label="Arbitration Deadline" date={dispute.arbitrationDeadline} />
          </div>
        </div>

        {/* Provisional Credit */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Provisional Credit</h3>
          {dispute.provisionalCreditAmount ? (
            <div className="flex items-center gap-4">
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-lg font-semibold font-mono text-green-600 dark:text-green-400">{formatMoney(dispute.provisionalCreditAmount, dispute.disputeCurrency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{dispute.provisionalCreditDate ? formatDate(dispute.provisionalCreditDate) : '—'}</p></div>
              {dispute.provisionalCreditReversed && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">REVERSED</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">No provisional credit issued.</p>
              {canCredit && (
                <button onClick={() => provisionalCredit.mutate({ id: dispute.id }, {
                  onSuccess: () => { toast.success('Provisional credit issued'); refetch(); },
                  onError: () => toast.error('Failed to issue credit'),
                })} disabled={provisionalCredit.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                  {provisionalCredit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                  Issue Provisional Credit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Resolution Summary (for resolved/closed) */}
        {isTerminal && dispute.resolutionType && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Resolution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem label="Resolution Type" value={(dispute.resolutionType ?? '').replace(/_/g, ' ')} />
              <InfoItem label="Resolution Amount" value={formatMoney(dispute.resolutionAmount, dispute.disputeCurrency)} mono />
              <InfoItem label="Resolution Date" value={dispute.resolutionDate ? formatDate(dispute.resolutionDate) : null} />
              <InfoItem label="Notes" value={dispute.resolutionNotes} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {canChargeback && (
              <button onClick={() => setShowChargeback(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                <Shield className="w-4 h-4" /> File Chargeback
              </button>
            )}
            {canRepresent && (
              <button onClick={() => setShowRepresentment(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
                <Scale className="w-4 h-4" /> Submit Representment
              </button>
            )}
            {canArbitrate && (
              <button onClick={() => setShowArbitration(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                <ArrowUpRight className="w-4 h-4" /> Escalate to Arbitration
              </button>
            )}
            {canResolve && (
              <button onClick={() => { setResForm({ resolutionType: 'CUSTOMER_FAVOR', resolutionAmount: dispute.disputeAmount, notes: '' }); setShowResolve(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" /> Resolve
              </button>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">Dispute Timeline</h3>
          <DisputeTimelineView events={dispute.timeline ?? []} />
        </div>
      </div>

      {/* ── Chargeback Dialog ──────────────────────────────────────────── */}
      {showChargeback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowChargeback(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">File Chargeback</h3><button onClick={() => setShowChargeback(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Scheme Case ID *</label>
              <input value={cbForm.schemeCaseId} onChange={e => setCbForm(p => ({ ...p, schemeCaseId: e.target.value }))} placeholder="e.g. VISA-CB-2026-001" className={fc} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Scheme Reason Code *</label>
              <input value={cbForm.schemeReasonCode} onChange={e => setCbForm(p => ({ ...p, schemeReasonCode: e.target.value }))} placeholder="e.g. 10.4" className={fc} /></div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowChargeback(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => fileChargeback.mutate({ id: dispute.id, ...cbForm }, { onSuccess: () => { toast.success('Chargeback filed'); setShowChargeback(false); refetch(); }, onError: () => toast.error('Failed') })}
                disabled={!cbForm.schemeCaseId || !cbForm.schemeReasonCode || fileChargeback.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
                {fileChargeback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Representment Dialog ───────────────────────────────────────── */}
      {showRepresentment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowRepresentment(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Submit Representment</h3><button onClick={() => setShowRepresentment(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Merchant Response *</label>
              <textarea value={repForm.merchantResponse} onChange={e => setRepForm(p => ({ ...p, merchantResponse: e.target.value }))} rows={4} className={fc} placeholder="Merchant's evidence and response..." /></div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowRepresentment(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => submitRepresentment.mutate({ id: dispute.id, ...repForm }, { onSuccess: () => { toast.success('Representment submitted'); setShowRepresentment(false); refetch(); }, onError: () => toast.error('Failed') })}
                disabled={!repForm.merchantResponse || submitRepresentment.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60">
                {submitRepresentment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />} Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Arbitration Dialog ────────────────────────────────────────── */}
      {showArbitration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowArbitration(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Escalate to Arbitration</h3><button onClick={() => setShowArbitration(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-muted-foreground">This will escalate the dispute to scheme arbitration. This is typically the last resort.</p>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={arbNotes} onChange={e => setArbNotes(e.target.value)} rows={3} className={fc} placeholder="Reason for escalation..." /></div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowArbitration(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => escalateArbitration.mutate({ id: dispute.id, preArbitration: status === 'REPRESENTMENT', notes: arbNotes }, { onSuccess: () => { toast.success(status === 'REPRESENTMENT' ? 'Escalated to pre-arbitration' : 'Escalated to arbitration'); setShowArbitration(false); refetch(); }, onError: () => toast.error('Failed') })}
                disabled={escalateArbitration.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {escalateArbitration.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Escalate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Dialog ────────────────────────────────────────────── */}
      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowResolve(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Resolve Dispute</h3><button onClick={() => setShowResolve(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Resolution Type *</label>
              <select value={resForm.resolutionType} onChange={e => setResForm(p => ({ ...p, resolutionType: e.target.value }))} className={fc}>
                <option value="CUSTOMER_FAVOR">Customer Favor</option>
                <option value="MERCHANT_FAVOR">Merchant Favor</option>
                <option value="SPLIT">Split</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Resolution Amount *</label>
              <input type="number" step="0.01" value={resForm.resolutionAmount || ''} onChange={e => setResForm(p => ({ ...p, resolutionAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} /></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={resForm.notes} onChange={e => setResForm(p => ({ ...p, notes: e.target.value }))} rows={3} className={fc} /></div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={() => setShowResolve(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => resolveDispute.mutate({ id: dispute.id, ...resForm }, { onSuccess: () => { toast.success('Dispute resolved'); setShowResolve(false); refetch(); }, onError: () => toast.error('Failed') })}
                disabled={!resForm.resolutionType || resolveDispute.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {resolveDispute.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
