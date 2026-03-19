import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { usePaymentAnalytics } from '../hooks/usePaymentAnalytics';
import { PaymentStatsCards } from '../components/payments/PaymentStatsCards';
import { VolumeTrendChart } from '../components/payments/VolumeTrendChart';
import { ChannelBreakdownCharts } from '../components/payments/ChannelBreakdownCharts';
import { FailureAnalysisCharts } from '../components/payments/FailureAnalysisCharts';
import { RailsUtilizationTable } from '../components/payments/RailsUtilizationTable';
import { ReconciliationSummaryTable } from '../components/payments/ReconciliationSummaryTable';

export function PaymentAnalyticsPage() {
  const {
    dateRange,
    setDateRange,
    groupBy,
    setGroupBy,
    stats,
    statsLoading,
    trend,
    trendLoading,
    channels,
    channelsLoading,
    failureReasons,
    topFailed,
    failuresLoading,
    rails,
    railsLoading,
    reconciliation,
    reconciliationLoading,
  } = usePaymentAnalytics();

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
    } else if (range.from) {
      setDateRange({ from: range.from, to: range.from });
    }
  };

  return (
    <>
      <PageHeader
        title="Payment Analytics"
        subtitle={`${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`}
        actions={
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to }}
            onChange={handleDateRangeChange}
          />
        }
      />

      <div className="page-container space-y-6">
        <PaymentStatsCards stats={stats} isLoading={statsLoading} />

        <VolumeTrendChart
          data={trend}
          groupBy={groupBy}
          onGroupByChange={(g) => setGroupBy(g as 'day' | 'week' | 'month')}
          isLoading={trendLoading}
        />

        <ChannelBreakdownCharts data={channels} isLoading={channelsLoading} />

        <FailureAnalysisCharts
          reasons={failureReasons}
          topFailed={topFailed}
          isLoading={failuresLoading}
        />

        <RailsUtilizationTable data={rails} isLoading={railsLoading} />

        <ReconciliationSummaryTable data={reconciliation} isLoading={reconciliationLoading} />
      </div>
    </>
  );
}
