import { Shield, Clock, AlertOctagon, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { SanctionsStats } from '../../types/sanctions';

interface Props {
  stats: SanctionsStats | undefined;
  isLoading: boolean;
}

export function SanctionsStatsCards({ stats, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
      <StatCard
        label="Screened Today"
        value={stats?.screenedToday ?? 0}
        format="number"
        icon={Shield}
        loading={isLoading}
      />
      <StatCard
        label="Pending Matches"
        value={stats?.pendingMatches ?? 0}
        format="number"
        icon={Clock}
        loading={isLoading}
      />
      <StatCard
        label="Confirmed Hits"
        value={stats?.confirmedHits ?? 0}
        format="number"
        icon={AlertOctagon}
        trend="up"
        loading={isLoading}
      />
      <StatCard
        label="False Positive Rate"
        value={stats?.falsePositiveRate ?? 0}
        format="percent"
        icon={CheckCircle}
        loading={isLoading}
      />
    </div>
  );
}
