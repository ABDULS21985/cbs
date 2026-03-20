import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ServiceLevelGauge } from './ServiceLevelGauge';
import type { AgentState, QueueStatus } from '../api/contactCenterApi';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface WallboardViewProps {
  agents: AgentState[];
  queues: QueueStatus[];
  onExit: () => void;
}

export function WallboardView({ agents, queues, onExit }: WallboardViewProps) {
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
  const available = agents.filter((a) => a.state === 'AVAILABLE').length;
  const onCall = agents.filter((a) => a.state === 'ON_CALL' || a.state === 'BUSY').length;
  const avgWait = queues.length > 0 ? queues.reduce((s, q) => s + q.longestWaitSec, 0) / queues.length : 0;
  const avgSla = queues.length > 0 ? queues.reduce((s, q) => s + q.slaPct, 0) / queues.length : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'F11') onExit(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center p-8">
      <button onClick={onExit} className="absolute top-4 right-4 text-white/40 hover:text-white text-sm">ESC to exit</button>

      {/* Main metric */}
      <div className="text-center mb-12">
        <p className="text-sm text-white/50 uppercase tracking-widest mb-2">Waiting in Queue</p>
        <p className={cn('text-8xl font-bold font-mono tabular-nums', totalWaiting > 10 ? 'text-red-400' : totalWaiting > 5 ? 'text-amber-400' : 'text-green-400')}>
          {totalWaiting}
        </p>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-4 gap-12 mb-12">
        <div className="text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Avg Wait</p>
          <p className="text-3xl font-bold font-mono">{fmtTime(avgWait)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">On Call</p>
          <p className="text-3xl font-bold font-mono text-red-400">{onCall}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Available</p>
          <p className="text-3xl font-bold font-mono text-green-400">{available}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Agents</p>
          <p className="text-3xl font-bold font-mono">{agents.length}</p>
        </div>
      </div>

      {/* Queue bars */}
      <div className="w-full max-w-4xl space-y-3">
        {queues.map((q) => {
          const barColor = q.slaPct >= 90 ? 'bg-green-500' : q.slaPct >= 80 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={q.queueName} className="flex items-center gap-4">
              <span className="w-32 text-sm text-white/60 text-right truncate">{q.queueName}</span>
              <div className="flex-1 h-6 bg-white/10 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(100, q.slaPct)}%` }} />
              </div>
              <span className="w-12 text-sm font-mono text-right">{q.slaPct.toFixed(0)}%</span>
              <span className={cn('w-8 text-center font-mono text-sm', q.waiting > 0 ? 'text-amber-400' : 'text-white/40')}>{q.waiting}</span>
            </div>
          );
        })}
      </div>

      {/* SLA gauge */}
      <div className="mt-8">
        <ServiceLevelGauge value={avgSla} size="lg" />
      </div>
    </div>
  );
}
