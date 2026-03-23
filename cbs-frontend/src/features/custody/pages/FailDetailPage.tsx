import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, ShieldAlert, Scale, CheckCircle2,
  Loader2, X, Info,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useSecuritiesFail,
  useEscalateSecuritiesFail,
  useBuyInSecuritiesFail,
  usePenaltySecuritiesFail,
  useResolveSecuritiesFail,
} from '../hooks/useCustodyExt';
import { StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';

export function FailDetailPage() {
  const { ref = '' } = useParams<{ ref: string }>();
  useEffect(() => { document.title = `Fail ${ref} | CBS`; }, [ref]);

  const { data: fail, isLoading: failLoading } = useSecuritiesFail(ref);
  const escalateMut = useEscalateSecuritiesFail();
  const buyInMut = useBuyInSecuritiesFail();
  const penaltyMut = usePenaltySecuritiesFail();
  const resolveMut = useResolveSecuritiesFail();

  const [showEscalate, setShowEscalate] = useState(false);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [penaltyRate, setPenaltyRate] = useState('0.01');
  const [resolveAction, setResolveAction] = useState('RESUBMIT');
  const [resolveNotes, setResolveNotes] = useState('');

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (!ref) return (
    <><PageHeader title="Fail Not Found" backTo="/custody/fails" />
      <div className="page-container"><div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-400 font-medium">No fail reference provided.</p>
      </div></div></>
  );

  const isResolved = fail?.status === 'RESOLVED' || fail?.status === 'WRITTEN_OFF';

  return (
    <>
      <PageHeader title={ref} subtitle="Securities Fail Action Panel" backTo="/custody/fails" />

      <div className="page-container space-y-6">
        {/* Fail Details */}
        {failLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : fail ? (
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Fail Details</h3>
              <StatusBadge status={fail.status} dot />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Fail Ref</p><p className="font-mono font-medium">{fail.failRef}</p></div>
              <div><p className="text-xs text-muted-foreground">Fail Type</p><p className="font-medium">{fail.failType?.replace(/_/g, ' ')}</p></div>
              <div><p className="text-xs text-muted-foreground">Instrument</p><p className="font-medium">{fail.instrumentName || fail.instrumentCode || '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">ISIN</p><p className="font-mono text-xs">{fail.isin || '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Counterparty</p><p className="font-medium">{fail.counterpartyName || fail.counterpartyCode || '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-mono font-medium">{formatMoney(fail.amount ?? 0, fail.currency ?? 'USD')}</p></div>
              <div><p className="text-xs text-muted-foreground">Quantity</p><p className="font-mono">{fail.quantity ?? '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Aging</p><p className="font-medium">{fail.agingDays ?? 0}d ({fail.agingBucket?.replace(/_/g, ' ') ?? '--'})</p></div>
              <div><p className="text-xs text-muted-foreground">Original Settle Date</p><p>{fail.originalSettlementDate ? formatDate(fail.originalSettlementDate) : '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Fail Start Date</p><p>{fail.failStartDate ? formatDate(fail.failStartDate) : '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Escalation Level</p><p className="font-medium">{fail.escalationLevel?.replace(/_/g, ' ') ?? '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Penalty Accrued</p><p className="font-mono font-medium">{formatMoney(fail.penaltyAccrued ?? 0, fail.currency ?? 'USD')}</p></div>
              <div><p className="text-xs text-muted-foreground">Buy-In Eligible</p><p>{fail.buyInEligible ? 'Yes' : 'No'}</p></div>
              <div><p className="text-xs text-muted-foreground">Buy-In Deadline</p><p>{fail.buyInDeadline ? formatDate(fail.buyInDeadline) : '--'}</p></div>
              {fail.resolutionAction && <div><p className="text-xs text-muted-foreground">Resolution</p><p className="font-medium">{fail.resolutionAction.replace(/_/g, ' ')}</p></div>}
              {fail.resolvedAt && <div><p className="text-xs text-muted-foreground">Resolved At</p><p>{formatDate(fail.resolvedAt)}</p></div>}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Could not load fail details for <strong>{ref}</strong>.
            </p>
          </div>
        )}

        {/* Action panel */}
        <div className="surface-card p-6">
          <h3 className="text-sm font-semibold mb-4">Available Actions</h3>
          {isResolved ? (
            <p className="text-sm text-muted-foreground">This fail has been resolved. No further actions available.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowEscalate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                <ArrowUpRight className="w-4 h-4" /> Escalate
              </button>
              <button onClick={() => setShowBuyIn(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                <ShieldAlert className="w-4 h-4" /> Initiate Buy-In
              </button>
              <button onClick={() => setShowPenalty(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
                <Scale className="w-4 h-4" /> Calculate Penalty
              </button>
              <button onClick={() => setShowResolve(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" /> Resolve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escalate Dialog ───────────────────────────────────────────── */}
      {showEscalate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowEscalate(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Escalate Fail</h3><button onClick={() => setShowEscalate(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-muted-foreground">Escalate fail <strong>{ref}</strong> to the next level.</p>
            <button onClick={() => escalateMut.mutate(ref, {
              onSuccess: () => { toast.success('Fail escalated'); setShowEscalate(false); },
              onError: () => toast.error('Escalation failed'),
            })} disabled={escalateMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-60">
              {escalateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Escalate
            </button>
          </div>
        </div>
      )}

      {/* ── Buy-In Dialog ─────────────────────────────────────────────── */}
      {showBuyIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowBuyIn(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-purple-700">Initiate Buy-In</h3><button onClick={() => setShowBuyIn(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
              <strong>Warning:</strong> This will purchase securities on the open market at the counterparty's expense. Irreversible.
            </div>
            <button onClick={() => buyInMut.mutate(ref, {
              onSuccess: () => { toast.success('Buy-in initiated'); setShowBuyIn(false); },
              onError: () => toast.error('Buy-in failed'),
            })} disabled={buyInMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
              {buyInMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Confirm Buy-In
            </button>
          </div>
        </div>
      )}

      {/* ── Penalty Dialog ────────────────────────────────────────────── */}
      {showPenalty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowPenalty(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Calculate Penalty</h3><button onClick={() => setShowPenalty(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Daily Rate (%)</label>
              <input type="number" step="0.001" value={penaltyRate} onChange={(e) => setPenaltyRate(e.target.value)} className={cn(fc, 'font-mono')} />
            </div>
            <button onClick={() => penaltyMut.mutate({ ref, dailyRate: Number(penaltyRate) }, {
              onSuccess: () => { toast.success('Penalty calculated'); setShowPenalty(false); },
              onError: () => toast.error('Penalty calculation failed'),
            })} disabled={penaltyMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
              {penaltyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />} Calculate
            </button>
          </div>
        </div>
      )}

      {/* ── Resolve Dialog ────────────────────────────────────────────── */}
      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowResolve(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Resolve Fail</h3><button onClick={() => setShowResolve(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Resolution Action *</label>
              <select value={resolveAction} onChange={(e) => setResolveAction(e.target.value)} className={fc}>
                <option value="RESUBMIT">Resubmit</option>
                <option value="PARTIAL_SETTLEMENT">Partial Settlement</option>
                <option value="COUNTERPARTY_CHASE">Counterparty Chase</option>
                <option value="BUY_IN">Buy-In</option>
                <option value="SHAPE_INSTRUCTION">Shape Instruction</option>
                <option value="CANCEL_REISSUE">Cancel & Reissue</option>
                <option value="MANUAL_OVERRIDE">Manual Override</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} rows={3} className={fc} placeholder="Resolution details..." />
            </div>
            <button onClick={() => resolveMut.mutate({ ref, action: resolveAction, notes: resolveNotes }, {
              onSuccess: () => { toast.success('Fail resolved'); setShowResolve(false); },
              onError: () => toast.error('Resolution failed'),
            })} disabled={resolveMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              {resolveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolve
            </button>
          </div>
        </div>
      )}
    </>
  );
}
