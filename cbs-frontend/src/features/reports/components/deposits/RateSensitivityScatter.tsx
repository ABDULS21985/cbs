import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { RateBand, RateSensitivityPoint } from '../../api/depositAnalyticsApi';

interface RateSensitivityScatterProps {
  data: RateSensitivityPoint[];
  rateBands: RateBand[];
  isLoading?: boolean;
}

const SEGMENT_COLORS: Record<string, string> = {
  RETAIL: '#3b82f6',
  SME: '#8b5cf6',
  CORPORATE: '#f59e0b',
  GOVERNMENT: '#10b981',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as RateSensitivityPoint;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{d.segment}</p>
      <p className="text-muted-foreground">
        Amount: <span className="text-foreground font-medium">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Rate: <span className="text-foreground font-medium">{d.rate.toFixed(2)}%</span>
      </p>
    </div>
  );
}

export function RateSensitivityScatter({ data, rateBands, isLoading }: RateSensitivityScatterProps) {
  const segments = ['RETAIL', 'SME', 'CORPORATE', 'GOVERNMENT'];
  const bySegment = segments.map((seg) => ({
    seg,
    points: data.filter((d) => d.segment === seg),
  }));

  const avgRate = data.length > 0 ? data.reduce((s, d) => s + d.rate, 0) / data.length : 5;
  const avgAmount = data.length > 0 ? data.reduce((s, d) => s + d.amount, 0) / data.length : 1_000_000;

  // Log-scale amounts for better scatter distribution
  const chartData = bySegment.map(({ seg, points }) => ({
    seg,
    points: points.map((p) => ({ ...p, logAmount: Math.log10(Math.max(p.amount, 1)) })),
  }));

  const totalBandAmount = rateBands.reduce((s, b) => s + b.amount, 0);

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scatter chart */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Each dot represents one deposit account. Top-right quadrant (above avg rate + above avg amount) indicates rate-sensitive high-value deposits.
          </p>
        </div>

        {/* Quadrant labels overlay */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 12, right: 24, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="logAmount"
                name="Deposit Amount"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Deposit Amount (log scale)', position: 'insideBottom', offset: -12, style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                tickFormatter={(v) => formatMoneyCompact(Math.pow(10, v))}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number"
                dataKey="rate"
                name="Interest Rate"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'Rate %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
                width={52}
              />
              <ZAxis range={[18, 18]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              />
              {/* Reference lines for quadrants */}
              <ReferenceLine
                y={avgRate}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `Avg ${avgRate.toFixed(1)}%`, position: 'insideTopRight', style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <ReferenceLine
                x={Math.log10(avgAmount)}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `Avg ${formatMoneyCompact(avgAmount)}`, position: 'insideTopRight', style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' } }}
              />
              {chartData.map(({ seg, points }) => (
                <Scatter
                  key={seg}
                  name={seg}
                  data={points}
                  fill={SEGMENT_COLORS[seg] ?? '#6b7280'}
                  fillOpacity={0.65}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          {/* Quadrant annotation */}
          <div className="absolute top-3 right-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded text-[9px] px-1.5 py-0.5 text-red-700 dark:text-red-400 font-semibold pointer-events-none">
            Rate-Sensitive
          </div>
        </div>
      </div>

      {/* Rate Band Distribution */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Rate Band Distribution</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Rate Band</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium w-48">Distribution</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Amount</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Accounts</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {rateBands.map((band) => (
                <tr key={band.band} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <span
                      className="inline-flex items-center gap-1.5 font-semibold text-foreground"
                    >
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: band.color }} />
                      {band.band}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${band.pct}%`, backgroundColor: band.color }}
                        />
                      </div>
                      <span className="text-muted-foreground w-10 text-right tabular-nums">{band.pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">
                    {formatMoneyCompact(band.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    {band.count.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span className={cn('font-semibold', band.pct > 35 ? 'text-foreground' : 'text-muted-foreground')}>
                      {band.pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="py-2 px-3 font-bold text-foreground">Total</td>
                <td className="py-2 px-3" />
                <td className="py-2 px-3 text-right tabular-nums font-bold text-foreground">
                  {formatMoneyCompact(totalBandAmount)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-bold text-foreground">
                  {rateBands.reduce((s, b) => s + b.count, 0).toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right font-bold text-foreground">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
