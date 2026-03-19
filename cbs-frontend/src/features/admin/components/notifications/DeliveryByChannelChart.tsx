import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { DeliveryStats, NotificationChannel } from '../../api/notificationAdminApi';

interface DeliveryByChannelChartProps {
  stats: DeliveryStats[];
}

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PUSH: 'Push',
  IN_APP: 'In-App',
};

function aggregateByChannel(stats: DeliveryStats[]) {
  const agg: Record<string, { channel: string; sent: number; delivered: number; failed: number }> = {};
  stats.forEach((s) => {
    const key = s.channel;
    if (!agg[key]) {
      agg[key] = { channel: CHANNEL_LABELS[s.channel] ?? s.channel, sent: 0, delivered: 0, failed: 0 };
    }
    agg[key].sent += s.sent;
    agg[key].delivered += s.delivered;
    agg[key].failed += s.failed;
  });
  return Object.values(agg);
}

const toK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const sent = payload.find((p) => p.name === 'Sent')?.value ?? 0;
  const delivered = payload.find((p) => p.name === 'Delivered')?.value ?? 0;
  const rate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0';
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{p.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="border-t border-border pt-1">
        <span className="text-muted-foreground">Delivery Rate: </span>
        <span className="font-semibold text-green-600 dark:text-green-400">{rate}%</span>
      </div>
    </div>
  );
}

interface DeliveryRateLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  index?: number;
  data?: Array<{ sent: number; delivered: number }>;
}

function DeliveryRateLabel({ x = 0, y = 0, width = 0, index = 0, data = [] }: DeliveryRateLabelProps) {
  const entry = data[index];
  if (!entry || entry.sent === 0) return null;
  const rate = ((entry.delivered / entry.sent) * 100).toFixed(0);
  return (
    <text
      x={x + width + 4}
      y={y + 12}
      fill="hsl(var(--muted-foreground))"
      fontSize={10}
      fontWeight={500}
    >
      {rate}%
    </text>
  );
}

export function DeliveryByChannelChart({ stats }: DeliveryByChannelChartProps) {
  const data = aggregateByChannel(stats);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 60, left: 0, bottom: 0 }}
        barGap={2}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="channel"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={toK}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
        />
        <Bar dataKey="sent" name="Sent" fill="hsl(210, 80%, 56%)" radius={[4, 4, 0, 0]}>
          <LabelList content={<DeliveryRateLabel data={data} />} position="right" />
        </Bar>
        <Bar dataKey="delivered" name="Delivered" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="failed" name="Failed" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
