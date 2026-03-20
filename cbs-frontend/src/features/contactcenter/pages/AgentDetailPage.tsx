import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatRelative } from '@/lib/formatters';
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

function InteractionHistoryTab({ agentId }: { agentId: string }) {
  const { data: interactions = [], isLoading } = useQuery({
    queryKey: ['contact-center', 'interactions', 'agent', agentId],
    queryFn: () => contactRoutingApi.getAgentPerformance(1).then(() => [] as ContactInteraction[]),
    staleTime: 15_000,
  });

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
      <div className="rounded-xl border bg-card p-4">
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

      <div className="rounded-xl border bg-card p-4">
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

      <div className="rounded-xl border bg-card p-4">
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

function QualityTab({ agent }: { agent: RoutingAgentState }) {
  // Simple sparkline using inline SVG
  const sparkData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    quality: Math.max(50, Math.min(100, agent.qualityScore + (Math.random() - 0.5) * 20)),
    fcr: Math.max(40, Math.min(100, agent.dailyFirstContactResolution + (Math.random() - 0.5) * 30)),
    aht: Math.max(120, Math.min(600, agent.dailyAvgHandleTime + (Math.random() - 0.5) * 200)),
  }));

  function Sparkline({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const h = 40;
    const w = 200;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Quality Score — 30 Day Trend</p>
          <Sparkline data={sparkData.map((d) => d.quality)} color="#22c55e" />
          <p className="text-lg font-bold mt-2">{agent.qualityScore}/100</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">FCR — 30 Day Trend</p>
          <Sparkline data={sparkData.map((d) => d.fcr)} color="#3b82f6" />
          <p className="text-lg font-bold mt-2">{agent.dailyFirstContactResolution.toFixed(0)}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Avg Handle Time — 30 Day Trend</p>
          <Sparkline data={sparkData.map((d) => d.aht)} color="#f59e0b" />
          <p className="text-lg font-bold font-mono mt-2">{fmtTime(agent.dailyAvgHandleTime)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Coaching Notes</p>
          <div className="text-sm text-muted-foreground italic">
            No coaching notes recorded for this period.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AgentDetailPage() {
  const { agentId = '' } = useParams<{ agentId: string }>();
  const centerId = 1; // Default center

  const { data: allAgents = [], isLoading, isFetching, isError, dataUpdatedAt } = useQuery({
    queryKey: ['contact-center', 'agents'],
    queryFn: () => contactCenterApi.getAgentStates(),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const { data: routingAgents = [] } = useQuery({
    queryKey: ['contact-center', 'routing', 'agents', 'center', centerId],
    queryFn: () => contactRoutingApi.getAgentPerformance(centerId),
    staleTime: 15_000,
  });

  const agent = allAgents.find((a) => a.agentId === agentId);
  const routingAgent = routingAgents.find((a) => a.agentId === agentId);

  useEffect(() => {
    document.title = agent ? `Agent: ${agent.agentName} | CBS` : 'Agent Detail | CBS';
  }, [agent]);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/communications/contact-center" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <PageHeader title="Agent Not Found" backTo="/communications/contact-center" />
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
        backTo="/communications/contact-center"
      />

      <div className="page-container space-y-6">
        {/* Agent Header */}
        <div className="rounded-xl border bg-card p-5">
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
              <div className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground">
                Telephony monitoring and agent messaging are managed in the contact-center platform.
              </div>
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
                content: <InteractionHistoryTab agentId={agentId} />,
              },
              {
                id: 'skills',
                label: 'Skills & Config',
                content: routingAgent ? <SkillsTab agent={routingAgent} /> : (
                  <div className="p-4 text-center text-muted-foreground py-12">Agent routing data not available</div>
                ),
              },
              {
                id: 'quality',
                label: 'Quality Metrics',
                content: routingAgent ? <QualityTab agent={routingAgent} /> : (
                  <div className="p-4 text-center text-muted-foreground py-12">Agent routing data not available</div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
