import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime, formatRelative } from '@/lib/formatters';
import {
  Phone, PhoneCall, Clock, Coffee, PhoneOff, Radio,
  Users, BarChart3, CheckCircle2, Award, AlertTriangle,
  MessageSquare, Loader2, X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { contactCenterApi, type AgentState } from '../api/contactCenterApi';
import { contactRoutingApi } from '../api/contactRoutingApi';
import type { ContactInteraction } from '../types/contactCenterExt';
import type { AgentState as RoutingAgentState } from '../types/contactRouting';
import { LiveIndicator } from '../components/LiveIndicator';
import { toast } from 'sonner';

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500', ON_CALL: 'bg-red-500', BUSY: 'bg-red-500',
  WRAP_UP: 'bg-amber-500', AFTER_CALL: 'bg-amber-500',
  BREAK: 'bg-gray-400', ON_BREAK: 'bg-gray-400',
  TRAINING: 'bg-blue-500', OFFLINE: 'bg-gray-600',
};

const STATE_ICONS: Record<string, typeof Phone> = {
  AVAILABLE: Phone, ON_CALL: PhoneCall, BUSY: PhoneCall,
  WRAP_UP: Clock, AFTER_CALL: Clock, BREAK: Coffee,
  ON_BREAK: Coffee, TRAINING: Radio, OFFLINE: PhoneOff,
};

const SENTIMENT_EMOJI: Record<string, string> = { POSITIVE: '😊', NEUTRAL: '😐', NEGATIVE: '😡' };

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtDuration(startIso: string): string {
  const ms = Date.now() - new Date(startIso).getTime();
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Interaction History Tab ──────────────────────────────────────────────────

function InteractionHistoryTab({ interactions, isLoading }: { interactions: ContactInteraction[]; isLoading: boolean }) {
  const [selectedInteraction, setSelectedInteraction] = useState<ContactInteraction | null>(null);

  const columns: ColumnDef<ContactInteraction, any>[] = [
    { accessorKey: 'startedAt', header: 'Time', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.startedAt ? formatRelative(row.original.startedAt) : '--'}</span> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.customerId}</span> },
    { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
    { accessorKey: 'handleTimeSec', header: 'Duration', cell: ({ row }) => <span className="font-mono text-sm" aria-label={`${Math.floor(row.original.handleTimeSec / 60)} minutes ${row.original.handleTimeSec % 60} seconds`}>{fmtTime(row.original.handleTimeSec)}</span> },
    { accessorKey: 'disposition', header: 'Disposition', cell: ({ row }) => <span className="text-xs">{row.original.disposition || '--'}</span> },
    { accessorKey: 'firstContactResolution', header: 'FCR', cell: ({ row }) => <span className={cn('text-xs font-medium', row.original.firstContactResolution ? 'text-green-600' : 'text-muted-foreground')}>{row.original.firstContactResolution ? 'Yes' : 'No'}</span> },
    { accessorKey: 'sentiment', header: 'Sentiment', cell: ({ row }) => <span title={row.original.sentiment}>{SENTIMENT_EMOJI[row.original.sentiment] || '—'}</span> },
  ];

  return (
    <div className="p-4 space-y-4">
      <DataTable
        columns={columns}
        data={interactions}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={(row) => setSelectedInteraction(row)}
        emptyMessage="No interactions today"
      />
      {selectedInteraction && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedInteraction(null)} />
          <div className="relative ml-auto w-full max-w-md bg-background border-l shadow-xl overflow-auto">
            <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
              <p className="text-sm font-medium">Interaction Details</p>
              <button onClick={() => setSelectedInteraction(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Channel</p><StatusBadge status={selectedInteraction.channel} /></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={selectedInteraction.status} dot /></div>
                <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-mono">{fmtTime(selectedInteraction.handleTimeSec)}</p></div>
                <div><p className="text-xs text-muted-foreground">Wait Time</p><p className="font-mono">{fmtTime(selectedInteraction.waitTimeSec)}</p></div>
                <div><p className="text-xs text-muted-foreground">Disposition</p><p className="font-medium">{selectedInteraction.disposition || '--'}</p></div>
                <div><p className="text-xs text-muted-foreground">Sentiment</p><p>{SENTIMENT_EMOJI[selectedInteraction.sentiment] || '—'} {selectedInteraction.sentiment}</p></div>
              </div>
              {selectedInteraction.notes && (
                <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{selectedInteraction.notes}</p></div>
              )}
              {selectedInteraction.recordingRef && (
                <div><p className="text-xs text-muted-foreground">Recording</p><p className="font-mono text-xs">{selectedInteraction.recordingRef}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skills Tab ───────────────────────────────────────────────────────────────

function SkillsTab({ agent }: { agent: RoutingAgentState }) {
  return (
    <div className="p-4 space-y-6">
      <div className="surface-card p-4">
        <p className="text-sm font-medium mb-3">Skill Groups</p>
        {agent.skillGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills assigned</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {agent.skillGroups.map((skill) => (
              <span key={skill} className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{skill}</span>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="text-sm font-medium mb-3">Languages</p>
        {agent.languages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No languages configured</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {agent.languages.map((lang) => (
              <span key={lang} className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted">{lang}</span>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-4">
        <p className="text-sm font-medium mb-3">Configuration</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Max Concurrent Chats</p><p className="font-bold text-lg">{agent.maxConcurrentChats}</p></div>
          <div><p className="text-xs text-muted-foreground">Active Chats</p><p className="font-bold text-lg">{agent.activeChatCount}</p></div>
          <div>
            <p className="text-xs text-muted-foreground">Shift</p>
            <p className="font-medium">{String(agent.shiftStart)} — {String(agent.shiftEnd)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quality Tab ──────────────────────────────────────────────────────────────

function QualityTab({ agent, interactions }: { agent: RoutingAgentState; interactions: ContactInteraction[] }) {
  const completed = interactions.filter((interaction) => interaction.status === 'COMPLETED');
  const resolved = completed.filter((interaction) => interaction.firstContactResolution).length;
  const avgWait = completed.length > 0
    ? completed.reduce((sum, interaction) => sum + interaction.waitTimeSec, 0) / completed.length
    : 0;
  const lastCompleted = completed[0]?.endedAt ?? null;

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Quality Score</p>
          <p className="text-lg font-bold mt-2">{agent.qualityScore}/100</p>
          <p className="text-xs text-muted-foreground mt-2">Current score from agent-state backend data</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground mb-2">First Contact Resolution</p>
          <p className="text-lg font-bold mt-2">{agent.dailyFirstContactResolution.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-2">{resolved} of {completed.length} completed interactions resolved first time</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Avg Handle Time</p>
          <p className="text-lg font-bold font-mono mt-2">{fmtTime(agent.dailyAvgHandleTime)}</p>
          <p className="text-xs text-muted-foreground mt-2">Daily handled: {agent.dailyHandled}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Operational Summary</p>
          <div className="space-y-1 text-sm">
            <div>Average wait: <span className="font-mono">{fmtTime(avgWait)}</span></div>
            <div>Active chats: <span className="font-medium">{agent.activeChatCount}/{agent.maxConcurrentChats}</span></div>
            <div>Last completed: <span className="text-muted-foreground">{lastCompleted ? formatDateTime(lastCompleted) : 'No completed interactions yet'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AgentDetailPage() {
  const { agentId = '' } = useParams<{ agentId: string }>();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('Supervisor Message');
  const [messageBody, setMessageBody] = useState('');
  const [selectedInteraction, setSelectedInteraction] = useState<ContactInteraction | null>(null);

  const { data: allAgents = [], isLoading, isFetching, isError, dataUpdatedAt } = useQuery({
    queryKey: ['contact-center', 'agents'],
    queryFn: () => contactCenterApi.getAgentStates(),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const { data: routingAgent } = useQuery({
    queryKey: ['contact-center', 'routing', 'agent', agentId],
    queryFn: () => contactRoutingApi.getAgentById(agentId),
    enabled: !!agentId,
    staleTime: 15_000,
  });
  const { data: interactions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['contact-center', 'interactions', 'agent', agentId],
    queryFn: () => contactCenterApi.getInteractionsByAgent(agentId) as Promise<ContactInteraction[]>,
    enabled: !!agentId,
    staleTime: 15_000,
  });

  const agent = allAgents.find((a) => a.agentId === agentId);
  const activeInteraction = interactions.find((interaction) => interaction.status === 'ACTIVE' || interaction.status === 'QUEUED') ?? null;
  const messageMutation = useMutation({
    mutationFn: () => contactCenterApi.sendSupervisorMessage(agentId, agent?.agentName ?? agentId, messageSubject, messageBody),
    onSuccess: () => {
      setMessageBody('');
      setShowMessageModal(false);
      toast.success('Supervisor message sent');
    },
    onError: () => toast.error('Failed to send message'),
  });

  useEffect(() => {
    document.title = agent ? `Agent: ${agent.agentName} | CBS` : 'Agent Detail | CBS';
  }, [agent]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/contact-center" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <PageHeader title="Agent Not Found" backTo="/contact-center" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Agent {agentId} not found</p>
        </div>
      </>
    );
  }

  const StateIcon = STATE_ICONS[agent.state] ?? Phone;
  const stateColor = STATE_COLORS[agent.state] ?? 'bg-gray-400';

  const handleForceState = (state: string) => {
    contactCenterApi.updateAgentState(agent.agentId, state).then(
      () => toast.success(`Agent state changed to ${state}`),
      () => toast.error('Failed to update state'),
    );
  };

  const initials = agent.agentName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {agent.agentName}
            <LiveIndicator isFetching={isFetching} isError={isError} dataUpdatedAt={dataUpdatedAt} />
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{agent.agentId}</span>
            <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white', stateColor, agent.state === 'ON_CALL' && 'animate-pulse')}>
              <StateIcon className="w-3 h-3" />
              {agent.state.replace(/_/g, ' ')}
            </span>
            {routingAgent?.stateChangedAt && (
              <span className="text-xs text-muted-foreground">
                {agent.state.replace(/_/g, ' ').toLowerCase()} for {fmtDuration(routingAgent.stateChangedAt)}
              </span>
            )}
          </span>
        }
        backTo="/contact-center"
      />

      <div className="page-container space-y-6">
        {/* Agent Header */}
        <div className="surface-card p-5">
          <div className="flex items-center gap-5">
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white', stateColor)} aria-label={`Agent ${agent.agentName}, status ${agent.state}`}>
              {initials}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{agent.agentName}</h2>
                <span className="font-mono text-xs text-muted-foreground">{agent.agentId}</span>
              </div>
              {routingAgent && (
                <div className="flex flex-wrap gap-2">
                  {routingAgent.skillGroups.map((s) => (
                    <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{s}</span>
                  ))}
                  {routingAgent.languages.map((l) => (
                    <span key={l} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted">{l}</span>
                  ))}
                </div>
              )}
              {routingAgent && (
                <p className="text-xs text-muted-foreground">
                  Shift: {String(routingAgent.shiftStart)} — {String(routingAgent.shiftEnd)}
                </p>
              )}
            </div>

            {/* Supervisor Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleForceState('BREAK')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
              >
                <Coffee className="w-3.5 h-3.5" /> Force Break
              </button>
              <button
                onClick={() => handleForceState('OFFLINE')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/10"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Force Logout
              </button>
              <button
                onClick={() => setShowMessageModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Message Agent
              </button>
              <button
                onClick={() => activeInteraction ? setSelectedInteraction(activeInteraction) : toast.info('No live interaction to monitor')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border hover:bg-muted"
              >
                <Radio className="w-3.5 h-3.5" /> Monitor Interaction
              </button>
            </div>
          </div>
        </div>

        {/* Today's Performance */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Calls Handled" value={agent.callsToday} format="number" icon={Phone} />
          <StatCard
            label="Avg Handle Time"
            value={fmtTime(agent.avgHandleTimeSec)}
            icon={Clock}
          />
          <StatCard
            label="FCR %"
            value={agent.fcrPct}
            format="percent"
            icon={CheckCircle2}
          />
          <StatCard
            label="Quality Score"
            value={agent.qualityScore}
            format="number"
            icon={Award}
          />
          <StatCard
            label="Wrap-Up Avg"
            value={routingAgent ? fmtTime(routingAgent.dailyAvgHandleTime * 0.15) : '--'}
            icon={Clock}
          />
          <StatCard
            label="Active Chats"
            value={routingAgent ? `${routingAgent.activeChatCount}/${routingAgent.maxConcurrentChats}` : '--'}
            icon={MessageSquare}
          />
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              {
                id: 'history',
                label: 'Interaction History',
                content: <InteractionHistoryTab interactions={interactions} isLoading={interactionsLoading} />,
              },
              {
                id: 'skills',
                label: 'Skills & Config',
                content: routingAgent ? <SkillsTab agent={routingAgent} /> : <div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>,
              },
              {
                id: 'quality',
                label: 'Quality Metrics',
                content: routingAgent ? <QualityTab agent={routingAgent} interactions={interactions} /> : <div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>,
              },
            ]}
          />
        </div>
      </div>

      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Message {agent.agentName}</h3>
              <button onClick={() => setShowMessageModal(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Subject"
            />
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="min-h-[140px] w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Message"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowMessageModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button
                onClick={() => messageMutation.mutate()}
                disabled={messageMutation.isPending || !messageBody.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {messageMutation.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedInteraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Interaction Monitor</h3>
                <p className="text-xs text-muted-foreground">{selectedInteraction.interactionId}</p>
              </div>
              <button onClick={() => setSelectedInteraction(null)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={selectedInteraction.status} dot /></div>
              <div><p className="text-xs text-muted-foreground">Channel</p><StatusBadge status={selectedInteraction.channel} /></div>
              <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">#{selectedInteraction.customerId}</p></div>
              <div><p className="text-xs text-muted-foreground">Reason</p><p className="font-medium">{selectedInteraction.contactReason || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Started</p><p>{selectedInteraction.startedAt ? formatDateTime(selectedInteraction.startedAt) : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Queue</p><p>{selectedInteraction.queueName || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Wait Time</p><p className="font-mono">{fmtTime(selectedInteraction.waitTimeSec)}</p></div>
              <div><p className="text-xs text-muted-foreground">Handle Time</p><p className="font-mono">{fmtTime(selectedInteraction.handleTimeSec)}</p></div>
            </div>
            {selectedInteraction.recordingRef && (
              <div>
                <p className="text-xs text-muted-foreground">Recording Reference</p>
                <p className="font-mono text-xs">{selectedInteraction.recordingRef}</p>
              </div>
            )}
            {selectedInteraction.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{selectedInteraction.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
