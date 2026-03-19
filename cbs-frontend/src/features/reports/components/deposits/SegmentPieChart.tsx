import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';

interface SegmentData {
  segment: string;
  amount: number;
  pct: number;
  color: string;
}

interface SegmentPieChartProps {
  data: SegmentData[];
  isLoading?: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SegmentData;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.segment}</p>
      <p className="text-muted-foreground">
        Amount: <span className="text-foreground font-medium">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{d.pct.toFixed(1)}%</span>
      </p>
    </div>
  );
}

function CustomLabel({ cx, cy, midAngle, outerRadius, name, pct }: any) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? 'start' : 'end';

  if (pct < 8) return null; // skip tiny labels

  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}>
      {name} {pct.toFixed(0)}%
    </text>
  );
}

const DEFAULT_SEGMENT_DATA: SegmentData[] = [
  { segment: 'Retail', amount: 30_240_000_000, pct: 45.0, color: '#3b82f6' },
  { segment: 'SME', amount: 16_800_000_000, pct: 25.0, color: '#8b5cf6' },
  { segment: 'Corporate', amount: 13_440_000_000, pct: 20.0, color: '#f59e0b' },
  { segment: 'Government', amount: 6_720_000_000, pct: 10.0, color: '#10b981' },
];

export function SegmentPieChart({ data, isLoading }: SegmentPieChartProps) {
  const chartData = data.length > 0 ? data : DEFAULT_SEGMENT_DATA;
  const total = chartData.reduce((s, d) => s + d.amount, 0);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <div className="relative">
          <ResponsiveContainer width={260} height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={46}
                paddingAngle={2}
                dataKey="amount"
                nameKey="segment"
                labelLine={false}
                label={<CustomLabel />}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground">Total</span>
            <span className="text-base font-bold text-foreground">{formatMoneyCompact(total)}</span>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs px-2">
        {chartData.map((d) => (
          <div key={d.segment} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.segment}</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
