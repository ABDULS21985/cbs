import { Users, Clock, Zap, UserCheck, Banknote, ArrowLeftRight } from 'lucide-react';
import { StatCard } from '@/components/shared';
import type { BranchStats } from '../../api/branchOpsApi';

interface BranchDashboardCardsProps {
  stats: BranchStats;
  isLoading: boolean;
}

export function BranchDashboardCards({ stats, isLoading }: BranchDashboardCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Customers Served Today"
        value={stats?.customersServedToday ?? 0}
        format="number"
        icon={Users}
        loading={isLoading}
      />
      <StatCard
        label="Avg Wait (min)"
        value={stats?.avgWaitMinutes ?? 0}
        icon={Clock}
        loading={isLoading}
      />
      <StatCard
        label="Avg Service (min)"
        value={stats?.avgServiceMinutes ?? 0}
        icon={Zap}
        loading={isLoading}
      />
      <StatCard
        label="Staff On Duty"
        value={isLoading ? 0 : `${stats.staffOnDuty}/${stats.totalStaff}`}
        icon={UserCheck}
        loading={isLoading}
      />
      <StatCard
        label="Revenue Today"
        value={stats?.revenueToday ?? 0}
        format="money"
        compact
        icon={Banknote}
        loading={isLoading}
      />
      <StatCard
        label="Transactions"
        value={stats?.transactionsToday ?? 0}
        format="number"
        icon={ArrowLeftRight}
        loading={isLoading}
      />
    </div>
  );
}
