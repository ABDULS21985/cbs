import { Calculator, Shield, AlertTriangle, XCircle, BarChart3 } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import type { EclSummary } from '../../types/ecl';

interface Props {
  summary: EclSummary | undefined;
  isLoading: boolean;
}

export function EclStatsCards({ summary, isLoading }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        label="Total ECL"
        value={summary?.totalEcl ?? 0}
        format="money"
        compact
        icon={Calculator}
        loading={isLoading}
      />
      <StatCard
        label="Stage 1 ECL"
        value={summary?.stage1Ecl ?? 0}
        format="money"
        compact
        icon={Shield}
        loading={isLoading}
      />
      <StatCard
        label="Stage 2 ECL"
        value={summary?.stage2Ecl ?? 0}
        format="money"
        compact
        icon={AlertTriangle}
        loading={isLoading}
      />
      <StatCard
        label="Stage 3 ECL"
        value={summary?.stage3Ecl ?? 0}
        format="money"
        compact
        icon={XCircle}
        loading={isLoading}
      />
      <StatCard
        label="Coverage Ratio"
        value={summary?.coverageRatio ?? 0}
        format="percent"
        icon={BarChart3}
        loading={isLoading}
      />
    </div>
  );
}
