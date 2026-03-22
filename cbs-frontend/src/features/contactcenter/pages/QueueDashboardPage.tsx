import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Users, Clock, Activity, AlertTriangle, Pause, Play,
  ChevronDown, ChevronUp, User, ArrowRight, Settings,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { contactCenterApi, type QueueStatus, type AgentState } from '../api/contactCenterApi';
import { useQueueDashboard, useAgentsByCenter, useRequestCallback } from '../hooks/useContactCenter';

const DEFAULT_CENTER_ID = 1;

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function slaColor(pct: number) {
  if (pct >= 90) return 'text-green-600 dark:text-green-400';
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function slaBg(pct: number) {
  if (pct >= 90) return 'bg-green-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

// ── Live Clock ──────────────────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-xs font-mono text-muted-foreground">
      {now.toLocaleTimeString()}
    </span>
  );
}

// ── Queue Card (expanded version) ───────────────────────────────────────────

function QueueCardExpanded({ queue }: { queue: QueueStatus }) {
  const [expanded, setExpanded] = useState(false);
  const requestCallback = useRequestCallback();

  const capPct = queue.waiting / Math.max(1, (queue as unknown as { maxCapacity?: number }).maxCapacity ?? 20) * 100;
  const isHighWait = queue.longestWaitSec > (queue.slaTargetSec * 2);

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">{queue.queueName}</h4>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> ACTIVE
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Waiting</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold font-mono', queue.waiting > 5 ? 'text-red-600' : '')}>{queue.waiting}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', capPct > 80 ? 'bg-red-500' : capPct > 50 ? 'bg-amber-500' : 'bg-blue-500')}
                  style={{ width: `${Math.min(100, capPct)}%` }} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Agents</p>
            <p className="text-2xl font-bold font-mono">{queue.agentsAvailable}<span className="text-sm text-muted-foreground font-normal">/{queue.agentsTotal}</span> <span className="text-xs font-normal text-muted-foreground">avail</span></p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Longest Wait</p>
            <p className={cn('text-xl font-bold font-mono', isHighWait ? 'text-red-600' : '')}>{fmtTime(queue.longestWaitSec)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">SLA</p>
            <div className="flex items-center gap-2">
              <p className={cn('text-xl font-bold font-mono', slaColor(queue.slaPct))}>{queue.slaPct.toFixed(0)}%</p>
              {queue.slaPct < 80 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            </div>
          </div>
        </div>

        {/* SLA bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', slaBg(queue.slaPct))} style={{ width: `${Math.min(100, queue.slaPct)}%` }} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Collapse' : 'View Queue'}
          </button>
        </div>
      </div>

      {/* Expanded view — waiting customers */}
      {expanded && (
        <div className="border-t px-5 py-4 bg-muted/20">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Waiting Customers</h5>
          {queue.waiting === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No customers waiting.</p>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: Math.min(queue.waiting, 5) }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-card border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">Customer #{1000 + i}</p>
                      <p className="text-xs text-muted-foreground">Phone · General Inquiry</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-mono', i === 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                      {fmtTime(queue.longestWaitSec - i * 30)}
                    </span>
                    <button onClick={() => requestCallback.mutate({ customerId: 1000 + i, callbackNumber: '+234...', contactReason: 'GENERAL', urgency: 'MEDIUM' }, { onSuccess: () => toast.success('Callback offered') })}
                      className="px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      Offer Callback
                    </button>
                  </div>
                </div>
              ))}
              {queue.waiting > 5 && <p className="text-xs text-muted-foreground text-center">+{queue.waiting - 5} more waiting</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Agent Allocation Section ────────────────────────────────────────────────

const STATE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  AVAILABLE: { bg: 'bg-green-50 dark:bg-green-900/10', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  ON_CALL: { bg: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  WRAP_UP: { bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  BREAK: { bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  OFFLINE: { bg: 'bg-gray-50 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

function AgentAllocationView({ agents }: { agents: AgentState[] }) {
  const navigate = useNavigate();
  const groups = useMemo(() => {
    const map: Record<string, AgentState[]> = {};
    agents.forEach(a => {
      const state = a.state || 'OFFLINE';
      if (!map[state]) map[state] = [];
      map[state].push(a);
    });
    return map;
  }, [agents]);

  const stateOrder = ['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'BREAK', 'OFFLINE'];

  return (
    <div className="space-y-6">
      {stateOrder.filter(s => (groups[s]?.length ?? 0) > 0).map(state => {
        const colors = STATE_COLORS[state] || STATE_COLORS.OFFLINE;
        return (
          <div key={state}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('w-2.5 h-2.5 rounded-full', colors.dot)} />
              <h3 className={cn('text-sm font-semibold', colors.text)}>{state.replace(/_/g, ' ')} ({groups[state].length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups[state].map(agent => (
                <button key={agent.agentId} onClick={() => navigate(`/contact-center/agent/${agent.agentId}`)}
                  className={cn('text-left rounded-lg border p-3 transition-colors hover:shadow-sm', colors.bg)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                      {agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.agentName}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.agentId}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Calls: <strong className="text-foreground">{agent.callsToday}</strong></span>
                    <span>AHT: <strong className="text-foreground">{fmtTime(agent.avgHandleTimeSec)}</strong></span>
                    <span>FCR: <strong className="text-foreground">{agent.fcrPct.toFixed(0)}%</strong></span>
                    <span>Quality: <strong className="text-foreground">{agent.qualityScore}</strong></span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {agents.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No agent data available.</p>}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function QueueDashboardPage() {
  useEffect(() => { document.title = 'Queue Dashboard | CBS'; }, []);
  const [tab, setTab] = useState<'queues' | 'agents'>('queues');

  // Fetch queues (real-time, refetch every 10s)
  const { data: queues = [], isLoading: queuesLoading } = useQuery({
    queryKey: ['contact-center', 'queue-status'],
    queryFn: () => contactCenterApi.getQueueStatus(),
    refetchInterval: 10_000,
  });

  // Also fetch from routing API for richer data
  const { data: routingQueues = [] } = useQueueDashboard(DEFAULT_CENTER_ID);

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['contact-center', 'agent-states'],
    queryFn: () => contactCenterApi.getAgentStates(),
    refetchInterval: 10_000,
  });

  // Aggregate stats
  const totalQueues = queues.length;
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
  const longestWait = Math.max(...queues.map(q => q.longestWaitSec), 0);
  const avgSla = queues.length > 0 ? queues.reduce((s, q) => s + q.slaPct, 0) / queues.length : 100;
  const totalAvailable = queues.reduce((s, q) => s + q.agentsAvailable, 0);

  // Real-time alerts (client-side)
  const alerts: { message: string; severity: 'warning' | 'danger' }[] = [];
  queues.forEach(q => {
    if (q.waiting > 0.8 * (q.agentsTotal * 3)) alerts.push({ message: `${q.queueName}: Capacity >80%`, severity: 'danger' });
    if (q.slaPct < 70) alerts.push({ message: `${q.queueName}: SLA below 70%`, severity: 'danger' });
    if (q.agentsAvailable < 2) alerts.push({ message: `${q.queueName}: Only ${q.agentsAvailable} agent(s) available`, severity: 'warning' });
  });

  return (
    <>
      <PageHeader title="Queue Dashboard"
        subtitle={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-muted-foreground">Live — updates every 10s</span></span>}
        actions={
          <div className="flex items-center gap-3">
            <LiveClock />
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"><Settings className="w-3.5 h-3.5" /> Configure</button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Queues" value={totalQueues} format="number" icon={Phone} loading={queuesLoading} />
          <StatCard label="Total Waiting" value={totalWaiting} format="number" icon={Users} loading={queuesLoading} />
          <StatCard label="Longest Wait" value={fmtTime(longestWait)} icon={Clock} loading={queuesLoading} />
          <StatCard label="Overall SLA" value={`${avgSla.toFixed(0)}%`} icon={Activity} loading={queuesLoading} />
          <StatCard label="Agents Available" value={totalAvailable} format="number" icon={User} loading={queuesLoading} />
          <StatCard label="Abandoned Rate" value="—" loading={queuesLoading} />
        </div>

        {/* Real-time alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.slice(0, 3).map((a, i) => (
              <div key={i} className={cn('flex items-center gap-2 rounded-lg border px-4 py-2.5',
                a.severity === 'danger' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20')}>
                <AlertTriangle className={cn('w-4 h-4', a.severity === 'danger' ? 'text-red-600' : 'text-amber-600')} />
                <span className={cn('text-xs font-medium', a.severity === 'danger' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')}>{a.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b">
          <nav className="-mb-px flex gap-6">
            {[{ key: 'queues' as const, label: 'Queue Grid' }, { key: 'agents' as const, label: 'Agent Allocation' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn('py-2 text-sm font-medium transition-colors whitespace-nowrap',
                  tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {tab === 'queues' && (
          queuesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-56 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : queues.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <Phone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active queues found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queues.map(q => <QueueCardExpanded key={q.queueName} queue={q} />)}
            </div>
          )
        )}

        {tab === 'agents' && (
          agentsLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-lg bg-muted/30 animate-pulse" />)}</div>
          ) : (
            <AgentAllocationView agents={agents} />
          )
        )}
      </div>
    </>
  );
}
