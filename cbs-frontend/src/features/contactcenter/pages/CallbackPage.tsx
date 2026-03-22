import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Phone, Clock, CheckCircle2, XCircle, AlertTriangle,
  Plus, Loader2, X, Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiGet } from '@/lib/api';
import { useRequestCallback, useAttemptCallback } from '../hooks/useContactCenter';
import type { CallbackRequest } from '../types/contactRouting';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const URGENCY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function CallbackPage() {
  useEffect(() => { document.title = 'Callback Management | CBS'; }, []);
  const [statusFilter, setStatusFilter] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const { data: callbacks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['contact-center', 'callbacks', statusFilter],
    queryFn: () => apiGet<CallbackRequest[]>('/api/v1/contact-routing/callbacks'),
    staleTime: 15_000,
  });

  const requestCallback = useRequestCallback();
  const attemptCallback = useAttemptCallback();

  const filtered = useMemo(() => {
    if (!statusFilter) return callbacks;
    return callbacks.filter(c => c.status === statusFilter);
  }, [callbacks, statusFilter]);

  const pending = callbacks.filter(c => c.status === 'PENDING' || c.status === 'SCHEDULED').length;
  const scheduled = callbacks.filter(c => c.status === 'SCHEDULED').length;
  const completed = callbacks.filter(c => c.status === 'COMPLETED').length;
  const failed = callbacks.filter(c => c.status === 'FAILED' || c.status === 'EXPIRED').length;

  const [form, setForm] = useState({
    customerId: 0, callbackNumber: '', preferredTime: '',
    preferredLanguage: 'en', contactReason: 'GENERAL', urgency: 'MEDIUM',
  });

  const [attemptingId, setAttemptingId] = useState<number | null>(null);
  const [outcomeDialog, setOutcomeDialog] = useState<CallbackRequest | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState('ANSWERED');

  const handleAttempt = (cb: CallbackRequest) => {
    setSelectedOutcome('ANSWERED');
    setOutcomeDialog(cb);
  };

  const confirmAttempt = () => {
    if (!outcomeDialog) return;
    setAttemptingId(outcomeDialog.id);
    attemptCallback.mutate({ id: outcomeDialog.id, outcome: selectedOutcome }, {
      onSuccess: () => { toast.success(`Callback recorded as ${selectedOutcome}`); refetch(); setAttemptingId(null); setOutcomeDialog(null); },
      onError: () => { toast.error('Attempt failed'); setAttemptingId(null); },
    });
  };

  const handleSchedule = () => {
    requestCallback.mutate(form, {
      onSuccess: () => { toast.success('Callback scheduled'); setShowSchedule(false); refetch(); },
      onError: () => toast.error('Failed to schedule'),
    });
  };

  const columns = useMemo<ColumnDef<CallbackRequest, unknown>[]>(() => [
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="font-mono text-xs">#{row.original.customerId}</span> },
    { accessorKey: 'callbackNumber', header: 'Phone', cell: ({ row }) => <span className="font-mono text-sm">{row.original.callbackNumber || '—'}</span> },
    { accessorKey: 'preferredTime', header: 'Preferred Time', cell: ({ row }) => <span className="text-xs">{row.original.preferredTime ? formatDateTime(row.original.preferredTime) : '—'}</span> },
    { accessorKey: 'contactReason', header: 'Reason', cell: ({ row }) => <span className="text-xs">{row.original.contactReason?.replace(/_/g, ' ') || '—'}</span> },
    { accessorKey: 'urgency', header: 'Urgency', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', URGENCY_COLORS[row.original.urgency] || URGENCY_COLORS.MEDIUM)}>
        {row.original.urgency}
      </span>
    )},
    { accessorKey: 'attemptCount', header: 'Attempts', cell: ({ row }) => <span className="text-xs font-mono">{row.original.attemptCount}/{row.original.maxAttempts}</span> },
    { accessorKey: 'lastOutcome', header: 'Last Outcome', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.lastOutcome || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[row.original.status] || STATUS_COLORS.PENDING)}>
        {row.original.status}
      </span>
    )},
    { id: 'actions', header: 'Actions', cell: ({ row }) => {
      const canAttempt = row.original.status === 'PENDING' || row.original.status === 'SCHEDULED';
      return canAttempt ? (
        <button onClick={() => handleAttempt(row.original)} disabled={attemptingId === row.original.id}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
          {attemptingId === row.original.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
          Attempt
        </button>
      ) : null;
    }},
  ], [attemptingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="Callback Management" subtitle={`${pending} pending callback${pending !== 1 ? 's' : ''}`}
        actions={<button onClick={() => setShowSchedule(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Schedule Callback</button>} />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pending" value={pending} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Scheduled" value={scheduled} format="number" icon={Calendar} loading={isLoading} />
          <StatCard label="Completed" value={completed} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Failed / Expired" value={failed} format="number" icon={XCircle} loading={isLoading} />
        </div>

        <div className="flex flex-wrap gap-2">
          {['', 'PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40 border-border')}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-6 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700 dark:text-red-400 mb-3">Failed to load callbacks.</p>
            <button onClick={() => refetch()} className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700">Retry</button>
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="callbacks"
            emptyMessage="No callbacks found" pageSize={15} />
        )}
      </div>

      {/* Outcome Selection Dialog */}
      {outcomeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setOutcomeDialog(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-base font-semibold">Record Callback Outcome</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Customer #{outcomeDialog.customerId} — {outcomeDialog.callbackNumber}</p>
              </div>
              <button onClick={() => setOutcomeDialog(null)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {['ANSWERED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL'].map(o => (
                    <label key={o} className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium',
                      selectedOutcome === o ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                    )}>
                      <input type="radio" name="outcome" value={o} checked={selectedOutcome === o} onChange={() => setSelectedOutcome(o)} className="sr-only" />
                      {o === 'ANSWERED' && <CheckCircle2 className="w-4 h-4" />}
                      {o === 'NO_ANSWER' && <XCircle className="w-4 h-4" />}
                      {o === 'BUSY' && <AlertTriangle className="w-4 h-4" />}
                      {o === 'VOICEMAIL' && <Phone className="w-4 h-4" />}
                      {o.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <button onClick={() => setOutcomeDialog(null)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={confirmAttempt} disabled={attemptingId === outcomeDialog.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {attemptingId === outcomeDialog.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />} Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Callback Dialog */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowSchedule(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold">Schedule Callback</h2>
              <button onClick={() => setShowSchedule(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
                  <input type="number" value={form.customerId || ''} onChange={e => setForm(p => ({ ...p, customerId: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Phone Number *</label>
                  <input value={form.callbackNumber} onChange={e => setForm(p => ({ ...p, callbackNumber: e.target.value }))} placeholder="+234..." className={cn(fc, 'font-mono')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Preferred Date/Time</label>
                  <input type="datetime-local" value={form.preferredTime} onChange={e => setForm(p => ({ ...p, preferredTime: e.target.value }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Language</label>
                  <select value={form.preferredLanguage} onChange={e => setForm(p => ({ ...p, preferredLanguage: e.target.value }))} className={fc}>
                    <option value="en">English</option><option value="yo">Yoruba</option><option value="ha">Hausa</option><option value="ig">Igbo</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Reason</label>
                  <select value={form.contactReason} onChange={e => setForm(p => ({ ...p, contactReason: e.target.value }))} className={fc}>
                    {['GENERAL', 'ACCOUNT_INQUIRY', 'CARD_ISSUE', 'LOAN_INQUIRY', 'COMPLAINT', 'OTHER'].map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Urgency</label>
                  <div className="flex gap-2 mt-1">
                    {['LOW', 'MEDIUM', 'HIGH'].map(u => (
                      <label key={u} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium',
                        form.urgency === u ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                        <input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={() => setForm(p => ({ ...p, urgency: u }))} className="sr-only" />
                        {u}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setShowSchedule(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleSchedule} disabled={!form.customerId || !form.callbackNumber || requestCallback.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {requestCallback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />} Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
