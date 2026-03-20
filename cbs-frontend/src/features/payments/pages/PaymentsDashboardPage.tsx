import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft, Receipt, Upload, Globe,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, CalendarClock, QrCode,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, EmptyState } from '@/components/shared';
import { apiGet } from '@/lib/api';
import { useRecentTransfers } from '../hooks/useTransfer';
import { formatMoney, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface PaymentStats {
  totalPaymentsToday: number;
  totalAmountToday: number;
  pendingPayments: number;
  completedPayments: number;
  failedPayments: number;
  avgProcessingTimeSecs: number;
}

const quickActionsGrid = [
  { label: 'New Transfer', icon: ArrowRightLeft, path: '/payments/new' },
  { label: 'Pay Bill', icon: Receipt, path: '/payments/bills' },
  { label: 'Bulk Upload', icon: Upload, path: '/payments/bulk' },
  { label: 'International', icon: Globe, path: '/payments/international' },
  { label: 'Standing Order', icon: CalendarClock, path: '/payments/standing-orders' },
  { label: 'QR Payment', icon: QrCode, path: '/payments/qr' },
];

export function PaymentsDashboardPage() {
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Payments | CBS'; }, []);

  // Keyboard shortcut: Ctrl/Cmd+N → new transfer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/payments/new');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Dashboard stats query (existing)
  const { data: stats, isLoading: statsLoading } = useQuery({
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

  // Recent transfers from the shared hook
  const { data: recentTransfers, isLoading: transfersLoading } = useRecentTransfers();

  // Derived stats from recent transfers
  const { todayCount, todayValue, failedCount } = useMemo(() => {
    if (!recentTransfers) return { todayCount: 0, todayValue: 0, failedCount: 0 };
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayTxns = recentTransfers.filter((t) => t.date?.startsWith(todayStr));
    return {
      todayCount: todayTxns.length,
      todayValue: todayTxns.reduce((sum, t) => sum + t.amount, 0),
      failedCount: recentTransfers.filter((t) => t.status === 'FAILED').length,
    };
  }, [recentTransfers]);

  const isLoading = statsLoading || transfersLoading;

  return (
    <>
      <PageHeader title="Payments Dashboard" subtitle="Overview of payment operations and quick actions" />
      <div className="page-container space-y-6">

        {/* Failed transactions alert */}
        {failedCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {'\u26A0'} {failedCount} failed transaction{failedCount > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => navigate('/payments/history?status=FAILED')}
              className="text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              View Details
            </button>
          </div>
        )}

        {/* KPI cards — wired to real data from useRecentTransfers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Payments Today"
            value={stats?.totalPaymentsToday ?? todayCount}
            format="number"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Total Amount"
            value={stats?.totalAmountToday ?? todayValue}
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
            value={stats?.failedPayments ?? failedCount}
            format="number"
            icon={AlertTriangle}
            loading={isLoading}
          />
          <StatCard
            label="Avg Processing"
            value={stats ? `${stats.avgProcessingTimeSecs.toFixed(1)}s` : '\u2014'}
            icon={Clock}
            loading={isLoading}
          />
        </div>

        {/* Recent Activity + Quick Actions two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Recent Activity */}
          <div className="lg:col-span-8 rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <Link
                to="/payments/history"
                className="text-sm font-medium text-primary hover:underline"
              >
                View All
              </Link>
            </div>

            {transfersLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : !recentTransfers?.length ? (
              <EmptyState title="No recent transactions" className="py-12" />
            ) : (
              <ul className="divide-y">
                {recentTransfers.slice(0, 8).map((txn) => {
                  const isCredit = txn.direction === 'CREDIT';
                  return (
                    <li key={txn.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      {/* Direction icon */}
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        isCredit ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                 : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                      )}>
                        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>

                      {/* Description + reference */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{txn.beneficiaryName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {txn.reference ?? txn.narration ?? txn.beneficiaryAccount}
                        </p>
                      </div>

                      {/* Amount + status + time */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={cn(
                          'text-sm font-semibold',
                          isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                        )}>
                          {isCredit ? '+' : '-'}{formatMoney(txn.amount, txn.currency)}
                        </span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={txn.status} size="sm" />
                          <span className="text-[11px] text-muted-foreground">{formatRelative(txn.date)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* RIGHT: Quick Actions */}
          <div className="lg:col-span-4">
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActionsGrid.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-muted/50"
                >
                  <action.icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Channels */}
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
