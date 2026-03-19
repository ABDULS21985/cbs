import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage } from '@/components/shared';
import { contactCenterApi, type AgentState, type QueueStatus } from '../api/contactCenterApi';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Phone, Users, Clock, HeadphonesIcon } from 'lucide-react';

const stateColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500', ON_CALL: 'bg-blue-500', WRAP_UP: 'bg-amber-500', BREAK: 'bg-red-500', OFFLINE: 'bg-gray-400',
};

const agentCols: ColumnDef<AgentState, any>[] = [
  { accessorKey: 'agentName', header: 'Agent', cell: ({ row }) => <span className="font-medium">{row.original.agentName}</span> },
  { accessorKey: 'state', header: 'State', cell: ({ row }) => (
    <span className="flex items-center gap-2 text-xs font-medium">
      <span className={cn('w-2.5 h-2.5 rounded-full', stateColors[row.original.state] || 'bg-gray-400')} />
      {row.original.state.replace(/_/g, ' ')}
    </span>
  )},
  { accessorKey: 'callsToday', header: 'Calls Today' },
  { accessorKey: 'avgHandleTimeSec', header: 'AHT', cell: ({ row }) => { const m = Math.floor(row.original.avgHandleTimeSec / 60); const s = row.original.avgHandleTimeSec % 60; return <span className="font-mono text-sm">{m}:{s.toString().padStart(2, '0')}</span>; } },
  { accessorKey: 'fcrPct', header: 'FCR %', cell: ({ row }) => <span className={cn('font-mono text-sm', row.original.fcrPct >= 80 ? 'text-green-600' : 'text-amber-600')}>{row.original.fcrPct.toFixed(0)}%</span> },
  { accessorKey: 'qualityScore', header: 'Quality', cell: ({ row }) => <span className={cn('font-mono text-sm font-medium', row.original.qualityScore >= 80 ? 'text-green-600' : row.original.qualityScore >= 60 ? 'text-amber-600' : 'text-red-600')}>{row.original.qualityScore}/100</span> },
];

function QueueStatusCards({ queues, isLoading }: { queues: QueueStatus[]; isLoading: boolean }) {
  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <div key={i} className="rounded-lg border p-4 animate-pulse"><div className="h-4 bg-muted rounded w-24 mb-2" /><div className="h-8 bg-muted rounded w-16" /></div>)}</div>;
  if (queues.length === 0) return <div className="text-center text-muted-foreground py-8">No queues configured</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {queues.map((q) => (
        <div key={q.queueName} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{q.queueName}</h4>
            <span className="text-xs text-muted-foreground">{q.queueType}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Waiting:</span> <span className="font-mono font-bold">{q.waiting}</span></div>
            <div><span className="text-muted-foreground">Longest:</span> <span className="font-mono">{Math.floor(q.longestWaitSec / 60)}:{(q.longestWaitSec % 60).toString().padStart(2, '0')}</span></div>
            <div><span className="text-muted-foreground">SLA:</span> <span className={cn('font-mono font-bold', q.slaPct >= 80 ? 'text-green-600' : 'text-red-600')}>{q.slaPct.toFixed(0)}%</span></div>
            <div><span className="text-muted-foreground">Agents:</span> <span className="font-mono">{q.agentsAvailable}/{q.agentsTotal}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContactCenterPage() {
  const { data: agents = [], isLoading: agentsLoading } = useQuery({ queryKey: ['contact-center', 'agents'], queryFn: () => contactCenterApi.getAgentStates(), refetchInterval: 10_000 });
  const { data: queues = [], isLoading: queuesLoading } = useQuery({ queryKey: ['contact-center', 'queues'], queryFn: () => contactCenterApi.getQueueStatus(), refetchInterval: 10_000 });

  const available = agents.filter((a) => a.state === 'AVAILABLE').length;
  const onCall = agents.filter((a) => a.state === 'ON_CALL').length;
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);

  return (
    <>
      <PageHeader title="Contact Center" subtitle="Agent workbench, queue monitoring, performance tracking" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Agents Online" value={agents.length} format="number" icon={HeadphonesIcon} loading={agentsLoading} />
          <StatCard label="Available" value={available} format="number" icon={Phone} loading={agentsLoading} />
          <StatCard label="On Call" value={onCall} format="number" icon={Users} loading={agentsLoading} />
          <StatCard label="Waiting in Queue" value={totalWaiting} format="number" icon={Clock} loading={queuesLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'queues', label: 'Queue Dashboard', badge: totalWaiting || undefined, content: (
            <div className="p-4"><QueueStatusCards queues={queues} isLoading={queuesLoading} /></div>
          )},
          { id: 'agents', label: 'Agent Status', badge: agents.length || undefined, content: (
            <div className="p-4"><DataTable columns={agentCols} data={agents} isLoading={agentsLoading} enableGlobalFilter emptyMessage="No agents online" /></div>
          )},
          { id: 'performance', label: 'Performance', content: (
            <div className="p-8 text-center text-muted-foreground">Agent performance scorecard — loads from reporting API</div>
          )},
          { id: 'config', label: 'Config', content: (
            <div className="p-8 text-center text-muted-foreground">Routing rules and queue configuration — admin only</div>
          )},
        ]} />
      </div>
    </>
  );
}
