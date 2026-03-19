import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { KriIndicator } from '../../types/dashboard';

interface Props {
  kri: KriIndicator;
}

const statusColor = (status: 'GREEN' | 'AMBER' | 'RED') => {
  if (status === 'GREEN') return '#22c55e';
  if (status === 'AMBER') return '#f59e0b';
  return '#ef4444';
};

const statusBadgeClass = (status: 'GREEN' | 'AMBER' | 'RED') => {
  if (status === 'GREEN') return 'bg-green-50 text-green-700';
  if (status === 'AMBER') return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
};

export function KriSparkline({ kri }: Props) {
  const sparkData = kri.trend.map((v, i) => ({ i, v }));
  const color = statusColor(kri.status);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{kri.name}</p>
      </div>
      <div className="w-20 h-8 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-right flex-shrink-0 w-28">
        <span className="text-sm font-semibold">
          {kri.value.toFixed(1)}{kri.unit}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          / {kri.limit}{kri.unit}
        </span>
      </div>
      <div className="flex-shrink-0 w-14 text-right">
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', statusBadgeClass(kri.status))}>
          {kri.status}
        </span>
      </div>
    </div>
  );
}
