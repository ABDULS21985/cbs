import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { WidgetCard } from '../components/WidgetCard';
import { LineChartWidget } from '../widgets/LineChartWidget';
import { BarChartWidget } from '../widgets/BarChartWidget';
import { PieChartWidget } from '../widgets/PieChartWidget';
import { RecentTransactionsWidget } from '../widgets/RecentTransactionsWidget';
import { PendingApprovalsWidget } from '../widgets/PendingApprovalsWidget';
import { Wallet, Landmark, AlertTriangle, TrendingUp } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardData';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Welcome back. Here's your banking overview." />
      <div className="page-container space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Deposits"
            value={stats?.totalDeposits ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={Wallet}
          />
          <StatCard
            label="Active Loans"
            value={stats?.activeLoans ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={Landmark}
          />
          <StatCard
            label="NPL Ratio"
            value={stats?.nplRatio ?? 0}
            format="percent"
            loading={statsLoading}
            icon={AlertTriangle}
          />
          <StatCard
            label="Revenue MTD"
            value={stats?.revenueMtd ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={TrendingUp}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="Transaction Volume (12 Months)" colSpan={8}>
            <LineChartWidget />
          </WidgetCard>
          <WidgetCard title="Deposit Mix by Product" colSpan={4}>
            <PieChartWidget />
          </WidgetCard>
        </div>

        {/* Data Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="Recent Transactions" colSpan={8}>
            <RecentTransactionsWidget />
          </WidgetCard>
          <WidgetCard title="Pending Approvals" colSpan={4}>
            <PendingApprovalsWidget />
          </WidgetCard>
        </div>

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="Top Branches by Revenue (₦M)" colSpan={6}>
            <BarChartWidget />
          </WidgetCard>
          <WidgetCard title="Loan Disbursements by Product (₦M)" colSpan={6}>
            <BarChartWidget data={[
              { name: 'Personal', value: 420 }, { name: 'SME', value: 380 }, { name: 'Mortgage', value: 290 },
              { name: 'Auto', value: 180 }, { name: 'Agric', value: 150 }, { name: 'Micro', value: 120 },
            ]} color="hsl(43, 74%, 49%)" />
          </WidgetCard>
        </div>
      </div>
    </>
  );
}
