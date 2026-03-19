import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, Area, ComposedChart,
} from 'recharts';
import { formatPercent } from '@/lib/formatters';
import type { NplTrendPoint } from '../../types/creditRisk';

interface NplTrendChartProps {
  data: NplTrendPoint[];
}

export function NplTrendChart({ data }: NplTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
        No NPL trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nplGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'nplRatio') return [formatPercent(value), 'NPL Ratio'];
            return [formatPercent(value), name];
          }}
        />
        <Legend />
        <ReferenceLine
          y={5}
          stroke="#ef4444"
          strokeDasharray="4 4"
          label={{ value: 'Regulatory Limit 5%', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
        />
        <Area
          type="monotone"
          dataKey="nplRatio"
          name="NPL Ratio"
          stroke="#3b82f6"
          fill="url(#nplGradient)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
