import { cn } from '@/lib/utils';
import type { QueueStatus } from '../api/contactCenterApi';

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function QueueCard({ queue }: { queue: QueueStatus }) {
  const slaColor = queue.slaPct >= 90 ? 'text-green-600' : queue.slaPct >= 80 ? 'text-amber-600' : 'text-red-600';
  const slaBg = queue.slaPct >= 90 ? 'bg-green-500' : queue.slaPct >= 80 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{queue.queueName}</h4>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{queue.queueType}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Waiting</p>
          <p className={cn('text-xl font-bold font-mono', queue.waiting > 5 ? 'text-red-600' : '')}>{queue.waiting}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Longest Wait</p>
          <p className="text-xl font-bold font-mono">{fmtTime(queue.longestWaitSec)}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">SLA</span>
          <span className={cn('font-bold font-mono', slaColor)}>{queue.slaPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', slaBg)} style={{ width: `${Math.min(100, queue.slaPct)}%` }} />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Agents: <span className="font-medium text-foreground">{queue.agentsAvailable}</span> available / {queue.agentsTotal} assigned
      </div>
    </div>
  );
}
