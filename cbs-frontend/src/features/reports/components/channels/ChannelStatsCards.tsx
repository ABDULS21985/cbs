import { Activity, Smartphone, Building2, CheckCircle2, Timer, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { ChannelStats } from '../../api/channelAnalyticsApi';

interface ChannelStatsCardsProps {
  stats: ChannelStats | undefined;
  isLoading?: boolean;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  isLoading?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, iconClass, isLoading }: CardProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-2" />
        <div className="h-8 w-28 bg-muted rounded mb-1" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
    );
  }
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={cn('p-2 rounded-lg', iconClass || 'bg-muted/50')}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

export function ChannelStatsCards({ stats, isLoading }: ChannelStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total Transactions"
        value={stats ? `${(stats.totalTransactions / 1000).toFixed(0)}K` : '—'}
        sub="This period"
        icon={Activity}
        iconClass="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        isLoading={isLoading}
      />
      <StatCard
        label="Digital Transactions"
        value={stats ? `${(stats.digitalTransactions / 1000).toFixed(0)}K` : '—'}
        sub={stats ? `${stats.digitalPct.toFixed(1)}% of total` : undefined}
        icon={Smartphone}
        iconClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        isLoading={isLoading}
      />
      <StatCard
        label="Branch Transactions"
        value={stats ? `${(stats.branchTransactions / 1000).toFixed(0)}K` : '—'}
        sub={stats ? `${stats.branchPct.toFixed(1)}% of total` : undefined}
        icon={Building2}
        iconClass="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
        isLoading={isLoading}
      />
      <StatCard
        label="Success Rate"
        value={stats ? `${stats.successRate.toFixed(1)}%` : '—'}
        sub="All channels"
        icon={CheckCircle2}
        iconClass="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
        isLoading={isLoading}
      />
      <StatCard
        label="Avg Response Time"
        value={stats ? `${(stats.avgResponseMs / 1000).toFixed(1)}s` : '—'}
        sub="End-to-end"
        icon={Timer}
        iconClass="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        isLoading={isLoading}
      />
      <StatCard
        label="Revenue from Fees"
        value={stats ? formatMoneyCompact(stats.revenueFees) : '—'}
        sub="Transaction fees"
        icon={Banknote}
        iconClass="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
        isLoading={isLoading}
      />
    </div>
  );
}
