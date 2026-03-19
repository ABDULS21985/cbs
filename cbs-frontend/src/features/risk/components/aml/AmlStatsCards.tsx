import { AlertTriangle, FileText, Clock, Search, Bell } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { AmlStats } from '../../types/aml';

interface Props {
  data?: AmlStats;
  isLoading?: boolean;
}

export function AmlStatsCards({ data, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        label="Open Alerts"
        value={data?.openAlerts ?? 0}
        format="number"
        icon={Bell}
        loading={isLoading}
      />
      <StatCard
        label="High Priority"
        value={data?.highPriority ?? 0}
        format="number"
        icon={AlertTriangle}
        loading={isLoading}
      />
      <StatCard
        label="Under Investigation"
        value={data?.underInvestigation ?? 0}
        format="number"
        icon={Search}
        loading={isLoading}
      />
      <StatCard
        label="STRs Filed MTD"
        value={data?.strFiledMtd ?? 0}
        format="number"
        icon={FileText}
        loading={isLoading}
      />
      <StatCard
        label="Avg Resolution"
        value={data ? `${data.avgResolutionDays} days` : '—'}
        icon={Clock}
        loading={isLoading}
      />
    </div>
  );
}
