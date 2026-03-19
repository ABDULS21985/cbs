import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { formatDate, formatMoney } from '@/lib/formatters';
import type { LtvPoint } from '../../types/mortgage';

interface LtvTrackingChartProps {
  data?: LtvPoint[];
}

interface TooltipPayload {
  payload: LtvPoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
      <p className="font-semibold">{formatDate(pt.date)}</p>
      <p className="text-muted-foreground">LTV: <span className="text-foreground font-semibold">{pt.ltv.toFixed(2)}%</span></p>
      <p className="text-muted-foreground">Outstanding: <span className="font-mono text-foreground">{formatMoney(pt.outstanding)}</span></p>
      <p className="text-muted-foreground">Property Value: <span className="font-mono text-foreground">{formatMoney(pt.propertyValue)}</span></p>
    </div>
  );
}

export function LtvTrackingChart({ data = [] }: LtvTrackingChartProps) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">LTV History</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-3 h-0.5 bg-red-400" />
          <span>80% Threshold</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => {
              try { return formatDate(v).slice(3); } catch { return v; }
            }}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={80} stroke="#f87171" strokeDasharray="4 4" label={{ value: '80%', position: 'right', fontSize: 11, fill: '#f87171' }} />
          <Line
            type="monotone"
            dataKey="ltv"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="LTV %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
