import { Landmark, PiggyBank, Wallet, Clock, TrendingDown, BarChart3, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { DepositStats } from '../../api/depositAnalyticsApi';

interface DepositStatsCardsProps {
  stats: DepositStats | undefined;
  isLoading?: boolean;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor?: string;
  accent?: boolean;
  loading?: boolean;
}

function Card({ label, value, sub, icon: Icon, iconColor, accent, loading }: CardProps) {
  if (loading) {
    return (
      <div className={cn('rounded-lg border bg-card p-5 animate-pulse', accent && 'border-primary/30')}>
        <div className="h-3 w-20 bg-muted rounded mb-3" />
        <div className="h-8 w-28 bg-muted rounded mb-2" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card p-5', accent && 'border-primary/40 bg-primary/5')}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={cn('p-1.5 rounded-md', iconColor ?? 'bg-muted')}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className={cn('text-2xl font-bold tabular-nums', accent && 'text-primary')}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export function DepositStatsCards({ stats, isLoading }: DepositStatsCardsProps) {
  const total = stats?.total ?? 0;
  const savings = stats?.savings ?? 0;
  const current = stats?.current ?? 0;
  const term = stats?.term ?? 0;

  const savingsPct = total > 0 ? ((savings / total) * 100).toFixed(1) : '0';
  const currentPct = total > 0 ? ((current / total) * 100).toFixed(1) : '0';
  const termPct = total > 0 ? ((term / total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Row 1: Total (wide) + 3 breakdown cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          label="Total Deposits"
          value={isLoading ? '—' : `₦${(total / 1e9).toFixed(1)}B`}
          sub={isLoading ? undefined : `${formatMoneyCompact(total)} across all types`}
          icon={Landmark}
          iconColor="bg-primary/10 text-primary"
          accent
          loading={isLoading}
        />
        <Card
          label="Savings Deposits"
          value={isLoading ? '—' : `₦${(savings / 1e9).toFixed(1)}B`}
          sub={isLoading ? undefined : `${savingsPct}% of total`}
          icon={PiggyBank}
          iconColor="bg-blue-500/10 text-blue-600"
          loading={isLoading}
        />
        <Card
          label="Current Accounts"
          value={isLoading ? '—' : `₦${(current / 1e9).toFixed(1)}B`}
          sub={isLoading ? undefined : `${currentPct}% of total`}
          icon={Wallet}
          iconColor="bg-violet-500/10 text-violet-600"
          loading={isLoading}
        />
        <Card
          label="Term Deposits"
          value={isLoading ? '—' : `₦${(term / 1e9).toFixed(1)}B`}
          sub={isLoading ? undefined : `${termPct}% of total`}
          icon={Clock}
          iconColor="bg-emerald-500/10 text-emerald-600"
          loading={isLoading}
        />
      </div>

      {/* Row 2: Cost of funds, avg deposit, new MTD, retention */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card
          label="Cost of Funds"
          value={isLoading ? '—' : `${stats?.costOfFunds.toFixed(2)}%`}
          sub="Blended across all types"
          icon={TrendingDown}
          iconColor="bg-amber-500/10 text-amber-600"
          loading={isLoading}
        />
        <Card
          label="Avg Deposit Size"
          value={isLoading ? '—' : formatMoneyCompact(stats?.avgDeposit ?? 0)}
          sub="Per active account"
          icon={BarChart3}
          iconColor="bg-cyan-500/10 text-cyan-600"
          loading={isLoading}
        />
        <Card
          label="New Deposits MTD"
          value={isLoading ? '—' : `₦${((stats?.newDepositsMTD ?? 0) / 1e9).toFixed(1)}B`}
          sub="Month to date inflows"
          icon={PlusCircle}
          iconColor="bg-green-500/10 text-green-600"
          loading={isLoading}
        />
        <Card
          label="Retention Rate"
          value={isLoading ? '—' : `${stats?.retentionRate.toFixed(1)}%`}
          sub="12-month rolling average"
          icon={PiggyBank}
          iconColor="bg-rose-500/10 text-rose-600"
          loading={isLoading}
        />
      </div>
    </div>
  );
}
