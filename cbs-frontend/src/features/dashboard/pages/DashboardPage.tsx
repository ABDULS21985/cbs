import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { WidgetCard } from '../components/WidgetCard';
import { LineChartWidget } from '../widgets/LineChartWidget';
import { BarChartWidget } from '../widgets/BarChartWidget';
import { PieChartWidget } from '../widgets/PieChartWidget';
import { RecentTransactionsWidget } from '../widgets/RecentTransactionsWidget';
import { PendingApprovalsWidget } from '../widgets/PendingApprovalsWidget';
import { TreasurySnapshotWidget } from '../widgets/TreasurySnapshotWidget';
import { DealerDesksWidget } from '../widgets/DealerDesksWidget';
import { ApprovalStatsWidget } from '../widgets/ApprovalStatsWidget';
import { Wallet, Landmark, AlertTriangle, Users, CreditCard, Clock } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardData';

export function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard | CBS'; }, []);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  // Compute NPL ratio from real backend fields
  const nplRatio = stats?.loanPortfolio && stats.loanPortfolio > 0
    ? ((stats.nplAmount ?? 0) / stats.loanPortfolio) * 100
    : 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Welcome back. Here's your banking overview." />
      <div className="page-container space-y-4">
        {/* Stat Cards — mapped to GET /v1/dashboard/stats response fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Customers"
            value={stats?.totalCustomers ?? 0}
            format="number"
            loading={statsLoading}
            icon={Users}
          />
          <StatCard
            label="Accounts"
            value={stats?.totalAccounts ?? 0}
            format="number"
            loading={statsLoading}
            icon={Wallet}
          />
          <StatCard
            label="Total Deposits"
            value={stats?.totalDeposits ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={Wallet}
          />
          <StatCard
            label="Loan Portfolio"
            value={stats?.loanPortfolio ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={Landmark}
          />
          <StatCard
            label="NPL Ratio"
            value={nplRatio}
            format="percent"
            loading={statsLoading}
            icon={AlertTriangle}
          />
          <StatCard
            label="Active Cards"
            value={stats?.activeCards ?? 0}
            format="number"
            loading={statsLoading}
            icon={CreditCard}
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

        {/* Treasury & Operations Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="Treasury Snapshot (NGN)" colSpan={4}>
            <TreasurySnapshotWidget />
          </WidgetCard>
          <WidgetCard title="Dealer Desks" colSpan={4}>
            <DealerDesksWidget />
          </WidgetCard>
          <WidgetCard title="Approval Statistics" colSpan={4}>
            <ApprovalStatsWidget />
          </WidgetCard>
        </div>
      </div>
    </>
  );
}
