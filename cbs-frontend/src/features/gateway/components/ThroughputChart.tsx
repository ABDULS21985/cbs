import { useQuery } from '@tanstack/react-query';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { gatewayApi } from '../api/gatewayApi';

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md text-xs space-y-1">
      <div className="font-medium text-foreground mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

interface ErrorDot {
  minute: string;
  errors: number;
  inbound: number;
}

export function ThroughputChart() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['gateway', 'throughput'],
    queryFn: () => gatewayApi.getThroughput(),
    refetchInterval: 10_000,
  });

  const errorPoints: ErrorDot[] = data
    .filter((d) => d.errors > 0)
    .map((d) => ({ minute: d.minute, errors: d.errors, inbound: d.inbound }));

  const ticks = data
    .filter((_, i) => i % 10 === 0)
    .map((d) => d.minute);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="h-4 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Message Throughput — Last 60 Minutes</h3>
        <span className="text-xs text-muted-foreground">Auto-refresh every 10s</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
          <XAxis
            dataKey="minute"
            ticks={ticks}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="inbound"
            name="Inbound"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="outbound"
            name="Outbound"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Scatter
            data={errorPoints}
            dataKey="inbound"
            name="Errors"
            fill="#ef4444"
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              if (!payload?.errors) return <g />;
              return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />;
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
