import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import type { ChannelBreakdown } from '../../api/paymentAnalyticsApi';

interface ChannelBreakdownChartsProps {
  data: ChannelBreakdown[];
  isLoading: boolean;
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 99) return '#22c55e';
  if (rate >= 95) return '#f59e0b';
  return '#ef4444';
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{d.channel}</p>
      <p className="text-muted-foreground">
        Volume: <span className="text-foreground font-medium">{d.volume.toLocaleString()}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{d.pct}%</span>
      </p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        Success Rate: <span className="text-foreground font-medium">{payload[0].value}%</span>
      </p>
    </div>
  );
}

export function ChannelBreakdownCharts({ data, isLoading }: ChannelBreakdownChartsProps) {
  const total = data.reduce((sum, c) => sum + c.volume, 0);
  const pieData = data.map((c) => ({
    ...c,
    pct: total > 0 ? ((c.volume / total) * 100).toFixed(1) : '0',
  }));

  const barData = [...data]
    .sort((a, b) => b.successRate - a.successRate)
    .map((c) => ({
      channel: c.channel,
      successRate: parseFloat(c.successRate.toFixed(1)),
      fill: getSuccessRateColor(c.successRate),
    }));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 h-72 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Donut — Volume by Channel */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Volume by Channel</h2>
        <div className="flex flex-col items-center">
          <div className="relative">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={2}
                  dataKey="volume"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">
                {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString()}
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 w-full max-w-xs">
            {pieData.map((c) => (
              <div key={c.channel} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-muted-foreground truncate">{c.channel}</span>
                <span className="ml-auto font-medium text-foreground">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar — Success Rate by Channel */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Success Rate by Channel</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
            barSize={18}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              domain={[90, 100]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="channel"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="successRate" radius={[0, 3, 3, 0]}>
              {barData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="successRate"
                position="right"
                formatter={(v: number) => `${v}%`}
                style={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500" />≥99%</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" />95–99%</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500" />&lt;95%</span>
        </div>
      </div>
    </div>
  );
}
