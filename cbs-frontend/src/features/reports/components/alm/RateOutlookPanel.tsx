import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { almReportApi, type RateOutlookItem } from '../../api/almReportApi';
import { formatPercent } from '@/lib/formatters';

function ChangeCell({ change }: { change: number }) {
  const abs = Math.abs(change);
  if (change === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="w-3.5 h-3.5" />
        {formatPercent(abs)}
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
        <TrendingUp className="w-3.5 h-3.5" />+{formatPercent(abs)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
      <TrendingDown className="w-3.5 h-3.5" />-{formatPercent(abs)}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-sm mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
          </span>
          <span className="font-mono font-medium">{entry.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

export function RateOutlookPanel() {
  const { data: outlook = [], isLoading } = useQuery({
    queryKey: ['rate-outlook'],
    queryFn: () => almReportApi.getRateOutlook(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="surface-card p-4 animate-pulse">
          <div className="h-4 w-40 bg-muted rounded mb-4" />
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 bg-muted/50 rounded mb-2" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Interest Rate Outlook — Yield Curve</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Based on CBN monetary policy signals and market consensus
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium">Tenor</th>
                <th className="px-4 py-2.5 text-right font-medium">Current Rate</th>
                <th className="px-4 py-2.5 text-right font-medium">Forecast Rate</th>
                <th className="px-4 py-2.5 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {outlook.map((row: RateOutlookItem, idx) => (
                <tr key={row.tenor} className={cn('border-b hover:bg-muted/20 transition-colors', idx % 2 === 1 && 'bg-muted/5')}>
                  <td className="px-4 py-2.5 font-medium">{row.tenor}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatPercent(row.currentRate)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatPercent(row.forecastRate)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <ChangeCell change={row.change} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card p-4">
        <h3 className="text-sm font-semibold mb-1">Yield Curve — Current vs Forecast</h3>
        <p className="text-xs text-muted-foreground mb-4">Interest rates (%) across tenors</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={outlook} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis
              dataKey="tenor"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="currentRate"
              name="Current Rate"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="forecastRate"
              name="Forecast Rate"
              stroke="#f97316"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-1 italic">
          Source: CBN monetary policy signals and market consensus data
        </p>
      </div>
    </div>
  );
}
