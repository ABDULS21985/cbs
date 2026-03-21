import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, BarChart3, Percent, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker, EmptyState } from '@/components/shared';
import { ChartSkeleton } from '@/components/shared/ChartSkeleton';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { transactionApi, type Transaction } from '../api/transactionApi';
import { useTransactionAnalytics, type AnalyticsPeriodPreset } from '../hooks/useTransactionAnalytics';
import { createAccountUrlRef } from '../lib/urlAccountRef';

const TransactionVolumeChart = lazy(async () => {
  const module = await import('../components/analytics/TransactionVolumeChart');
  return { default: module.TransactionVolumeChart };
});
const SpendCategoryBreakdown = lazy(async () => {
  const module = await import('../components/analytics/SpendCategoryBreakdown');
  return { default: module.SpendCategoryBreakdown };
});
const ChannelPerformanceGrid = lazy(async () => {
  const module = await import('../components/analytics/ChannelPerformanceGrid');
  return { default: module.ChannelPerformanceGrid };
});
const VelocityHeatmap = lazy(async () => {
  const module = await import('../components/analytics/VelocityHeatmap');
  return { default: module.VelocityHeatmap };
});
const FailureAnalysisPanel = lazy(async () => {
  const module = await import('../components/analytics/FailureAnalysisPanel');
  return { default: module.FailureAnalysisPanel };
});
const TopAccountsTable = lazy(async () => {
  const module = await import('../components/analytics/TopAccountsTable');
  return { default: module.TopAccountsTable };
});

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriodPreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Custom' },
];

function buildSearchUrl(params: Record<string, string>) {
  return {
    pathname: '/payments/history',
    search: createSearchParams(params).toString(),
  };
}

function percentDelta(current: number, prior?: number | null) {
  if (prior === null || prior === undefined || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function formatDelta(delta: number | null) {
  if (delta === null) return null;
  const positive = delta >= 0;
  return {
    text: `${positive ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`,
    tone: positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    icon: positive ? ArrowUpRight : ArrowDownRight,
  };
}

function accountDrillParams(accountNumber: string, from: string, to: string) {
  return { acc: createAccountUrlRef(accountNumber), from, to };
}

function categoryDrillParams(category: string, from: string, to: string): Record<string, string> {
  switch (category) {
    case 'Transfers':
      return { type: 'TRANSFER', from, to };
    case 'Bills':
      return { q: 'bill', from, to };
    case 'Salaries':
      return { q: 'salary', from, to };
    case 'Fees':
      return { type: 'FEE', from, to };
    case 'Loan Repayments':
      return { q: 'loan repayment', from, to };
    case 'ATM Cash':
      return { ch: 'ATM', from, to };
    case 'Payments':
      return { type: 'PAYMENT', from, to };
    default:
      return { from, to };
  }
}

function drillCellMatches(transaction: Transaction, dayOfWeek: number, hour: number) {
  const parsed = new Date(transaction.dateTime);
  const isoDay = parsed.getDay() === 0 ? 7 : parsed.getDay();
  return isoDay === dayOfWeek && parsed.getHours() === hour;
}

function AnalyticsPanelFallback({ height = 320 }: { height?: number }) {
  return <ChartSkeleton height={height} />;
}

export function TransactionAnalyticsPage() {
  const navigate = useNavigate();
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ dayOfWeek: number; hour: number } | null>(null);
  const {
    period,
    setPeriod,
    dateRange,
    setDateRange,
    showComparison,
    setShowComparison,
    rangeParams,
    summary,
    priorSummary,
    volumeTrend,
    volumeTrendLoading,
    priorVolumeTrend,
    categories,
    categoriesLoading,
    priorCategories,
    channels,
    channelsLoading,
    priorChannels,
    topAccounts,
    topAccountsLoading,
    failures,
    failuresLoading,
    priorFailures,
    heatmap,
    heatmapLoading,
    isLoading,
  } = useTransactionAnalytics();

  useEffect(() => {
    document.title = 'Transaction Analytics | CBS';
  }, []);

  const drilldownQuery = useQuery({
    queryKey: ['transaction-analytics', 'cell-drilldown', rangeParams, selectedHeatmapCell],
    enabled: Boolean(selectedHeatmapCell),
    queryFn: async () => {
      if (!selectedHeatmapCell) return [];
      const response = await transactionApi.searchTransactions({
        dateFrom: rangeParams.from,
        dateTo: rangeParams.to,
        pageSize: 500,
      });
      return response.transactions.filter((transaction) =>
        drillCellMatches(transaction, selectedHeatmapCell.dayOfWeek, selectedHeatmapCell.hour)).slice(0, 25);
    },
  });

  const subtitle = `${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`;
  const cardRows = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Total Transactions',
        value: summary.totalTransactions.toLocaleString(),
        subValue: formatMoney(summary.totalValue),
        delta: formatDelta(percentDelta(summary.totalTransactions, priorSummary?.totalTransactions)),
        icon: BarChart3,
      },
      {
        label: 'Average Value',
        value: formatMoney(summary.averageTransactionValue),
        subValue: 'Average transaction size',
        delta: formatDelta(percentDelta(summary.averageTransactionValue, priorSummary?.averageTransactionValue)),
        icon: Wallet,
      },
      {
        label: 'Largest Single Transaction',
        value: summary.largestTransaction ? formatMoney(summary.largestTransaction.amount) : '—',
        subValue: summary.largestTransaction?.reference ?? 'No transactions in range',
        icon: ArrowUpRight,
        onClick: summary.largestTransaction ? () => navigate(buildSearchUrl({ q: summary.largestTransaction!.reference })) : undefined,
      },
      {
        label: 'Most Used Channel',
        value: summary.mostUsedChannel?.channel ?? '—',
        subValue: summary.mostUsedChannel ? `${formatPercent(summary.mostUsedChannel.percentage)} of traffic` : 'No transactions in range',
        icon: RefreshCw,
      },
      {
        label: 'Failure Rate',
        value: formatPercent(summary.failureRate),
        subValue: 'Failed transactions share',
        delta: formatDelta(percentDelta(summary.failureRate, priorSummary?.failureRate)),
        icon: Percent,
      },
      {
        label: 'Reversal Rate',
        value: formatPercent(summary.reversalRate),
        subValue: 'Reversed transaction share',
        delta: formatDelta(percentDelta(summary.reversalRate, priorSummary?.reversalRate)),
        icon: RotateCcw,
      },
    ];
  }, [navigate, priorSummary, summary]);

  return (
    <>
      <PageHeader
        title="Transaction Analytics"
        subtitle={subtitle}
        actions={(
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(event) => setShowComparison(event.target.checked)}
                className="rounded border-border"
              />
              Show Period Comparison
            </label>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to }}
              onChange={(range) => {
                if (range.from && range.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
          </div>
        )}
      />

      <div className="page-container space-y-6">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                period === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:bg-muted/50',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl border bg-card" />
            ))}
          </div>
        ) : !summary ? (
          <EmptyState title="No analytics data available" description="Try adjusting the date range." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cardRows.map((card) => {
              const Icon = card.icon;
              const DeltaIcon = card.delta?.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={card.onClick}
                  disabled={!card.onClick}
                  className={cn(
                    'rounded-xl border bg-card p-5 text-left',
                    card.onClick && 'transition-colors hover:border-primary/40 hover:bg-primary/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">{card.value}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{card.subValue}</p>
                      {card.delta && DeltaIcon && (
                        <p className={cn('mt-3 inline-flex items-center gap-1 text-xs font-medium', card.delta.tone)}>
                          <DeltaIcon className="h-3.5 w-3.5" />
                          {card.delta.text}
                        </p>
                      )}
                    </div>
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <Suspense fallback={<AnalyticsPanelFallback />}>
          <TransactionVolumeChart
            data={volumeTrend}
            priorData={showComparison ? priorVolumeTrend : []}
            isLoading={volumeTrendLoading}
            onPointClick={(point) => navigate(buildSearchUrl({
              from: point.periodStart,
              to: point.periodEnd,
            }))}
          />
        </Suspense>

        <div className="grid gap-6 xl:grid-cols-2">
          <Suspense fallback={<AnalyticsPanelFallback />}>
            <SpendCategoryBreakdown
              data={categories}
              priorData={showComparison ? priorCategories : null}
              isLoading={categoriesLoading}
              onCategoryClick={(category) => navigate(buildSearchUrl(categoryDrillParams(category, rangeParams.from, rangeParams.to)))}
            />
          </Suspense>
          <Suspense fallback={<AnalyticsPanelFallback />}>
            <ChannelPerformanceGrid
              data={channels}
              priorData={showComparison ? priorChannels : null}
              isLoading={channelsLoading}
            />
          </Suspense>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <Suspense fallback={<AnalyticsPanelFallback />}>
              <VelocityHeatmap
                data={heatmap}
                isLoading={heatmapLoading}
                onCellClick={(dayOfWeek, hour) => setSelectedHeatmapCell({ dayOfWeek, hour })}
              />
            </Suspense>

            {selectedHeatmapCell && (
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground">
                  Hour Drilldown: {heatmap?.cells.find((cell) => cell.dayOfWeek === selectedHeatmapCell.dayOfWeek)?.dayLabel} at {String(selectedHeatmapCell.hour).padStart(2, '0')}:00
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Matching transactions from the selected period. Showing up to 25 entries.
                </p>
                {drilldownQuery.isLoading ? (
                  <div className="mt-4 h-28 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Reference</th>
                          <th className="pb-2 font-medium">Date/Time</th>
                          <th className="pb-2 font-medium">Type</th>
                          <th className="pb-2 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownQuery.data ?? []).map((transaction) => (
                          <tr key={transaction.id} className="border-b last:border-b-0 hover:bg-muted/30">
                            <td className="py-2 font-mono text-xs text-foreground">{transaction.reference}</td>
                            <td className="py-2">{transaction.dateTime}</td>
                            <td className="py-2">{transaction.type}</td>
                            <td className="py-2 text-right">{formatMoney(transaction.debitAmount ?? transaction.creditAmount ?? 0)}</td>
                          </tr>
                        ))}
                        {(drilldownQuery.data ?? []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                              No transactions matched that hour bucket.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <Suspense fallback={<AnalyticsPanelFallback />}>
            <FailureAnalysisPanel
              data={failures}
              priorData={showComparison ? priorFailures : null}
              isLoading={failuresLoading}
            />
          </Suspense>
        </div>

        <Suspense fallback={<AnalyticsPanelFallback height={240} />}>
          <TopAccountsTable
            data={topAccounts}
            isLoading={topAccountsLoading}
            onAccountClick={(accountNumber) => navigate(buildSearchUrl(accountDrillParams(accountNumber, rangeParams.from, rangeParams.to)))}
          />
        </Suspense>
      </div>
    </>
  );
}
