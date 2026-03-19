import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutiveKpi } from '../../api/executiveReportApi';

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, favorable, positive }: { data: number[]; favorable: boolean; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 80;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const isGood = favorable ? positive : !positive;
  const strokeColor = isGood ? '#16a34a' : '#dc2626';

  return (
    <svg width={w} height={h}>
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Single KPI Card ──────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: ExecutiveKpi }) {
  const isPositive = kpi.yoyChange >= 0;
  const changeGood = kpi.favorable ? isPositive : !isPositive;
  const changeColor = changeGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const budgetOver = kpi.budgetPct >= 100;
  const budgetBarColor = kpi.favorable
    ? budgetOver
      ? 'bg-green-500'
      : 'bg-amber-500'
    : budgetOver
    ? 'bg-red-500'
    : 'bg-green-500';

  const budgetFormatted = kpi.budget >= 1e9
    ? `₦${(kpi.budget / 1e9).toFixed(1)}B`
    : kpi.budget >= 1e6
    ? `₦${(kpi.budget / 1e6).toFixed(1)}M`
    : kpi.label.includes('%') || kpi.label.includes('Ratio') || kpi.label.includes('Return')
    ? `${kpi.budget}%`
    : `₦${kpi.budget.toLocaleString()}`;

  const barFill = Math.min(kpi.budgetPct, 100);

  return (
    <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">{kpi.label}</span>
        <Sparkline data={kpi.sparkline} favorable={kpi.favorable} positive={isPositive} />
      </div>

      {/* Main value */}
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-semibold font-money leading-none">{kpi.formatted}</span>
        <div className={cn('flex items-center gap-0.5 text-sm font-medium', changeColor)}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isPositive ? '+' : ''}{kpi.yoyChange.toFixed(1)}%</span>
        </div>
      </div>

      {/* YoY label */}
      <p className="text-xs text-muted-foreground -mt-1">Year-on-year change</p>

      {/* Budget progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Budget: {budgetFormatted}</span>
          <span className={cn('font-semibold', budgetOver && kpi.favorable ? 'text-green-600 dark:text-green-400' : budgetOver && !kpi.favorable ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
            {kpi.budgetPct.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', budgetBarColor)}
            style={{ width: `${barFill}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

interface ExecutiveKpiCardsProps {
  kpis: ExecutiveKpi[];
}

export function ExecutiveKpiCards({ kpis }: ExecutiveKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
