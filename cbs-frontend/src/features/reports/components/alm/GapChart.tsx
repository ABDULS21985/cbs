import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { almReportApi } from '../../api/almReportApi';

interface GapChartProps {
  asOfDate: string;
}

function formatBillions(value: number) {
  if (Math.abs(value) >= 1e12) return `₦${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `₦${(value / 1e9).toFixed(0)}B`;
  return `₦${value.toLocaleString()}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-sm mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </span>
          <span className="font-mono font-medium">{formatBillions(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function GapChart({ asOfDate }: GapChartProps) {
  const { data: buckets = [], isLoading } = useQuery({
    queryKey: ['gap-analysis', asOfDate],
    queryFn: () => almReportApi.getGapAnalysis(asOfDate),
  });

  if (isLoading) {
    return (
      <div className="surface-card p-4">
        <div className="h-4 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="surface-card p-4">
      <h3 className="text-sm font-semibold mb-4">Assets vs Liabilities by Maturity Bucket</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={buckets} margin={{ top: 8, right: 60, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `₦${(v / 1e9).toFixed(0)}B`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => `₦${(v / 1e9).toFixed(0)}B`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-muted-foreground">{value}</span>}
          />
          <ReferenceLine yAxisId="right" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 2" />
          <Bar yAxisId="left" dataKey="assets" name="Assets" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar yAxisId="left" dataKey="liabilities" name="Liabilities" fill="#f97316" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeGap"
            name="Cumulative Gap"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
