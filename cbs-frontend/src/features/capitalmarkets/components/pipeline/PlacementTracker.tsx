import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { PrivatePlacement } from '../../api/capitalMarketsApi';

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

interface PlacementTrackerProps {
  placements: PrivatePlacement[];
  loading: boolean;
}

export function PlacementTracker({ placements, loading }: PlacementTrackerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (placements.length === 0) {
    return <div className="p-12 text-center text-sm text-muted-foreground">No active private placements.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {placements.map((p) => {
        const funded = p.totalFunded ?? 0;
        const pct = p.targetAmount > 0 ? Math.min(100, Math.round((funded / p.targetAmount) * 100)) : 0;
        const investorCount = p.investors?.length ?? 0;
        const days = daysSince(p.createdAt);

        return (
          <div key={p.id} className="rounded-xl border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">{p.issuer}</p>
                <p className="text-xs text-muted-foreground">{p.instrumentType} &middot; {p.currency}</p>
              </div>
              <StatusBadge status={p.status} size="sm" dot />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Funding Progress</span>
                <span className="font-semibold tabular-nums">{formatMoney(funded, p.currency)} / {formatMoney(p.targetAmount, p.currency)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{pct}% funded</span>
                <span>{investorCount} investor{investorCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{days} days since opened</span>
              <code className="font-mono">{p.code}</code>
            </div>
          </div>
        );
      })}
    </div>
  );
}
