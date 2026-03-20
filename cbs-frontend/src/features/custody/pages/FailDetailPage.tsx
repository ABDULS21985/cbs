import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Clock, ArrowUpRight, ShieldAlert, Scale, CheckCircle2,
  Loader2, X, DollarSign,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api';
import {
  useEscalateSecuritiesFail,
  useBuyInSecuritiesFail,
  usePenaltySecuritiesFail,
  useResolveSecuritiesFail,
  useSecuritiesFailsDashboard,
} from '../hooks/useCustodyExt';
import type { SecuritiesFail } from '../types/securitiesFail';
import { FailWorkflow } from '../components/FailWorkflow';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ESCALATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BUY_IN_INITIATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function InfoItem({ label, value, mono, red, large }: { label: string; value: string | number | null | undefined; mono?: boolean; red?: boolean; large?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={cn('text-sm font-medium', mono && 'font-mono', red && 'text-red-600 dark:text-red-400', large && 'text-lg font-bold')}>{value ?? '—'}</p>
    </div>
  );
}

function agingColor(days: number) {
  if (days <= 2) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  if (days <= 10) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

export function FailDetailPage() {
  const { ref } = useParams<{ ref: string }>();
  useEffect(() => { document.title = `Fail ${ref} | CBS`; }, [ref]);

  // Fetch fail from dashboard (find by ref)
  const { data: dashboard, isLoading, refetch } = useSecuritiesFailsDashboard();
  const db = dashboard as Record<string, unknown> | undefined;
  const allFails = (db?.fails as SecuritiesFail[]) ?? [];
  const fail = allFails.find(f => f.failRef === ref);

  // Mutations
  const escalateMut = useEscalateSecuritiesFail();
  const buyInMut = useBuyInSecuritiesFail();
  const penaltyMut = usePenaltySecuritiesFail();
  const resolveMut = useResolveSecuritiesFail();

  // Dialogs
  const [showEscalate, setShowEscalate] = useState(false);
  const [showBuyIn, setShowBuyIn] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [penaltyRate, setPenaltyRate] = useState('0.01');
  const [resolveAction, setResolveAction] = useState('SETTLED_LATE');
  const [resolveNotes, setResolveNotes] = useState('');

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (isLoading) return (
    <><PageHeader title="Securities Fail" backTo="/custody/fails" />
      <div className="page-container"><div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div></div></>
  );

  if (!fail) return (
    <><PageHeader title="Fail Not Found" backTo="/custody/fails" />
      <div className="page-container"><div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center"><AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" /><p className="text-red-700 dark:text-red-400 font-medium">Securities fail not found.</p></div></div></>
  );

  const status = fail.status;
  const isResolved = status === 'RESOLVED';
  const canEscalate = status === 'OPEN';
  const canBuyIn = (status === 'OPEN' || status === 'ESCALATED') && fail.buyInEligible;
  const canPenalty = status === 'OPEN' || status === 'ESCALATED';
  const canResolve = status !== 'RESOLVED';

  // SLA warnings
  const buyInDeadlineDays = fail.buyInDeadline ? Math.ceil((new Date(fail.buyInDeadline).getTime() - Date.now()) / 86400000) : null;
  const showSlaWarning = fail.agingDays > 5 || (buyInDeadlineDays !== null && buyInDeadlineDays <= 2);

  return (
    <>
      <PageHeader title={fail.failRef} subtitle={`${fail.instrumentCode} — ${fail.counterpartyName}`} backTo="/custody/fails"
        actions={<span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', STATUS_COLORS[status] || 'bg-gray-100 text-gray-600')}>{status?.replace(/_/g, ' ')}</span>} />

      <div className="page-container space-y-6">
        {/* Workflow stepper */}
        <div className="bg-card rounded-lg border p-6">
          <FailWorkflow currentStatus={status} resolvedAt={fail.resolvedAt} failStartDate={fail.failStartDate} />
        </div>

        {/* SLA Warning */}
        {showSlaWarning && !isResolved && (
          <div className={cn('rounded-lg border-2 px-5 py-4 flex items-center gap-3',
            fail.agingDays > 10 || (buyInDeadlineDays !== null && buyInDeadlineDays <= 0)
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-amber-400 bg-amber-50 dark:bg-amber-900/20')}>
            <AlertTriangle className={cn('w-5 h-5 flex-shrink-0', fail.agingDays > 10 ? 'text-red-600' : 'text-amber-600')} />
            <div>
              {fail.agingDays > 5 && <p className="text-sm font-semibold text-red-700 dark:text-red-400">Fail aging: {fail.agingDays} days — escalation required</p>}
              {buyInDeadlineDays !== null && buyInDeadlineDays <= 2 && (
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Buy-in deadline in {buyInDeadlineDays <= 0 ? 'PAST' : `${buyInDeadlineDays} day(s)`}</p>
              )}
            </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">Fail Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            <InfoItem label="Fail Ref" value={fail.failRef} mono />
            <InfoItem label="Settlement Instruction" value={fail.settlementInstructionId} mono />
            <InfoItem label="Instrument" value={`${fail.instrumentCode} — ${fail.instrumentName}`} />
            <InfoItem label="ISIN" value={fail.isin} mono />
            <InfoItem label="Fail Type" value={fail.failType?.replace(/_/g, ' ')} />
            <InfoItem label="Counterparty" value={`${fail.counterpartyCode} — ${fail.counterpartyName}`} />
            <InfoItem label="Original Settlement" value={formatDate(fail.originalSettlementDate)} />
            <InfoItem label="Current Expected" value={formatDate(fail.currentExpectedDate)} />
            <InfoItem label="Fail Start Date" value={formatDate(fail.failStartDate)} />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Aging Days</p>
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold', agingColor(fail.agingDays))}>{fail.agingDays}d</span>
            </div>
            <InfoItem label="Aging Bucket" value={fail.agingBucket} />
            <InfoItem label="Quantity" value={fail.quantity?.toLocaleString()} mono />
            <InfoItem label="Amount" value={formatMoney(fail.amount, fail.currency)} mono large />
            <InfoItem label="Currency" value={fail.currency} />
            <InfoItem label="Penalty Accrued" value={fail.penaltyAccrued > 0 ? formatMoney(fail.penaltyAccrued) : '—'} mono red={fail.penaltyAccrued > 0} />
            <InfoItem label="Buy-In Eligible" value={fail.buyInEligible ? 'Yes' : 'No'} />
            <InfoItem label="Buy-In Deadline" value={fail.buyInDeadline ? formatDate(fail.buyInDeadline) : '—'} />
            <InfoItem label="Escalation Level" value={fail.escalationLevel || '—'} />
          </div>
        </div>

        {/* Resolution info (if resolved) */}
        {isResolved && (
          <div className="bg-card rounded-lg border border-green-200 dark:border-green-900/40 p-6">
            <h3 className="text-sm font-semibold mb-3 text-green-700 dark:text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Resolution</h3>
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label="Action" value={fail.resolutionAction?.replace(/_/g, ' ')} />
              <InfoItem label="Notes" value={fail.resolutionNotes} />
              <InfoItem label="Resolved At" value={fail.resolvedAt ? formatDateTime(fail.resolvedAt) : '—'} />
            </div>
          </div>
        )}

        {/* Penalty section */}
        {fail.penaltyAccrued > 0 && (
          <div className="bg-card rounded-lg border border-red-200 dark:border-red-900/40 p-6">
            <h3 className="text-sm font-semibold mb-3 text-red-700 dark:text-red-400 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Penalty Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label="Penalty Accrued" value={formatMoney(fail.penaltyAccrued)} mono red large />
              <InfoItem label="Aging Days" value={`${fail.agingDays} days`} />
              <InfoItem label="Fail Amount" value={formatMoney(fail.amount, fail.currency)} mono />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isResolved && (
          <div className="flex flex-wrap gap-2">
            {canEscalate && (
              <button onClick={() => setShowEscalate(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                <ArrowUpRight className="w-4 h-4" /> Escalate
              </button>
            )}
            {canBuyIn && (
              <button onClick={() => setShowBuyIn(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                <ShieldAlert className="w-4 h-4" /> Initiate Buy-In
              </button>
            )}
            {canPenalty && (
              <button onClick={() => setShowPenalty(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
                <Scale className="w-4 h-4" /> Calculate Penalty
              </button>
            )}
            {canResolve && (
              <button onClick={() => setShowResolve(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" /> Resolve
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Escalate Dialog ───────────────────────────────────────────── */}
      {showEscalate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEscalate(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Escalate Fail</h3><button onClick={() => setShowEscalate(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-muted-foreground">This will escalate the fail to the next level and notify the operations manager.</p>
            <button onClick={() => escalateMut.mutate(fail.failRef, { onSuccess: () => { toast.success('Fail escalated'); setShowEscalate(false); refetch(); }, onError: () => toast.error('Failed') })}
              disabled={escalateMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-60">
              {escalateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Escalate
            </button>
          </div>
        </div>
      )}

      {/* ── Buy-In Dialog ─────────────────────────────────────────────── */}
      {showBuyIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBuyIn(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-purple-700">Initiate Buy-In</h3><button onClick={() => setShowBuyIn(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
              <strong>Warning:</strong> Initiating a buy-in will purchase the securities on the open market at the counterparty's expense. This is irreversible.
            </div>
            <button onClick={() => buyInMut.mutate(fail.failRef, { onSuccess: () => { toast.success('Buy-in initiated'); setShowBuyIn(false); refetch(); }, onError: () => toast.error('Failed') })}
              disabled={buyInMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
              {buyInMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Confirm Buy-In
            </button>
          </div>
        </div>
      )}

      {/* ── Penalty Dialog ────────────────────────────────────────────── */}
      {showPenalty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPenalty(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Calculate Penalty</h3><button onClick={() => setShowPenalty(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Daily Rate (%)</label>
              <input type="number" step="0.001" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} className={cn(fc, 'font-mono')} /></div>
            <p className="text-xs text-muted-foreground">Penalty = {formatMoney(fail.amount)} × {penaltyRate}% × {fail.agingDays} days = <strong className="text-red-600">{formatMoney(fail.amount * (Number(penaltyRate) / 100) * fail.agingDays)}</strong></p>
            <button onClick={() => penaltyMut.mutate(fail.failRef, { onSuccess: () => { toast.success('Penalty calculated'); setShowPenalty(false); refetch(); }, onError: () => toast.error('Failed') })}
              disabled={penaltyMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
              {penaltyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />} Calculate
            </button>
          </div>
        </div>
      )}

      {/* ── Resolve Dialog ────────────────────────────────────────────── */}
      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowResolve(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Resolve Fail</h3><button onClick={() => setShowResolve(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Resolution Action *</label>
              <select value={resolveAction} onChange={e => setResolveAction(e.target.value)} className={fc}>
                <option value="SETTLED_LATE">Settled Late</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="BOUGHT_IN">Bought In</option>
                <option value="PARTIAL_DELIVERY">Partial Delivery</option>
              </select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={3} className={fc} placeholder="Resolution details..." /></div>
            <button onClick={() => resolveMut.mutate(fail.failRef, { onSuccess: () => { toast.success('Fail resolved'); setShowResolve(false); refetch(); }, onError: () => toast.error('Failed') })}
              disabled={resolveMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              {resolveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Resolve
            </button>
          </div>
        </div>
      )}
    </>
  );
}
