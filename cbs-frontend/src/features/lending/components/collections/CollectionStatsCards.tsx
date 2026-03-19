import { AlertTriangle, FileWarning, TrendingUp, Minus } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { CollectionStats } from '../../types/collections';

interface CollectionStatsCardsProps {
  stats?: CollectionStats;
  isLoading?: boolean;
}

export function CollectionStatsCards({ stats, isLoading }: CollectionStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Delinquent"
        value={stats?.totalDelinquent ?? 0}
        format="money"
        compact
        icon={AlertTriangle}
        trend="down"
        loading={isLoading}
      />
      <StatCard
        label="Active Cases"
        value={stats?.cases ?? 0}
        format="number"
        icon={FileWarning}
        loading={isLoading}
      />
      <StatCard
        label="Recovered MTD"
        value={stats?.recoveredMtd ?? 0}
        format="money"
        compact
        icon={TrendingUp}
        trend="up"
        loading={isLoading}
      />
      <StatCard
        label="Written Off MTD"
        value={stats?.writtenOffMtd ?? 0}
        format="money"
        compact
        icon={Minus}
        loading={isLoading}
      />
    </div>
  );
}
