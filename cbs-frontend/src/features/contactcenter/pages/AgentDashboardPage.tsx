import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Phone, PhoneCall, Clock, HeadphonesIcon, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { contactCenterApi } from '../api/contactCenterApi';
import type { ContactInteraction } from '../types/contactCenterExt';
import type { CallbackRequest } from '../types/contactRouting';
import { apiGet } from '@/lib/api';
import { contactRoutingApi } from '../api/contactRoutingApi';
import { useAuthStore } from '@/stores/authStore';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500', ON_CALL: 'bg-red-500', BUSY: 'bg-red-500',
  WRAP_UP: 'bg-amber-500', BREAK: 'bg-gray-400', OFFLINE: 'bg-gray-600',
};

// ─── Complete Interaction Form ──────────────────────────────────────────────

function CompleteInteractionForm({ interaction, onClose }: { interaction: ContactInteraction; onClose: () => void }) {
  const qc = useQueryClient();
  const [disposition, setDisposition] = useState('');
  const [sentiment, setSentiment] = useState('NEUTRAL');
  const [fcr, setFcr] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    contactCenterApi.completeInteraction(interaction.interactionId, disposition, sentiment, undefined, fcr).then(() => {
      toast.success('Interaction completed');
      qc.invalidateQueries({ queryKey: ['contact-center'] });
      onClose();
    }).catch(() => toast.error('Failed')).finally(() => setSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <h2 className="text-lg font-semibold mb-4">Complete Interaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Disposition</label>
            <input className="w-full mt-1 input" placeholder="e.g. Balance enquiry resolved" value={disposition} onChange={(e) => setDisposition(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Sentiment</label>
            <div className="flex gap-3">
              {[
                { val: 'POSITIVE', emoji: '😊', label: 'Positive' },
                { val: 'NEUTRAL', emoji: '😐', label: 'Neutral' },
                { val: 'NEGATIVE', emoji: '😡', label: 'Negative' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setSentiment(s.val)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors',
                    sentiment === s.val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-xs">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fcr" checked={fcr} onChange={(e) => setFcr(e.target.checked)} className="rounded border-input w-4 h-4" />
            <label htmlFor="fcr" className="text-sm font-medium">First Contact Resolution</label>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Notes</label>
            <textarea className="w-full mt-1 input h-16 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Completing...' : 'Complete'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AgentDashboardPage() {
  useEffect(() => { document.title = 'Agent Dashboard | CBS'; }, []);

  const qc = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [completeTarget, setCompleteTarget] = useState<ContactInteraction | null>(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['contact-center', 'agents'],
    queryFn: () => contactCenterApi.getAgentStates(),
    refetchInterval: 10_000,
  });

  const { data: myAgent } = useQuery({
    queryKey: ['contact-center', 'agents', 'me'],
    queryFn: () => contactCenterApi.getMyAgent(),
    staleTime: 30_000,
  });
  const currentAgent = myAgent ?? agents.find((a) => user && a.agentId.toLowerCase() === user.username?.toLowerCase());
  const currentAgentId = currentAgent?.agentId ?? null;
  const missingAgentMapping = Boolean(user) && agents.length > 0 && !currentAgent && myAgent === null;

  const { data: myQueue = [], isLoading: queueLoading, isError: queueError } = useQuery({
    queryKey: ['contact-center', 'agent-queue', currentAgentId],
    queryFn: () => apiGet<ContactInteraction[]>(`/api/v1/contact-center/interactions/agent/${currentAgentId}`),
    enabled: Boolean(currentAgentId),
    refetchInterval: 10_000,
  });

  const { data: myCallbacks = [], isError: callbacksError } = useQuery({
    queryKey: ['contact-center', 'agent-callbacks', currentAgentId],
    queryFn: () => apiGet<CallbackRequest[]>('/api/v1/contact-center/callbacks'),
    enabled: Boolean(currentAgentId),
    refetchInterval: 15_000,
  });

  const activeInteractions = myQueue.filter((i) => i.status === 'ACTIVE' || i.status === 'QUEUED');
  const completedToday = myQueue.filter((i) => i.status === 'COMPLETED');

  const handleStateChange = (newState: string) => {
    if (!currentAgentId) {
      toast.error('Authenticated user is not mapped to a contact-center agent record.');
      return;
    }
    contactCenterApi.updateAgentState(currentAgentId, newState).then(() => {
      toast.success(`State changed to ${newState}`);
      qc.invalidateQueries({ queryKey: ['contact-center', 'agents'] });
    }).catch(() => toast.error('Failed'));
  };

  const queueCols: ColumnDef<ContactInteraction, unknown>[] = [
    { accessorKey: 'interactionId', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.interactionId}</span> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm font-medium">#{row.original.customerId}</span> },
    { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
    { accessorKey: 'contactReason', header: 'Reason', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.contactReason}</span> },
    { accessorKey: 'waitTimeSec', header: 'Wait', cell: ({ row }) => <span className="font-mono text-xs">{fmtTime(row.original.waitTimeSec)}</span> },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          {row.original.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
          <StatusBadge status={row.original.status} />
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.status === 'ACTIVE' ? (
        <button
          onClick={() => setCompleteTarget(row.original)}
          className="text-xs text-primary hover:underline font-medium"
        >
          Complete
        </button>
      ) : null,
    },
  ];

  return (
    <>
      {completeTarget && <CompleteInteractionForm interaction={completeTarget} onClose={() => setCompleteTarget(null)} />}

      <PageHeader
        title="My Dashboard"
        subtitle="Your active queue, callbacks, and performance"
      />

      <div className="page-container space-y-6">
        {missingAgentMapping && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            The authenticated user is not mapped to a contact-center agent record. This page does not fall back to a hardcoded agent.
          </div>
        )}
        {(queueError || callbacksError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load one or more agent-specific backend feeds.
          </div>
        )}
        {/* Agent state + stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="stat-card">
            <div className="stat-label">My State</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('w-3 h-3 rounded-full', STATE_COLORS[currentAgent?.state ?? 'OFFLINE'])} />
              <select
                value={currentAgent?.state ?? 'OFFLINE'}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={!currentAgentId}
                className="text-sm font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'OFFLINE'].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <StatCard label="Active" value={activeInteractions.length} format="number" icon={PhoneCall} />
          <StatCard label="Completed" value={completedToday.length} format="number" icon={CheckCircle2} />
          <StatCard label="AHT" value={fmtTime(currentAgent?.avgHandleTimeSec ?? 0)} icon={Clock} />
          <StatCard label="FCR" value={currentAgent?.fcrPct ?? 0} format="percent" icon={HeadphonesIcon} />
          <StatCard label="Quality" value={`${currentAgent?.qualityScore ?? 0}/100`} icon={CheckCircle2} />
        </div>

        <TabsPage syncWithUrl tabs={[
          {
            id: 'queue',
            label: 'My Queue',
            badge: activeInteractions.length || undefined,
            content: (
              <div className="p-4">
                <DataTable
                  columns={queueCols}
                  data={myQueue}
                  isLoading={queueLoading}
                  enableGlobalFilter
                  emptyMessage={currentAgentId ? 'No interactions in your queue' : 'No contact-center agent mapping found for the authenticated user'}
                />
              </div>
            ),
          },
          {
            id: 'callbacks',
            label: 'My Callbacks',
            badge: myCallbacks.filter((c) => c.assignedAgentId === currentAgentId && c.status !== 'COMPLETED').length || undefined,
            content: (
              <div className="p-4">
                {myCallbacks.filter((c) => c.assignedAgentId === currentAgentId).length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">No callbacks assigned to you</div>
                ) : (
                  <div className="space-y-3">
                    {myCallbacks.filter((c) => c.assignedAgentId === currentAgentId).map((cb) => (
                      <div key={cb.id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Customer #{cb.customerId} — {cb.callbackNumber}</p>
                          <p className="text-xs text-muted-foreground">{cb.contactReason} · {formatDate(cb.preferredTime)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={cb.status} />
                          {cb.status !== 'COMPLETED' && cb.status !== 'FAILED' && (
                            <button
                              onClick={() => {
                                contactRoutingApi.attemptCallback(cb.id, 'ANSWERED')
                                  .then(() => { toast.success('Callback completed'); qc.invalidateQueries({ queryKey: ['contact-center'] }); })
                                  .catch(() => toast.error('Failed'));
                              }}
                              className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                            >
                              <Phone className="w-3 h-3 inline mr-1" /> Call
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            id: 'history',
            label: 'Today\'s History',
            badge: completedToday.length || undefined,
            content: (
              <div className="p-4">
                <DataTable
                  columns={queueCols.filter((c) => c.id !== 'actions')}
                  data={completedToday}
                  enableGlobalFilter
                  emptyMessage="No completed interactions today"
                />
              </div>
            ),
          },
        ]} />
      </div>
    </>
  );
}
