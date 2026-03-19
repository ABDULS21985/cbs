import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { SectorExposure } from '../../api/loanAnalyticsApi';

interface SectorConcentrationChartProps {
  sectors: SectorExposure[];
}

function computeHhi(sectors: SectorExposure[]): number {
  return sectors.reduce((sum, s) => sum + s.portfolioPct * s.portfolioPct, 0);
}

function getHhiLabel(hhi: number): { level: string; color: string; bgColor: string } {
  if (hhi < 1000) return { level: 'LOW', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' };
  if (hhi < 1800) return { level: 'MODERATE', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' };
  return { level: 'HIGH', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' };
}

function SectorTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as SectorExposure;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-semibold text-foreground">{d.sector}</p>
      <p className="text-muted-foreground">
        Exposure: <span className="text-foreground font-medium">{formatMoneyCompact(d.amount)}</span>
      </p>
      <p className="text-muted-foreground">
        Portfolio: <span className="text-foreground font-medium">{d.portfolioPct.toFixed(1)}%</span>
      </p>
      <p className="text-muted-foreground">
        NPL: <span className={cn('font-medium', d.nplPct >= 5 ? 'text-red-500' : d.nplPct >= 3 ? 'text-amber-500' : 'text-emerald-500')}>
          {d.nplPct.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

export function SectorConcentrationChart({ sectors }: SectorConcentrationChartProps) {
  const sorted = [...sectors].sort((a, b) => b.amount - a.amount);
  const hhi = computeHhi(sectors);
  const hhiLabel = getHhiLabel(hhi);
  const top3Pct = sorted.slice(0, 3).reduce((s, x) => s + x.portfolioPct, 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Sector Concentration</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Portfolio distribution and NPL by sector</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_200px] gap-6">
        {/* Bar Chart */}
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 60, bottom: 4, left: 0 }}
            barSize={16}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 35]}
            />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip content={<SectorTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
            <Bar dataKey="portfolioPct" name="Portfolio %" radius={[0, 4, 4, 0]}>
              {sorted.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
              <LabelList
                dataKey="portfolioPct"
                position="right"
                formatter={(v: number) => `${v.toFixed(0)}%`}
                style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* HHI Scorecard */}
        <div className="flex flex-col gap-4 justify-center">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">HHI Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{Math.round(hhi).toLocaleString()}</span>
            </div>
            <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', hhiLabel.bgColor, hhiLabel.color)}>
              {hhiLabel.level} CONCENTRATION
            </span>

            <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border">
              <p className="font-medium text-foreground">Interpretation</p>
              <p>
                {hhiLabel.level === 'LOW' && 'Well-diversified portfolio with low concentration risk.'}
                {hhiLabel.level === 'MODERATE' && `Moderate concentration — top 3 sectors represent ${top3Pct.toFixed(0)}% of portfolio.`}
                {hhiLabel.level === 'HIGH' && `High concentration risk — top 3 sectors represent ${top3Pct.toFixed(0)}% of portfolio.`}
              </p>
            </div>

            <div className="text-xs text-muted-foreground pt-1 border-t border-border space-y-0.5">
              <div className="flex justify-between">
                <span>Top 3 sectors</span>
                <span className="font-medium text-foreground">{top3Pct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600 dark:text-emerald-400">&lt;1,000 = Low</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600 dark:text-amber-400">1,000–1,800 = Moderate</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 dark:text-red-400">&gt;1,800 = High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
