import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft, Receipt, Upload, Globe,
  TrendingUp, Clock, CheckCircle2, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, CalendarClock, QrCode,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
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

const paymentChannels = [
  { label: 'Payment History', path: '/payments/history' },
  { label: 'Standing Orders', path: '/payments/standing-orders' },
  { label: 'Cheques', path: '/payments/cheques' },
  { label: 'QR Payments', path: '/payments/qr' },
  { label: 'Mobile Money', path: '/payments/mobile-money' },
  { label: 'ACH Operations', path: '/operations/ach' },
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
  const { data: stats } = useQuery({
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

  // Group transfers by date for volume chart
  const volumeData = useMemo(() => {
    const groups: Record<string, { date: string; count: number; value: number }> = {};
    (recentTransfers ?? []).forEach(t => {
      const d = t.date?.split('T')[0] ?? '';
      if (!d) return;
      if (!groups[d]) groups[d] = { date: d, count: 0, value: 0 };
      groups[d].count += 1;
      groups[d].value += t.amount ?? 0;
    });
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  }, [recentTransfers]);

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

  const completedCount = stats?.completedPayments ?? recentTransfers?.filter((t) => t.status === 'COMPLETED').length ?? 0;
  const pendingCount = stats?.pendingPayments ?? recentTransfers?.filter((t) => t.status === 'PENDING').length ?? 0;
  const processingTimeLabel = stats ? `${stats.avgProcessingTimeSecs.toFixed(1)}s` : '\u2014';
  const heroMetrics = [
    { label: 'Payments Today', value: String(stats?.totalPaymentsToday ?? todayCount) },
    { label: 'Total Amount', value: formatMoney(stats?.totalAmountToday ?? todayValue, 'NGN') },
    { label: 'Pending', value: String(pendingCount) },
  ];
  const operationalHighlights = [
    { label: 'Completed', value: String(completedCount), icon: CheckCircle2 },
    { label: 'Failed', value: String(stats?.failedPayments ?? failedCount), icon: AlertTriangle },
    { label: 'Avg Processing', value: processingTimeLabel, icon: Clock },
  ];

  return (
    <>
      <PageHeader title="Payments Dashboard" subtitle="Overview of payment operations and quick actions" />
      <div className="page-container space-y-6">
        <section className="payment-hero-shell">
          <div className="payment-hero-grid">
            <div>
              <p className="payment-hero-kicker">Payments command center</p>
              <h2 className="payment-hero-title">Move funds, watch queues, and act on exceptions faster</h2>
              <p className="payment-hero-description">
                Monitor today&apos;s volume, route into the most-used payment rails, and pick up operator actions from a single workspace.
              </p>
              <div className="payment-step-chip-row">
                <span className="payment-step-chip">{recentTransfers?.length ?? 0} recent transfers</span>
                <span className="payment-step-chip">
                  {volumeData.length > 0 ? '7-day trend available' : 'Awaiting trend data'}
                </span>
                <span className="payment-step-chip">{processingTimeLabel} average processing</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="payment-metrics-grid">
                {heroMetrics.map((metric) => (
                  <div key={metric.label} className="payment-metric-card">
                    <p className="payment-metric-label">{metric.label}</p>
                    <p className="payment-metric-value">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {operationalHighlights.map((highlight) => (
                  <div key={highlight.label} className="payment-panel px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="payment-metric-label">{highlight.label}</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{highlight.value}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <highlight.icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {failedCount > 0 ? (
          <div className="payment-panel flex flex-col gap-3 border-red-200 bg-red-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {failedCount} failed transaction{failedCount > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-300/80">
                  Review failed items before they age into manual follow-up queues.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/payments/history?status=FAILED')}
              className="payment-action-button justify-center border-red-200 bg-white/90 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
            >
              View Details
            </button>
          </div>
        ) : null}

        <div className="payment-workspace-shell space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.95fr)]">
            <section className="payment-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Payment Volume (Last 7 Days)</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Transaction counts from recent transfer activity, useful for spotting late-day spikes.
                  </p>
                </div>
                <div className="payment-step-chip-row mt-0">
                  <span className="payment-step-chip">{volumeData.length || 0} plotted day{volumeData.length === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="mt-5">
                {volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} name="Transactions" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="payment-empty-state min-h-[260px]">
                    <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium text-foreground">No transaction data available</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Recent transfer volume will render here once activity starts flowing through the module.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-6">
              <section className="payment-panel p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jump straight into the most common payment operations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {quickActionsGrid.map((action) => (
                    <button
                      key={action.path}
                      onClick={() => navigate(action.path)}
                      className="payment-selection-card flex h-full flex-col items-start gap-3"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Open workflow</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="payment-panel p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Payment Channels</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Supporting rails, history views, and settlement tools.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {paymentChannels.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      className="payment-selection-card flex items-center justify-between gap-3"
                    >
                      <span className="text-sm font-medium text-foreground">{link.label}</span>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="payment-panel overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest transfer activity across inbound and outbound flows.
                </p>
              </div>
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
              <div className="payment-empty-state border-0 bg-transparent py-14 shadow-none">
                <Clock className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-foreground">No recent transactions</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    New transfer activity will appear here once payments are initiated.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {recentTransfers.slice(0, 8).map((txn) => {
                  const isCredit = txn.direction === 'CREDIT';
                  return (
                    <li key={txn.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        isCredit ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                 : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                      )}>
                        {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{txn.beneficiaryName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {txn.reference ?? txn.narration ?? txn.beneficiaryAccount}
                        </p>
                      </div>

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
          </section>
        </div>
      </div>
    </>
  );
}
