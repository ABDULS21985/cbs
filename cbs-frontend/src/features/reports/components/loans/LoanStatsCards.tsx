import { Banknote, TrendingUp, AlertTriangle, Shield, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { LoanPortfolioStats } from '../../api/loanAnalyticsApi';

interface LoanStatsCardsProps {
  stats: LoanPortfolioStats;
}

interface CardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  subColor?: string;
}

function Card({ label, value, sub, icon: Icon, iconColor, valueColor, subColor }: CardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <span className={cn('p-2 rounded-lg', iconColor)}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className={cn('text-2xl font-bold tracking-tight', valueColor ?? 'text-foreground')}>{value}</div>
      <div className={cn('text-xs font-medium', subColor ?? 'text-muted-foreground')}>{sub}</div>
    </div>
  );
}

export function LoanStatsCards({ stats }: LoanStatsCardsProps) {
  const nplColor = stats.nplPct >= 5 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400';
  const coverageColor = stats.coverageRatio >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card
        label="Total Portfolio"
        value={formatMoneyCompact(stats.totalPortfolio)}
        sub="Gross loan book"
        icon={Banknote}
        iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      />
      <Card
        label="Performing"
        value={formatMoneyCompact(stats.performing)}
        sub={`${stats.performingPct.toFixed(1)}% of portfolio`}
        icon={TrendingUp}
        iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        valueColor="text-emerald-600 dark:text-emerald-400"
        subColor="text-emerald-600/70 dark:text-emerald-400/70"
      />
      <Card
        label="NPL"
        value={formatMoneyCompact(stats.npl)}
        sub={`${stats.nplPct.toFixed(1)}% NPL ratio`}
        icon={AlertTriangle}
        iconColor={stats.nplPct >= 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}
        valueColor={nplColor}
        subColor={nplColor}
      />
      <Card
        label="Provision"
        value={formatMoneyCompact(stats.provision)}
        sub="Total provisions held"
        icon={Shield}
        iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        valueColor="text-blue-600 dark:text-blue-400"
      />
      <Card
        label="Coverage Ratio"
        value={`${stats.coverageRatio.toFixed(1)}%`}
        sub="Provision / NPL"
        icon={BarChart3}
        iconColor={stats.coverageRatio >= 80 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}
        valueColor={coverageColor}
        subColor={coverageColor}
      />
    </div>
  );
}
