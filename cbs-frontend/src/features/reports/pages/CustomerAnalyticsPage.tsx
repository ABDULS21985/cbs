import { useEffect } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { useCustomerAnalytics, getDatePresets } from '../hooks/useCustomerAnalytics';
import { CustomerStatsCards } from '../components/customers/CustomerStatsCards';
import { AcquisitionFunnel } from '../components/customers/AcquisitionFunnel';
import { CustomerGrowthTrend } from '../components/customers/CustomerGrowthTrend';
import { LifecycleDistribution } from '../components/customers/LifecycleDistribution';
import { SegmentProfitabilityTable } from '../components/customers/SegmentProfitabilityTable';
import { ChurnAnalysisCharts } from '../components/customers/ChurnAnalysisCharts';
import { AtRiskCustomersTable } from '../components/customers/AtRiskCustomersTable';
import { CrossSellMatrix } from '../components/customers/CrossSellMatrix';
import { ProductPenetrationBar } from '../components/customers/ProductPenetrationBar';
import { LtvHistogram } from '../components/customers/LtvHistogram';

export function CustomerAnalyticsPage() {
  useEffect(() => { document.title = 'Customer Analytics | CBS'; }, []);
  const {
    dateRange,
    setDateRange,
    stats,
    statsLoading,
    funnel,
    funnelLoading,
    growth,
    growthLoading,
    lifecycle,
    lifecycleLoading,
    segments,
    segmentsLoading,
    churnTrend,
    churnReasons,
    churnLoading,
    atRisk,
    atRiskLoading,
    crossSell,
    crossSellLoading,
    penetration,
    penetrationLoading,
    ltv,
    ltvLoading,
  } = useCustomerAnalytics();

  const presets = getDatePresets();

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
        title="Customer Analytics"
        subtitle={`${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-md border bg-muted/30 p-0.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => setDateRange(preset.range)}
                  className="px-2.5 py-1 text-xs font-medium rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-background"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <DateRangePicker
              value={{ from: dateRange.from, to: dateRange.to }}
              onChange={handleDateRangeChange}
            />
          </div>
        }
      />

      <div className="page-container space-y-6">
        <CustomerStatsCards stats={stats} isLoading={statsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AcquisitionFunnel data={funnel} isLoading={funnelLoading} />
          <LifecycleDistribution data={lifecycle} isLoading={lifecycleLoading} />
        </div>

        <CustomerGrowthTrend data={growth} isLoading={growthLoading} />

        <SegmentProfitabilityTable data={segments} isLoading={segmentsLoading} />

        <ChurnAnalysisCharts
          trend={churnTrend}
          reasons={churnReasons}
          isLoading={churnLoading}
        />

        <AtRiskCustomersTable data={atRisk} isLoading={atRiskLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CrossSellMatrix data={crossSell} isLoading={crossSellLoading} />
          <ProductPenetrationBar data={penetration} isLoading={penetrationLoading} />
        </div>

        <LtvHistogram data={ltv} isLoading={ltvLoading} />
      </div>
    </>
  );
}
