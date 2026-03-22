import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert, AlertTriangle, Eye, FileWarning, ArrowUpRight, CheckCircle, XCircle,
  Loader2, X, Flame, Copy, Clock, Shield, User, FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useAmlAlert, useAmlCustomerAlerts,
  useAssignAmlAlert, useEscalateAmlAlert, useResolveAmlAlert,
  useFileSar, useDismissAmlAlert,
} from '../hooks/useAml';
import type { AmlAlertStatus, AmlSeverity } from '../types/aml';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white animate-pulse', HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};
const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', UNDER_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ESCALATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', SAR_FILED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600', CLOSED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function InfoItem({ label, value, mono, copyable, large, red }: { label: string; value: string | number | null | undefined; mono?: boolean; copyable?: boolean; large?: boolean; red?: boolean }) {
  const handleCopy = () => { if (value) { navigator.clipboard.writeText(String(value)); toast.success('Copied'); } };
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className={cn('text-sm', mono && 'font-mono', large && 'text-lg font-bold', red && 'text-red-600 dark:text-red-400')}>{value ?? '—'}</p>
        {copyable && value && <button onClick={handleCopy} className="p-0.5 rounded hover:bg-muted"><Copy className="w-3 h-3 text-muted-foreground" /></button>}
      </div>
    </div>
  );
}

function TimelineEvent({ icon: Icon, title, detail, time, color }: { icon: React.ElementType; title: string; detail?: string; time: string; color: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="w-px flex-1 bg-border my-1" />
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium">{title}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(time)}</p>
      </div>
    </div>
  );
}

export function AmlAlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useEffect(() => { document.title = 'AML Alert Detail | CBS'; }, []);

  const { data: alert, isLoading, isError, refetch } = useAmlAlert(Number(id));
  const { data: customerAlerts = [] } = useAmlCustomerAlerts(alert?.customerId ?? 0);

  // Mutations
  const assignAlert = useAssignAmlAlert();
  const escalateAlert = useEscalateAmlAlert();
  const resolveAlert = useResolveAmlAlert();
  const fileSar = useFileSar();
  const dismissAlert = useDismissAmlAlert();

  // Dialogs
  const [showAssign, setShowAssign] = useState(false);
  const [showSar, setShowSar] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [sarRef, setSarRef] = useState('');
  const [resForm, setResForm] = useState({ resolution: 'CLOSED', resolvedBy: 'ADMIN', resolutionNotes: '' });

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  const status = (alert?.status ?? '') as AmlAlertStatus;
  const severity = (alert?.severity ?? '') as AmlSeverity;
  const isTerminal = status === 'CLOSED' || status === 'FALSE_POSITIVE' || status === 'ARCHIVED';
  const relatedAlerts = customerAlerts.filter(a => a.id !== alert?.id).slice(0, 5);

  // Build investigation timeline from available data (must be before early returns)
  const timeline = useMemo(() => {
    if (!alert) return [];
    const events: { icon: React.ElementType; title: string; detail?: string; time: string; color: string }[] = [];
    events.push({ icon: Shield, title: 'Alert Created', detail: `Rule: ${alert.ruleName}`, time: alert.createdAt, color: 'bg-red-100 text-red-600 dark:bg-red-900/30' });
    if (alert.assignedTo) events.push({ icon: User, title: `Assigned to ${alert.assignedTo}`, time: alert.updatedAt, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' });
    if (status === 'ESCALATED' || status === 'SAR_FILED' || status === 'CLOSED') events.push({ icon: ArrowUpRight, title: 'Escalated', time: alert.updatedAt, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' });
    if (alert.sarReference) events.push({ icon: FileWarning, title: 'SAR Filed', detail: `Ref: ${alert.sarReference}`, time: alert.sarFiledDate ?? alert.updatedAt, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' });
    if (alert.resolvedAt) events.push({ icon: CheckCircle, title: `Resolved: ${alert.resolutionNotes ?? ''}`, detail: `By: ${alert.resolvedBy}`, time: alert.resolvedAt, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' });
    return events;
  }, [alert, status]);

  if (isLoading) return (
    <><PageHeader title="AML Alert" backTo="/compliance/aml" />
      <div className="page-container"><div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div></div></>
  );

  if (isError || !alert) return (
    <><PageHeader title="Alert Not Found" backTo="/compliance/aml" />
      <div className="page-container"><div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8 text-center"><ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" /><p className="text-sm text-red-700 dark:text-red-400 font-medium">AML alert not found.</p></div></div></>
  );

  return (
    <>
      <PageHeader
        title={alert.alertRef}
        backTo="/compliance/aml"
        actions={
          <div className="flex items-center gap-2">
            {(severity === 'HIGH' || severity === 'CRITICAL') && <Flame className="w-5 h-5 text-red-500" />}
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold', SEVERITY_COLORS[severity])}>{severity}</span>
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', STATUS_COLORS[status])}>{status.replace(/_/g, ' ')}</span>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Action bar */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-2 p-4 rounded-lg border bg-card">
            {(status === 'NEW' || status === 'UNDER_REVIEW') && (
              <>
                <button onClick={() => assignAlert.mutate({ id: alert.id, assignedTo: 'ADMIN' }, { onSuccess: () => { toast.success('Assigned to you'); refetch(); } })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                  <User className="w-3.5 h-3.5" /> Assign to Me
                </button>
                <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-muted">
                  <User className="w-3.5 h-3.5" /> Assign to...
                </button>
              </>
            )}
            {(status === 'NEW' || status === 'UNDER_REVIEW') && (
              <button onClick={() => escalateAlert.mutate(alert.id, { onSuccess: () => { toast.success('Alert escalated'); refetch(); } })}
                disabled={escalateAlert.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
              </button>
            )}
            {(status === 'UNDER_REVIEW' || status === 'ESCALATED') && (
              <button onClick={() => setShowSar(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700">
                <FileWarning className="w-3.5 h-3.5" /> File SAR
              </button>
            )}
            {['UNDER_REVIEW', 'ESCALATED', 'SAR_FILED'].includes(status) && (
              <button onClick={() => setShowResolve(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> Resolve
              </button>
            )}
            {(status === 'NEW' || status === 'UNDER_REVIEW') && (
              <button onClick={() => dismissAlert.mutate(alert.id, { onSuccess: () => { toast.success('Dismissed as false positive'); refetch(); } })}
                disabled={dismissAlert.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 border text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800">
                <XCircle className="w-3.5 h-3.5" /> Dismiss
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT — 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alert details */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-sm font-semibold mb-4">Alert Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <InfoItem label="Alert Ref" value={alert.alertRef} mono copyable />
                <InfoItem label="Status" value={status.replace(/_/g, ' ')} />
                <InfoItem label="Severity" value={severity} />
                <InfoItem label="Customer ID" value={alert.customerId} mono copyable />
                <InfoItem label="Customer Name" value={alert.customerName} />
                <InfoItem label="Account ID" value={alert.accountId} mono />
                <InfoItem label="Rule Name" value={alert.ruleName} />
                <InfoItem label="Category" value={alert.ruleCategory} />
                <InfoItem label="Alert Type" value={alert.alertType} />
                <InfoItem label="Trigger Amount" value={formatMoney(alert.triggerAmount)} mono large red={alert.triggerAmount > 100000} />
                <InfoItem label="Trigger Count" value={alert.triggerCount} />
                <InfoItem label="Trigger Period" value={alert.triggerPeriod} />
                <InfoItem label="Assigned To" value={alert.assignedTo ?? 'Unassigned'} />
                <InfoItem label="Created" value={formatDateTime(alert.createdAt)} />
                <InfoItem label="Updated" value={formatDateTime(alert.updatedAt)} />
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-sm font-semibold mb-3">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{alert.description || 'No description provided.'}</p>
            </div>

            {/* Triggered transactions */}
            {alert.triggerTransactions?.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-sm font-semibold mb-3">Triggered Transactions ({alert.triggerTransactions.length})</h3>
                <div className="space-y-2">
                  {alert.triggerTransactions.map((txn, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{txn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAR info */}
            {alert.sarReference && (
              <div className="bg-card rounded-lg border border-purple-200 dark:border-purple-900/40 p-6">
                <h3 className="text-sm font-semibold mb-3 text-purple-700 dark:text-purple-400">SAR Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InfoItem label="SAR Reference" value={alert.sarReference} mono copyable />
                  <InfoItem label="Filed Date" value={alert.sarFiledDate ? formatDate(alert.sarFiledDate) : null} />
                </div>
              </div>
            )}

            {/* Resolution */}
            {alert.resolvedAt && (
              <div className="bg-card rounded-lg border border-green-200 dark:border-green-900/40 p-6">
                <h3 className="text-sm font-semibold mb-3 text-green-700 dark:text-green-400">Resolution</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InfoItem label="Resolution Notes" value={alert.resolutionNotes} />
                  <InfoItem label="Resolved By" value={alert.resolvedBy} />
                  <InfoItem label="Resolved At" value={formatDateTime(alert.resolvedAt)} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — 1/3 */}
          <div className="space-y-6">
            {/* Investigation timeline */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-sm font-semibold mb-4">Investigation Timeline</h3>
              {timeline.map((e, i) => <TimelineEvent key={i} {...e} />)}
            </div>

            {/* Customer risk profile */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-sm font-semibold mb-3">Customer Risk Profile</h3>
              <div className="space-y-2 text-sm">
                <p><strong>{alert.customerName}</strong></p>
                <p className="text-muted-foreground">ID: {alert.customerId}</p>
                <p className="text-muted-foreground">Total AML Alerts: <strong className={customerAlerts.length > 3 ? 'text-red-600' : ''}>{customerAlerts.length}</strong></p>
                <Link to={`/compliance/aml?customerId=${alert.customerId}`} className="text-xs text-primary hover:underline">View all customer alerts →</Link>
              </div>
            </div>

            {/* Related alerts */}
            {relatedAlerts.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-sm font-semibold mb-3">Related Alerts</h3>
                <div className="space-y-2">
                  {relatedAlerts.map(a => (
                    <Link key={a.id} to={`/compliance/aml/alerts/${a.id}`} className="block p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary">{a.alertRef}</span>
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', SEVERITY_COLORS[a.severity])}>{a.severity}</span>
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[a.status])}>{a.status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(a.createdAt)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Assign Dialog ─────────────────────────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowAssign(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Assign Alert</h3><button onClick={() => setShowAssign(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <input value={assignTo} onChange={e => setAssignTo(e.target.value)} placeholder="Officer name or ID" className={fc} />
            <button onClick={() => assignAlert.mutate({ id: alert.id, assignedTo: assignTo }, { onSuccess: () => { toast.success('Assigned'); setShowAssign(false); refetch(); } })}
              disabled={!assignTo || assignAlert.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {assignAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />} Assign
            </button>
          </div>
        </div>
      )}

      {/* ── File SAR Dialog ───────────────────────────────────────────── */}
      {showSar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowSar(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold text-purple-700">File SAR</h3><button onClick={() => setShowSar(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <input value={sarRef} onChange={e => setSarRef(e.target.value)} placeholder="SAR Reference (e.g. SAR-2026-0001)" className={fc} />
            <button onClick={() => fileSar.mutate({ id: alert.id, sarReference: sarRef, filedBy: 'ADMIN' }, { onSuccess: () => { toast.success('SAR filed'); setShowSar(false); refetch(); } })}
              disabled={!sarRef || fileSar.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60">
              {fileSar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileWarning className="w-4 h-4" />} File SAR
            </button>
          </div>
        </div>
      )}

      {/* ── Resolve Dialog ────────────────────────────────────────────── */}
      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowResolve(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Resolve Alert</h3><button onClick={() => setShowResolve(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Resolution *</label>
              <select value={resForm.resolution} onChange={e => setResForm(p => ({ ...p, resolution: e.target.value }))} className={fc}>
                <option value="CLOSED">Closed</option>
                <option value="FALSE_POSITIVE">False Positive</option>
              </select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Notes *</label>
              <textarea value={resForm.resolutionNotes} onChange={e => setResForm(p => ({ ...p, resolutionNotes: e.target.value }))} rows={4} className={fc} placeholder="Resolution justification (required)" /></div>
            <button onClick={() => resolveAlert.mutate({ id: alert.id, ...resForm }, { onSuccess: () => { toast.success('Alert resolved'); setShowResolve(false); refetch(); } })}
              disabled={!resForm.resolutionNotes || resolveAlert.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              {resolveAlert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Resolve
            </button>
          </div>
        </div>
      )}
    </>
  );
}
