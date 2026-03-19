import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft, Receipt, Upload, Globe,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { apiGet } from '@/lib/api';

interface PaymentStats {
  totalPaymentsToday: number;
  totalAmountToday: number;
  pendingPayments: number;
  completedPayments: number;
  failedPayments: number;
  avgProcessingTimeSecs: number;
}

const quickActions = [
  { label: 'New Transfer', icon: ArrowRightLeft, path: '/payments/new', color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'Bill Pay', icon: Receipt, path: '/payments/bills', color: 'bg-green-600 hover:bg-green-700' },
  { label: 'Bulk Upload', icon: Upload, path: '/payments/bulk', color: 'bg-purple-600 hover:bg-purple-700' },
  { label: 'International', icon: Globe, path: '/payments/international', color: 'bg-amber-600 hover:bg-amber-700' },
];

export function PaymentsDashboardPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['payments', 'dashboard-stats'],
    queryFn: () =>
      apiGet<PaymentStats>('/api/v1/dashboard/stats').catch(() => ({
        totalPaymentsToday: 0,
        totalAmountToday: 0,
        pendingPayments: 0,
        completedPayments: 0,
        failedPayments: 0,
        avgProcessingTimeSecs: 0,
      })),
  });

  return (
    <>
      <PageHeader title="Payments Dashboard" subtitle="Overview of payment operations and quick actions" />
      <div className="page-container space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Payments Today"
            value={stats?.totalPaymentsToday ?? 0}
            format="number"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Total Amount"
            value={stats?.totalAmountToday ?? 0}
            format="money"
            compact
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Pending"
            value={stats?.pendingPayments ?? 0}
            format="number"
            icon={Clock}
            loading={isLoading}
          />
          <StatCard
            label="Completed"
            value={stats?.completedPayments ?? 0}
            format="number"
            icon={CheckCircle2}
            loading={isLoading}
          />
        </div>

        {/* Failed + Avg Processing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Failed"
            value={stats?.failedPayments ?? 0}
            format="number"
            icon={AlertTriangle}
            loading={isLoading}
          />
          <StatCard
            label="Avg Processing"
            value={stats ? `${stats.avgProcessingTimeSecs.toFixed(1)}s` : '—'}
            icon={Clock}
            loading={isLoading}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center gap-3 rounded-lg p-6 text-white transition-colors ${action.color}`}
              >
                <action.icon className="w-8 h-8" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity links */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Payment Channels</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Payment History', path: '/payments/history' },
              { label: 'Standing Orders', path: '/payments/standing-orders' },
              { label: 'Cheques', path: '/payments/cheques' },
              { label: 'QR Payments', path: '/payments/qr' },
              { label: 'Mobile Money', path: '/payments/mobile-money' },
              { label: 'ACH Operations', path: '/operations/ach' },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="rounded-lg border bg-card p-4 text-left hover:bg-muted/40 transition-colors"
              >
                <span className="text-sm font-medium">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
