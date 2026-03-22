import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { SettlementDashboardData } from '../../api/settlementApi';

interface SettlementDashboardProps {
  data?: SettlementDashboardData;
  isLoading: boolean;
}

export function SettlementDashboardStrip({ data, isLoading }: SettlementDashboardProps) {
  if (isLoading || !data) {
    return <div className="h-16 rounded-xl bg-muted animate-pulse" />;
  }

  const totalToday = Number(data.totalToday ?? 0);
  const settled = Number(data.settled ?? 0);
  const pending = Number(data.pending ?? 0);
  const failed = Number(data.failed ?? 0);
  const pct = Number(data.settledPercent ?? 0);
  const barColor =
    pct >= 95 ? 'bg-green-500' : pct >= 80 ? 'bg-blue-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          Today's Settlement:{' '}
          <span className="tabular-nums">{totalToday.toLocaleString()}</span> instructions
        </p>
        <span className="text-sm font-bold tabular-nums">{pct.toFixed(0)}% settled</span>
      </div>

      <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center gap-6 text-sm">
        <span className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">{settled}</span> settled
        </span>
        <span className="flex items-center gap-1.5 text-blue-600">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">{pending}</span> pending
        </span>
        <span className="flex items-center gap-1.5 text-red-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">{failed}</span> failed
        </span>
      </div>
    </div>
  );
}
