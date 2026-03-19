import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChannelVolume } from '../../api/channelAnalyticsApi';

interface ChannelVolumeDonutProps {
  volumes: ChannelVolume[];
  isLoading?: boolean;
}

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  pct: number;
}

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, outerRadius, name, pct }: CustomLabelProps) {
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (pct < 4) return null; // Skip tiny labels
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs fill-muted-foreground"
      fontSize={11}
    >
      {name} {pct}%
    </text>
  );
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: ChannelVolume;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <div className="font-semibold text-foreground">{d.label}</div>
      <div className="text-muted-foreground mt-0.5">
        {d.count.toLocaleString()} transactions ({d.pct}%)
      </div>
    </div>
  );
}

export function ChannelVolumeDonut({ volumes, isLoading }: ChannelVolumeDonutProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }

  const total = volumes.reduce((s, v) => s + v.count, 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-sm font-semibold text-foreground mb-4">Channel Volume Distribution</h2>
      <div className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={volumes}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={110}
              paddingAngle={2}
              dataKey="count"
              nameKey="label"
              labelLine={false}
              label={(props) => (
                <CustomLabel
                  cx={props.cx}
                  cy={props.cy}
                  midAngle={props.midAngle}
                  innerRadius={props.innerRadius}
                  outerRadius={props.outerRadius}
                  name={props.name}
                  pct={props.payload.pct}
                />
              )}
            >
              {volumes.map((v) => (
                <Cell key={v.channel} fill={v.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tabular-nums">
            {(total / 1000).toFixed(0)}K
          </span>
          <span className="text-xs text-muted-foreground">Transactions</span>
        </div>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
        {volumes.map((v) => (
          <div key={v.channel} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
            <span className="truncate">{v.label}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">{v.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
