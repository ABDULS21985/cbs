import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatPercent, formatDate, formatDateTime } from '@/lib/formatters';
import {
  CheckCircle2, Clock, Loader2, Edit2,
  FileText, Banknote, Shield, BarChart2, History,
  ArrowDownLeft, ArrowUpRight, XCircle,
} from 'lucide-react';
import {
  useTreasuryDeal,
  useConfirmDeal,
  useSettleDeal,
  useAmendDeal,
  useDealAuditTrail,
} from '../hooks/useTreasury';
import type { TreasuryDeal, DealAuditEvent, AmendDealRequest } from '../api/tradingApi';

// ─── Lifecycle Timeline ─────────────────────────────────────────────────────

const LIFECYCLE_STEPS = ['BOOKED', 'CONFIRMED', 'SETTLED', 'MATURED'] as const;

const STEP_META: Record<string, { icon: React.ElementType; label: string }> = {
  BOOKED: { icon: FileText, label: 'Booked' },
  CONFIRMED: { icon: CheckCircle2, label: 'Confirmed' },
  SETTLED: { icon: Banknote, label: 'Settled' },
  MATURED: { icon: Clock, label: 'Matured' },
  CANCELLED: { icon: XCircle, label: 'Cancelled' },
};

function DealLifecycleTimeline({ deal }: { deal: TreasuryDeal }) {
  const isCancelled = deal.status === 'CANCELLED';
  const currentIdx = LIFECYCLE_STEPS.indexOf(deal.status as typeof LIFECYCLE_STEPS[number]);

  const getTimestamp = (step: string) => {
    if (step === 'BOOKED') return deal.bookedAt;
    if (step === 'CONFIRMED') return deal.confirmedAt;
    if (step === 'SETTLED') return deal.settledAt;
    return undefined;
  };

  const getUser = (step: string) => {
    if (step === 'BOOKED') return deal.createdBy;
    if (step === 'CONFIRMED') return (deal as any).confirmedBy;
    if (step === 'SETTLED') return (deal as any).settledBy;
    return undefined;
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />

        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = currentIdx >= idx;
          const isCurrent = deal.status === step;
          const ts = getTimestamp(step);
          const user = getUser(step);
          const StepIcon = STEP_META[step].icon;

          return (
            <div key={step} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-border text-muted-foreground',
                  isCurrent && 'ring-4 ring-primary/20 animate-pulse',
                )}
              >
                <StepIcon className="w-4.5 h-4.5" />
              </div>
              <p className={cn('text-xs font-medium mt-2', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                {STEP_META[step].label}
              </p>
              {ts && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(ts)}</p>
              )}
              {user && (
                <p className="text-[10px] text-muted-foreground">{user}</p>
              )}
            </div>
          );
        })}

        {/* Cancelled branch */}
        {isCancelled && (
          <div className="flex flex-col items-center relative z-10 flex-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-red-500 border-red-500 text-white">
              <XCircle className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs font-medium mt-2 text-red-600">Cancelled</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Deal Summary Card ──────────────────────────────────────────────────────

function DealSummaryCard({ deal }: { deal: TreasuryDeal }) {
  const items = [
    ['Deal Type', deal.type],
    ['Currency', deal.currency],
    ['Notional Amount', formatMoney(deal.amount, deal.currency)],
    ['Rate / Price', formatPercent(deal.rate)],
    ['Value Date', deal.valueDate ? formatDate(deal.valueDate) : deal.bookedAt ? formatDate(deal.bookedAt) : '—'],
    ['Maturity Date', deal.maturityDate ? formatDate(deal.maturityDate) : '—'],
    ['Desk', deal.deskName || deal.createdBy || '—'],
    ['Counterparty', deal.counterparty],
    ['Trader', deal.createdBy || '—'],
    ['Booked At', formatDateTime(deal.bookedAt)],
  ];

  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
        <div className="divide-y">
          {items.slice(0, 5).map(([label, value]) => (
            <div key={label} className="px-5 py-2.5 flex justify-between">
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
        <div className="divide-y">
          {items.slice(5).map(([label, value]) => (
            <div key={label} className="px-5 py-2.5 flex justify-between">
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cash Flows Tab ─────────────────────────────────────────────────────────

function CashFlowsTab({ deal }: { deal: TreasuryDeal }) {
  // Derive cash flows from deal legs
  const flows = [
    {
      date: deal.bookedAt,
      direction: 'PAY' as const,
      amount: deal.amount,
      currency: deal.currency,
      status: deal.status === 'SETTLED' ? 'SETTLED' : 'PROJECTED',
      label: 'Leg 1 — Principal',
    },
    ...(deal.maturityDate ? [{
      date: deal.maturityDate,
      direction: 'RECEIVE' as const,
      amount: deal.amount * (1 + deal.rate / 100),
      currency: deal.currency,
      status: 'PROJECTED' as const,
      label: 'Maturity — Principal + Interest',
    }] : []),
  ];

  return (
    <div className="p-6">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Direction</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/10">
                <td className="px-4 py-2.5 text-sm">{formatDate(f.date)}</td>
                <td className="px-4 py-2.5 text-sm">{f.label}</td>
                <td className="px-4 py-2.5">
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium',
                    f.direction === 'PAY' ? 'text-red-600' : 'text-green-600')}>
                    {f.direction === 'PAY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    {f.direction}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">{formatMoney(f.amount, f.currency)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={f.status} dot /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Confirmations Tab ──────────────────────────────────────────────────────

function ConfirmationsTab({ deal }: { deal: TreasuryDeal }) {
  return (
    <div className="p-6 space-y-4">
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Match Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Our Side</p>
            <StatusBadge status={deal.status === 'SETTLED' || deal.status === 'CONFIRMED' ? 'MATCHED' : 'UNMATCHED'} dot />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Counterparty</p>
            <StatusBadge status={deal.status === 'SETTLED' ? 'MATCHED' : 'PENDING'} dot />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">SWIFT Confirmation</h3>
        <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
{`:20:${deal.dealRef}
:22A:NEWT
:82A:/${deal.counterparty}
:87A:/OUR_BANK
:30T:${deal.bookedAt?.slice(0, 10)}
:30V:${deal.maturityDate ?? 'N/A'}
:36:${deal.rate}
:32B:${deal.currency}${deal.amount.toLocaleString()}
:57A:/NOSTRO_ACCOUNT`}
        </div>
      </div>
    </div>
  );
}

// ─── Settlement Tab ─────────────────────────────────────────────────────────

function SettlementTab({ deal }: { deal: TreasuryDeal }) {
  const steps = [
    { label: 'Instructions Sent', done: deal.status !== 'BOOKED', time: deal.confirmedAt },
    { label: 'Counterparty Acknowledged', done: deal.status === 'SETTLED', time: deal.settledAt },
    { label: 'Funds Settled', done: deal.status === 'SETTLED', time: deal.settledAt },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Settlement Instructions</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Nostro Account</p>
            <p className="font-medium">NOSTRO-{deal.currency}-001</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vostro Account</p>
            <p className="font-medium">VOSTRO-{deal.counterparty?.slice(0, 5)?.toUpperCase()}-001</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Settlement Currency</p>
            <p className="font-medium">{deal.currency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Settlement Amount</p>
            <p className="font-medium font-mono">{formatMoney(deal.amount, deal.currency)}</p>
          </div>
        </div>
      </div>

      {/* Settlement Status Timeline */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Settlement Progress</h3>
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border-2',
                  step.done ? 'bg-green-500 border-green-500 text-white' : 'bg-background border-border',
                )}>
                  {step.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('w-0.5 h-6 mt-1', step.done ? 'bg-green-500' : 'bg-border')} />
                )}
              </div>
              <div>
                <p className={cn('text-sm font-medium', step.done ? '' : 'text-muted-foreground')}>{step.label}</p>
                {step.time && <p className="text-xs text-muted-foreground">{formatDateTime(step.time)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Trail Tab ────────────────────────────────────────────────────────

function AuditTrailTab({ dealId }: { dealId: string }) {
  const { data: trail, isLoading } = useDealAuditTrail(dealId);

  if (isLoading) {
    return <div className="p-6"><div className="h-32 bg-muted/30 animate-pulse rounded-lg" /></div>;
  }

  const events: DealAuditEvent[] = trail?.events ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="rounded-lg border bg-card divide-y">
        {events.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">No audit trail available.</div>
        ) : (
          events.map((evt, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                {evt.event === 'BOOKED' && <FileText className="w-4 h-4 text-blue-500" />}
                {evt.event === 'CONFIRMED' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                {evt.event === 'SETTLED' && <Banknote className="w-4 h-4 text-green-500" />}
                {evt.event === 'AMENDED' && <Edit2 className="w-4 h-4 text-purple-500" />}
                {!['BOOKED', 'CONFIRMED', 'SETTLED', 'AMENDED'].includes(evt.event) && (
                  <History className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{evt.event}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(evt.timestamp)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{evt.details}</p>
                {evt.user && <p className="text-xs text-muted-foreground">By: {evt.user}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {trail?.lastAmendment && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 p-5 space-y-2">
          <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            Last Amendment ({trail.amendmentCount} total)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Previous Amount:</span>{' '}
              <span className="font-mono">{trail.lastAmendment.previousAmount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Previous Rate:</span>{' '}
              <span className="font-mono">{trail.lastAmendment.previousRate}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Reason:</span>{' '}
              {trail.lastAmendment.reason}
            </div>
            <div>
              <span className="text-muted-foreground">By:</span>{' '}
              {trail.lastAmendment.amendedBy} at {formatDateTime(trail.lastAmendment.amendedAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── P&L Tab ────────────────────────────────────────────────────────────────

function PnlTab({ deal }: { deal: TreasuryDeal }) {
  const realizedPnl = (deal as any).realizedPnl ?? 0;
  const unrealizedPnl = (deal as any).unrealizedPnl ?? 0;
  const accruedInterest = (deal as any).accruedInterest ?? 0;
  const mtmValue = deal.amount + unrealizedPnl;

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Realized P&L', value: realizedPnl, currency: deal.currency },
          { label: 'Unrealized P&L', value: unrealizedPnl, currency: deal.currency },
          { label: 'MTM Value', value: mtmValue, currency: deal.currency },
          { label: 'Accrued Interest', value: accruedInterest, currency: deal.currency },
        ].map(({ label, value, currency }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-semibold font-mono mt-1',
              value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '')}>
              {formatMoney(value, currency)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Amend Dialog ───────────────────────────────────────────────────────────

function AmendDealDialog({ deal, open, onClose }: { deal: TreasuryDeal; open: boolean; onClose: () => void }) {
  const amendDeal = useAmendDeal();
  const [form, setForm] = useState({
    newAmount: deal.amount,
    newRate: deal.rate,
    newMaturityDate: deal.maturityDate ?? '',
    reason: '',
  });

  if (!open) return null;

  const hasChanges = form.newAmount !== deal.amount ||
    form.newRate !== deal.rate ||
    form.newMaturityDate !== (deal.maturityDate ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.error('Amendment reason is required');
      return;
    }
    const data: AmendDealRequest = {
      reason: form.reason,
      amendedBy: 'current-user', // would come from auth context
    };
    if (form.newAmount !== deal.amount) data.newAmount = form.newAmount;
    if (form.newRate !== deal.rate) data.newRate = form.newRate;
    if (form.newMaturityDate !== (deal.maturityDate ?? '')) data.newMaturityDate = form.newMaturityDate;

    amendDeal.mutate({ id: deal.id, data }, {
      onSuccess: () => { toast.success('Deal amended successfully'); onClose(); },
      onError: () => toast.error('Failed to amend deal'),
    });
  };

  const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 border-border';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6">
          <h2 className="text-lg font-semibold mb-1">Amend Deal {deal.dealRef}</h2>
          <p className="text-xs text-muted-foreground mb-5">Changes are tracked in the audit trail.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={form.newAmount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, newAmount: parseFloat(e.target.value) || 0 }))} />
                {form.newAmount !== deal.amount && (
                  <p className="text-[10px] text-amber-600 mt-0.5">Was: {formatMoney(deal.amount, deal.currency)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Rate (%)</label>
                <input type="number" min="0" step="0.001" className={inputCls} value={form.newRate || ''}
                  onChange={(e) => setForm((f) => ({ ...f, newRate: parseFloat(e.target.value) || 0 }))} />
                {form.newRate !== deal.rate && (
                  <p className="text-[10px] text-amber-600 mt-0.5">Was: {formatPercent(deal.rate)}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Maturity Date</label>
              <input type="date" className={inputCls} value={form.newMaturityDate}
                onChange={(e) => setForm((f) => ({ ...f, newMaturityDate: e.target.value }))} />
              {form.newMaturityDate !== (deal.maturityDate ?? '') && (
                <p className="text-[10px] text-amber-600 mt-0.5">Was: {deal.maturityDate ? formatDate(deal.maturityDate) : '—'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Reason for Amendment *</label>
              <textarea className={cn(inputCls, 'min-h-[80px]')} placeholder="Explain the reason for this amendment..."
                value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>

            {hasChanges && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Changes Summary</p>
                <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                  {form.newAmount !== deal.amount && (
                    <li>Amount: {formatMoney(deal.amount, deal.currency)} → {formatMoney(form.newAmount, deal.currency)}</li>
                  )}
                  {form.newRate !== deal.rate && (
                    <li>Rate: {formatPercent(deal.rate)} → {formatPercent(form.newRate)}</li>
                  )}
                  {form.newMaturityDate !== (deal.maturityDate ?? '') && (
                    <li>Maturity: {deal.maturityDate ? formatDate(deal.maturityDate) : '—'} → {formatDate(form.newMaturityDate)}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!hasChanges || !form.reason.trim() || amendDeal.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {amendDeal.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Amend Deal
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export function DealDetailPage() {
  const { dealId } = useParams<{ dealId: string }>();
  const { data: deal, isLoading } = useTreasuryDeal(dealId ?? '');
  const confirmDeal = useConfirmDeal();
  const settleDeal = useSettleDeal();
  const [amendOpen, setAmendOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'confirm' | 'settle' | null>(null);

  const handleAction = async () => {
    if (!deal || !pendingAction) return;
    try {
      if (pendingAction === 'confirm') {
        await confirmDeal.mutateAsync(deal.id);
        toast.success('Deal confirmed');
      } else {
        await settleDeal.mutateAsync(deal.id);
        toast.success('Deal settled');
      }
    } catch {
      toast.error(`Failed to ${pendingAction} deal`);
    }
    setPendingAction(null);
  };

  if (isLoading) {
    return (
      <div className="page-container py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="page-container py-12 text-center">
        <p className="text-muted-foreground">Deal not found.</p>
        <Link to="/treasury/deals" className="text-primary text-sm hover:underline mt-2 inline-block">Back to Deals</Link>
      </div>
    );
  }

  const canConfirm = deal.status === 'BOOKED';
  const canSettle = deal.status === 'CONFIRMED';
  // Backend rejects amendments on SETTLED or MATURED deals (BusinessException DEAL_AMENDMENT_DENIED)
  const canAmend = deal.status !== 'SETTLED' && deal.status !== 'MATURED' && deal.status !== 'CANCELLED' && deal.status !== 'DEFAULTED';

  return (
    <>
      <PageHeader
        title={deal.dealRef}
        backTo="/treasury/deals"
        subtitle={`${deal.counterparty} · ${deal.type} · ${deal.status}`}
        actions={
          <div className="flex items-center gap-2">
            {canAmend && (
              <button onClick={() => setAmendOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                <Edit2 className="w-3.5 h-3.5" /> Amend
              </button>
            )}
            {canConfirm && (
              <button onClick={() => setPendingAction('confirm')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
              </button>
            )}
            {canSettle && (
              <button onClick={() => setPendingAction('settle')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                <Banknote className="w-3.5 h-3.5" /> Settle
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-5">
        {/* Lifecycle Timeline */}
        <div className="rounded-lg border bg-card">
          <DealLifecycleTimeline deal={deal} />
        </div>

        {/* Deal Summary */}
        <DealSummaryCard deal={deal} />

        {/* Tabs */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'cashflows',
              label: 'Cash Flows',
              icon: Banknote,
              content: <CashFlowsTab deal={deal} />,
            },
            {
              id: 'confirmations',
              label: 'Confirmations',
              icon: Shield,
              content: <ConfirmationsTab deal={deal} />,
            },
            {
              id: 'settlement',
              label: 'Settlement',
              icon: CheckCircle2,
              content: <SettlementTab deal={deal} />,
            },
            {
              id: 'audit',
              label: 'Audit Trail',
              icon: History,
              content: <AuditTrailTab dealId={deal.id} />,
            },
            {
              id: 'pnl',
              label: 'P&L',
              icon: BarChart2,
              content: <PnlTab deal={deal} />,
            },
          ]}
        />
      </div>

      {/* Amend Dialog */}
      <AmendDealDialog deal={deal} open={amendOpen} onClose={() => setAmendOpen(false)} />

      {/* Confirm/Settle Action Dialog */}
      {pendingAction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setPendingAction(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {pendingAction === 'confirm' ? 'Confirm Deal' : 'Settle Deal'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {pendingAction === 'confirm'
                  ? `Confirm deal ${deal.dealRef} with ${deal.counterparty} for ${formatMoney(deal.amount, deal.currency)}?`
                  : `Settle deal ${deal.dealRef}? Ensure all settlement instructions have been sent.`}
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setPendingAction(null)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleAction}
                  disabled={confirmDeal.isPending || settleDeal.isPending}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50',
                    pendingAction === 'confirm' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700',
                  )}>
                  {(confirmDeal.isPending || settleDeal.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {pendingAction === 'confirm' ? 'Confirm' : 'Settle'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
