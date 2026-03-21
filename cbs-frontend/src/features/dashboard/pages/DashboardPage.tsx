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
import {
  Wallet, Landmark, AlertTriangle, Users, CreditCard,
  LayoutDashboard, TrendingUp, BarChart3, Building2, ShieldCheck,
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardData';

export function DashboardPage() {
  useEffect(() => { document.title = 'Dashboard | CBS'; }, []);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const nplRatio = stats?.loanPortfolio && stats.loanPortfolio > 0
    ? ((stats.nplAmount ?? 0) / stats.loanPortfolio) * 100
    : 0;

  return (
    <>
      <PageHeader
        title="Banking Dashboard"
        subtitle="Performance, activity, and key metrics across all operations"
        icon={LayoutDashboard}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />

      <div className="page-container space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Customers"
            value={stats?.totalCustomers ?? 0}
            format="number"
            loading={statsLoading}
            icon={Users}
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
            tooltip="Total registered customers"
          />
          <StatCard
            label="Accounts"
            value={stats?.totalAccounts ?? 0}
            format="number"
            loading={statsLoading}
            icon={Wallet}
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            tooltip="Active and dormant accounts"
          />
          <StatCard
            label="Total Deposits"
            value={stats?.totalDeposits ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={Landmark}
            iconBg="bg-violet-50 dark:bg-violet-900/20"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            label="Loan Portfolio"
            value={stats?.loanPortfolio ?? 0}
            format="money"
            compact
            loading={statsLoading}
            icon={TrendingUp}
            iconBg="bg-amber-50 dark:bg-amber-900/20"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="NPL Ratio"
            value={nplRatio}
            format="percent"
            loading={statsLoading}
            icon={AlertTriangle}
            iconBg="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-500 dark:text-red-400"
            tooltip="Non-performing loan ratio"
          />
          <StatCard
            label="Active Cards"
            value={stats?.activeCards ?? 0}
            format="number"
            loading={statsLoading}
            icon={CreditCard}
            iconBg="bg-teal-50 dark:bg-teal-900/20"
            iconColor="text-teal-600 dark:text-teal-400"
          />
        </div>

        {/* Section: Performance Charts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h2 className="dashboard-section-title">Performance Overview</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <WidgetCard title="Transaction Volume (12 Months)" colSpan={8} info="Monthly transaction counts across all channels">
              <LineChartWidget />
            </WidgetCard>
            <WidgetCard title="Deposit Mix by Product" colSpan={4} info="Current deposit distribution by product type">
              <PieChartWidget />
            </WidgetCard>
          </div>
        </div>

        {/* Section: Activity & Approvals */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <h2 className="dashboard-section-title">Activity & Approvals</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <WidgetCard title="Recent Transactions" colSpan={8}>
              <RecentTransactionsWidget />
            </WidgetCard>
            <WidgetCard title="Pending Approvals" colSpan={4}>
              <PendingApprovalsWidget />
            </WidgetCard>
          </div>
        </div>

        {/* Section: Revenue & Lending */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h2 className="dashboard-section-title">Revenue & Lending</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <WidgetCard title="Top Branches by Revenue" colSpan={6} info="Revenue comparison across branch network (NGN millions)">
              <BarChartWidget />
            </WidgetCard>
            <WidgetCard title="Loan Disbursements by Product" colSpan={6} info="Disbursement volumes by loan product (NGN millions)">
              <BarChartWidget data={[
                { name: 'Personal', value: 420 }, { name: 'SME', value: 380 }, { name: 'Mortgage', value: 290 },
                { name: 'Auto', value: 180 }, { name: 'Agric', value: 150 }, { name: 'Micro', value: 120 },
              ]} color="hsl(43, 74%, 49%)" />
            </WidgetCard>
          </div>
        </div>

        {/* Section: Treasury & Operations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="dashboard-section-title">Treasury & Operations</h2>
          </div>
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
      </div>
    </>
  );
}
