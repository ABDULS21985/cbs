import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatMoneyCompact, formatMoney } from '@/lib/formatters';
import type { AmortizationRow } from '../../types/lease';

interface DepreciationChartProps {
  data?: AmortizationRow[];
  currency?: string;
}

interface TooltipPayload {
  payload: AmortizationRow & { rouAssetValue: number };
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
      <p className="font-semibold">Month {pt.month}</p>
      <p className="text-muted-foreground">ROU Asset: <span className="font-mono text-foreground">{formatMoney(pt.rouAsset)}</span></p>
      <p className="text-muted-foreground">Depreciation: <span className="font-mono text-foreground">{formatMoney(pt.depreciation)}</span></p>
    </div>
  );
}

export function DepreciationChart({ data = [] }: DepreciationChartProps) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">ROU Asset Depreciation</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="rouGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `M${v}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(v)}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="rouAsset"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#rouGradient)"
            name="ROU Asset"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
