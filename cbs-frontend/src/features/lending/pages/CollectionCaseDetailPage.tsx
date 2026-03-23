import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Phone, MessageSquare, Mail, FileText, MapPin, Handshake, DollarSign,
  ArrowUp, Gavel, StickyNote, Loader2, X, Plus, UserCheck, XCircle,
  AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge, StatCard } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  useCollectionCase,
  useLogCollectionAction,
  useAssignCase,
  useCloseCase,
} from '../hooks/useCollections';
import type { CollectionAction } from '../types/collections';

// ── Action Icons ─────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, React.ElementType> = {
  PHONE_CALL: Phone, SMS: MessageSquare, EMAIL: Mail, LETTER: FileText,
  FIELD_VISIT: MapPin, PROMISE_TO_PAY: Handshake, PAYMENT_RECEIVED: DollarSign,
  ESCALATION: ArrowUp, LEGAL_NOTICE: Gavel, LEGAL_FILING: Gavel,
  WRITE_OFF: XCircle, NOTE: StickyNote,
};

const ACTION_COLORS: Record<string, string> = {
  PHONE_CALL: 'bg-blue-100 text-blue-700', SMS: 'bg-green-100 text-green-700',
  EMAIL: 'bg-purple-100 text-purple-700', LETTER: 'bg-amber-100 text-amber-700',
  FIELD_VISIT: 'bg-teal-100 text-teal-700', PROMISE_TO_PAY: 'bg-indigo-100 text-indigo-700',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-700', ESCALATION: 'bg-red-100 text-red-700',
  LEGAL_NOTICE: 'bg-red-100 text-red-700', NOTE: 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-green-100 text-green-700',
};

// ── Action Timeline Entry ────────────────────────────────────────────────────

function ActionTimelineEntry({ action }: { action: CollectionAction }) {
  const Icon = ACTION_ICONS[action.actionType] ?? StickyNote;
  const color = ACTION_COLORS[action.actionType] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="flex gap-3 pb-4 border-l-2 border-border ml-3 pl-4 relative">
      <div className={cn('absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center shrink-0', color)}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', color)}>{action.actionType.replace(/_/g, ' ')}</span>
          <span className="text-xs text-muted-foreground">{formatDateTime(action.performedAt)}</span>
          <span className="text-xs text-muted-foreground">by {action.performedBy}</span>
        </div>
        <p className="text-sm mt-1">{action.description}</p>
        {action.outcome && <p className="text-xs text-muted-foreground mt-0.5">Outcome: <span className="font-medium">{action.outcome.replace(/_/g, ' ')}</span></p>}
        {action.promisedAmount != null && action.promisedAmount > 0 && (
          <div className="mt-1 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-xs inline-flex items-center gap-2">
            <Handshake className="w-3 h-3" />
            Promise: {formatMoney(action.promisedAmount)} by {action.promisedDate ? formatDate(action.promisedDate) : '—'}
            {action.promiseKept != null && (
              <span className={action.promiseKept ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {action.promiseKept ? '✓ Kept' : '✗ Broken'}
              </span>
            )}
          </div>
        )}
        {action.nextActionDate && (
          <p className="text-xs text-muted-foreground mt-1">Next: {action.nextActionType?.replace(/_/g, ' ')} on {formatDate(action.nextActionDate)}</p>
        )}
      </div>
    </div>
  );
}

// ── Log Action Form ──────────────────────────────────────────────────────────

function LogActionForm({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logAction = useLogCollectionAction();
  const [form, setForm] = useState({
    actionType: 'PHONE_CALL', description: '', outcome: '',
    promisedAmount: 0, promisedDate: '', contactNumber: '', contactPerson: '',
    nextActionDate: '', nextActionType: '',
  });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';
  const isPTP = form.actionType === 'PROMISE_TO_PAY';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logAction.mutate({ caseId, action: { ...form, performedBy: user?.displayName ?? 'Officer' } }, {
      onSuccess: () => { toast.success('Action logged'); onClose(); },
      onError: () => toast.error('Failed to log action'),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Log Action</h4>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Action Type</label>
          <select value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} className={fc}>
            {['PHONE_CALL', 'SMS', 'EMAIL', 'LETTER', 'FIELD_VISIT', 'PROMISE_TO_PAY', 'PAYMENT_RECEIVED', 'ESCALATION', 'LEGAL_NOTICE', 'NOTE'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-muted-foreground">Outcome</label>
          <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} className={fc}>
            <option value="">Select...</option>
            {['CONTACTED', 'NO_ANSWER', 'WRONG_NUMBER', 'PROMISED_PAYMENT', 'REFUSED', 'PARTIAL_PAYMENT', 'FULL_PAYMENT', 'ESCALATED', 'REFERRED_LEGAL'].map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select></div>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground">Description *</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={fc} required /></div>
      {isPTP && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded bg-indigo-50 dark:bg-indigo-900/20">
          <div><label className="text-xs font-medium">Promised Amount</label><input type="number" value={form.promisedAmount || ''} onChange={(e) => setForm({ ...form, promisedAmount: Number(e.target.value) })} className={fc} /></div>
          <div><label className="text-xs font-medium">Promised Date</label><input type="date" value={form.promisedDate} onChange={(e) => setForm({ ...form, promisedDate: e.target.value })} className={fc} /></div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground">Next Action Type</label>
          <select value={form.nextActionType} onChange={(e) => setForm({ ...form, nextActionType: e.target.value })} className={fc}><option value="">None</option>
            {['PHONE_CALL', 'SMS', 'EMAIL', 'FIELD_VISIT', 'LEGAL_NOTICE'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-muted-foreground">Next Action Date</label><input type="date" value={form.nextActionDate} onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })} className={fc} /></div>
      </div>
      <button type="submit" disabled={!form.description || logAction.isPending}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
        {logAction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Log Action
      </button>
    </form>
  );
}

// ── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({ caseId, currentAssignee, onClose }: { caseId: number; currentAssignee?: string; onClose: () => void }) {
  const assignCase = useAssignCase();
  const [assignedTo, setAssignedTo] = useState(currentAssignee ?? '');
  const [team, setTeam] = useState('');
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
        <h3 className="font-semibold">Assign Case</h3>
        <div><label className="text-xs font-medium text-muted-foreground">Assign To *</label><input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={fc} /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Team</label><input value={team} onChange={(e) => setTeam(e.target.value)} className={fc} placeholder="e.g. Collections Team A" /></div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
          <button onClick={() => assignCase.mutate({ caseId, assignedTo, team }, { onSuccess: () => { toast.success('Case assigned'); onClose(); } })}
            disabled={!assignedTo || assignCase.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg disabled:opacity-50">
            {assignCase.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function CollectionCaseDetailPage() {
  const { id } = useParams();
  const caseId = Number(id);
  const { data: caseData, isLoading, isError } = useCollectionCase(caseId);
  const closeCase = useCloseCase();
  const [showLogAction, setShowLogAction] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Collection Case" backTo="/lending/collections" />
        <div className="page-container flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading case...
        </div>
      </>
    );
  }

  if (isError || !caseData) {
    return (
      <>
        <PageHeader title="Case Not Found" backTo="/lending/collections" />
        <div className="page-container text-center py-20">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">The requested collection case could not be found.</p>
        </div>
      </>
    );
  }

  const c = caseData;
  const status = c.status ?? 'OPEN';
  const priority = c.priority ?? 'MEDIUM';
  const actions = c.actions ?? [];
  const dpdColor = c.dpd > 90 ? 'text-red-600' : c.dpd > 30 ? 'text-amber-600' : 'text-green-600';

  // Promise to Pay tracking
  const ptpActions = actions.filter((a) => a.actionType === 'PROMISE_TO_PAY' && a.promisedAmount);

  const handleClose = (resolutionType: string) => {
    closeCase.mutate({ caseId, resolutionType }, {
      onSuccess: () => toast.success('Case closed'),
      onError: () => toast.error('Failed to close case'),
    });
  };

  return (
    <>
      {showAssign && <AssignDialog caseId={caseId} currentAssignee={c.assignedTo} onClose={() => setShowAssign(false)} />}

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{c.caseNumber ?? `CASE-${c.id}`}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[priority])}>{priority}</span>
            <StatusBadge status={status} dot />
          </span>
        }
        subtitle={`${c.customerName} · Loan ${c.loanNumber}`}
        backTo="/lending/collections"
      />

      <div className="page-container space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Overdue Amount" value={c.overdueAmount ?? c.outstanding} format="money" compact icon={DollarSign} />
          <StatCard label="Total Outstanding" value={c.outstanding} format="money" compact icon={DollarSign} />
          <div className="surface-card p-4 flex flex-col items-center justify-center">
            <span className={cn('text-3xl font-bold', dpdColor)}>{c.dpd}</span>
            <span className="text-xs text-muted-foreground">Days Past Due</span>
          </div>
          <StatCard label="Escalation Level" value={c.escalationLevel ?? 0} format="number" icon={ArrowUp} />
          <div className="surface-card p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{c.bucket}</span>
            <span className="text-xs text-muted-foreground mt-1">DPD Bucket</span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          {!['CLOSED', 'WRITTEN_OFF'].includes(status) && (
            <>
              <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted"><UserCheck className="w-4 h-4" /> Assign</button>
              <button onClick={() => setShowLogAction(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4" /> Log Action</button>
              <button onClick={() => handleClose('PAID_IN_FULL')} disabled={closeCase.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border text-green-700 hover:bg-green-50">Close — Paid</button>
              <button onClick={() => handleClose('RESTRUCTURED')} disabled={closeCase.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border text-amber-700 hover:bg-amber-50">Close — Restructured</button>
            </>
          )}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info + Action Log */}
          <div className="lg:col-span-2 space-y-6">
            <InfoGrid columns={3} items={[
              { label: 'Case #', value: c.caseNumber ?? `CASE-${c.id}`, mono: true },
              { label: 'Loan #', value: c.loanNumber, mono: true },
              { label: 'Customer', value: c.customerName },
              { label: 'Assigned To', value: c.assignedTo ?? '—' },
              { label: 'Team', value: c.team ?? '—' },
              { label: 'Classification', value: c.classification },
              { label: 'DPD', value: c.dpd },
              { label: 'Currency', value: c.currency },
              { label: 'Overdue', value: formatMoney(c.overdueAmount ?? c.outstanding, c.currency) },
            ]} />

            {/* Linked loan */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Linked Loan</h3>
                <Link to={`/lending/${c.loanNumber}`} className="text-xs text-primary hover:underline flex items-center gap-1">View Loan <ChevronRight className="w-3 h-3" /></Link>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><span className="text-muted-foreground">Loan #:</span> <span className="font-mono">{c.loanNumber}</span></div>
                <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-mono">{formatMoney(c.outstanding, c.currency)}</span></div>
                <div><span className="text-muted-foreground">Bucket:</span> {c.bucket}</div>
              </div>
            </div>

            {/* Log action form */}
            {showLogAction && <LogActionForm caseId={caseId} onClose={() => setShowLogAction(false)} />}

            {/* Action timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Action Log ({actions.length} entries)</h3>
              {actions.length === 0 ? (
                <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">
                  No actions logged yet. Click "Log Action" to record the first contact attempt.
                </div>
              ) : (
                <div className="ml-3">
                  {[...actions].reverse().map((action) => (
                    <ActionTimelineEntry key={action.id} action={action} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Assignment */}
            <div className="surface-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Assignment</h4>
              <p className="text-sm font-medium">{c.assignedTo ?? 'Unassigned'}</p>
              {c.team && <p className="text-xs text-muted-foreground">{c.team}</p>}
              <button onClick={() => setShowAssign(true)} className="mt-2 text-xs text-primary hover:underline">Reassign</button>
            </div>

            {/* Promise to Pay Tracker */}
            {ptpActions.length > 0 && (
              <div className="surface-card p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Promise to Pay</h4>
                <div className="space-y-2">
                  {ptpActions.map((p) => (
                    <div key={p.id} className="rounded bg-muted/50 p-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-mono font-medium">{formatMoney(p.promisedAmount!)}</span>
                        <span className={p.promiseKept === true ? 'text-green-600 font-medium' : p.promiseKept === false ? 'text-red-600 font-medium' : 'text-amber-600'}>
                          {p.promiseKept === true ? 'KEPT' : p.promiseKept === false ? 'BROKEN' : 'PENDING'}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">Due: {p.promisedDate ? formatDate(p.promisedDate) : '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="surface-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Quick Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Case Opened</span><span>{c.createdAt ? formatDate(c.createdAt) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Actions Logged</span><span className="font-mono">{actions.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Contact</span><span>{c.lastActionDate ? formatDate(c.lastActionDate) : 'Never'}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Action</span>
                  <span className={c.nextActionDue && new Date(c.nextActionDue) < new Date() ? 'text-red-600 font-medium' : ''}>
                    {c.nextActionDue ? formatDate(c.nextActionDue) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
