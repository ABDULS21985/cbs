import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { ChannelMixPoint } from '../../api/channelAnalyticsApi';

interface ChannelMixTrendProps {
  data: ChannelMixPoint[];
  isLoading?: boolean;
}

const CHANNELS: { key: keyof Omit<ChannelMixPoint, 'month'>; label: string; color: string }[] = [
  { key: 'mobile', label: 'Mobile',  color: '#3b82f6' },
  { key: 'web',    label: 'Web',     color: '#8b5cf6' },
  { key: 'ussd',   label: 'USSD',    color: '#10b981' },
  { key: 'pos',    label: 'POS',     color: '#ef4444' },
  { key: 'atm',    label: 'ATM',     color: '#f59e0b' },
  { key: 'branch', label: 'Branch',  color: '#6b7280' },
];

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm min-w-[140px]">
      <div className="font-semibold text-foreground mb-1.5">{label}</div>
      {[...payload].reverse().map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 text-xs mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-medium tabular-nums">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function ChannelMixTrend({ data, isLoading }: ChannelMixTrendProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-56 bg-muted rounded animate-pulse mb-4" />
        <div className="h-72 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Channel Mix Evolution (12 Months)</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Digital channels growing; branch declining — share of transaction volume (%)
        </p>
      </div>
      <ResponsiveContainer width="100%" height={288}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            {CHANNELS.map((c) => (
              <linearGradient key={c.key} id={`grad-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={c.color} stopOpacity={0.55} />
                <stop offset="95%" stopColor={c.color} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
          />
          {CHANNELS.map((c) => (
            <Area
              key={c.key}
              type="monotone"
              dataKey={c.key}
              name={c.label}
              stackId="1"
              stroke={c.color}
              fill={`url(#grad-${c.key})`}
              strokeWidth={1.5}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
