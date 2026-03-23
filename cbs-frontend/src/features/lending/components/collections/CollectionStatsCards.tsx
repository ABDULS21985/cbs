import { AlertTriangle, FileWarning, Minus, TrendingUp } from 'lucide-react';
import { formatMoneyCompact } from '@/lib/formatters';
import type { CollectionStats } from '../../types/collections';

interface CollectionStatsCardsProps {
  stats?: CollectionStats;
  isLoading?: boolean;
}

const ITEMS = [
  {
    label: 'Total Delinquent',
    helper: 'Current delinquent exposure across the collections book.',
    icon: AlertTriangle,
    color: 'text-amber-600',
    key: 'totalDelinquent',
    format: 'money',
  },
  {
    label: 'Active Cases',
    helper: 'Open cases currently assigned to the collections workflow.',
    icon: FileWarning,
    color: 'text-primary',
    key: 'cases',
    format: 'number',
  },
  {
    label: 'Recovered MTD',
    helper: 'Recoveries posted in the current reporting month.',
    icon: TrendingUp,
    color: 'text-emerald-600',
    key: 'recoveredMtd',
    format: 'money',
  },
  {
    label: 'Written Off MTD',
    helper: 'Write-offs processed from live collections cases.',
    icon: Minus,
    color: 'text-rose-600',
    key: 'writtenOffMtd',
    format: 'money',
  },
] as const;

function formatValue(value: number, format: 'money' | 'number') {
  return format === 'money' ? formatMoneyCompact(value) : value.toLocaleString();
}

export function CollectionStatsCards({ stats, isLoading }: CollectionStatsCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const rawValue = Number(stats?.[item.key as keyof CollectionStats] ?? 0);

        return (
          <div key={item.label} className="lending-kpi-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {isLoading ? '...' : formatValue(rawValue, item.format)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
