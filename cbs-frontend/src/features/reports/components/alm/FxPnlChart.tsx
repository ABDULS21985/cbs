import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { almReportApi } from '../../api/almReportApi';

interface FxPnlChartProps {
  asOfDate: string;
}

function formatBillions(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}₦${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}₦${(abs / 1e6).toFixed(0)}M`;
  return `${sign}₦${abs.toLocaleString()}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-sm mb-1">{label} P&amp;L</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </span>
          <span className={`font-mono font-medium ${entry.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatBillions(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FxPnlChart({ asOfDate }: FxPnlChartProps) {
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['fx-exposure', asOfDate],
    queryFn: () => almReportApi.getFxExposure(asOfDate),
  });

  if (isLoading) {
    return (
      <div className="surface-card p-4">
        <div className="h-4 w-36 bg-muted rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="surface-card p-4">
      <h3 className="text-sm font-semibold mb-1">FX P&amp;L by Currency</h3>
      <p className="text-xs text-muted-foreground mb-4">Realized and unrealized profit &amp; loss — NGN equivalent</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={positions} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="currency"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tickFormatter={(v) => `₦${(v / 1e6).toFixed(0)}M`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-muted-foreground">{value}</span>}
          />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
          <Bar dataKey="realizedPnl" name="Realized P&L" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
          <Bar dataKey="unrealizedPnl" name="Unrealized P&L" fill="#94a3b8" radius={[3, 3, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
