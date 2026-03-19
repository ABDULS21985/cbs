import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { RiskAppetite } from '../../types/dashboard';

interface Props {
  data: RiskAppetite[];
  isLoading?: boolean;
}

const gaugeColor = (pct: number) =>
  pct < 60 ? '#22c55e' : pct < 80 ? '#f59e0b' : '#ef4444';

const statusEmoji = (status: 'GREEN' | 'AMBER' | 'RED') =>
  status === 'GREEN' ? '🟢' : status === 'AMBER' ? '🟡' : '🔴';

function GaugeChart({ appetite }: { appetite: RiskAppetite }) {
  const used = Math.min(appetite.current, 100);
  const remaining = 100 - used;
  const color = gaugeColor(used);

  const gaugeData = [
    { value: used },
    { value: remaining },
  ];

  return (
    <div className="flex flex-col items-center p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm font-medium">{appetite.label}</span>
        <span>{statusEmoji(appetite.status)}</span>
      </div>
      <div className="relative w-32 h-16">
        <ResponsiveContainer width="100%" height={80}>
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={40}
              outerRadius={56}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-base font-bold" style={{ color }}>{used.toFixed(0)}%</span>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {used.toFixed(1)} / {appetite.limit}% limit
      </div>
    </div>
  );
}

function GaugeSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 rounded-lg border bg-card animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-2" />
      <div className="w-32 h-16 bg-muted rounded" />
      <div className="h-3 w-20 bg-muted rounded mt-2" />
    </div>
  );
}

export function RiskAppetiteGauges({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <GaugeSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {(data ?? []).map((appetite) => (
        <GaugeChart key={appetite.riskType} appetite={appetite} />
      ))}
    </div>
  );
}
