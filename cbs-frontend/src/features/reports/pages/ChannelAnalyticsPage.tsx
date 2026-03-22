import { useEffect } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { useChannelAnalytics } from '../hooks/useChannelAnalytics';
import type { ChannelSuccessRate } from '../api/channelAnalyticsApi';
import { ChannelStatsCards }       from '../components/channels/ChannelStatsCards';
import { ChannelVolumeDonut }       from '../components/channels/ChannelVolumeDonut';
import { ChannelMixTrend }          from '../components/channels/ChannelMixTrend';
import { HourlyHeatmap }            from '../components/channels/HourlyHeatmap';
import { SuccessRateTable }         from '../components/channels/SuccessRateTable';
import { SuccessRateTrend }         from '../components/channels/SuccessRateTrend';
import { DigitalAdoptionMetrics }   from '../components/channels/DigitalAdoptionMetrics';
import { TransactionTypeTable }     from '../components/channels/TransactionTypeTable';
import { ChannelMigrationSankey }   from '../components/channels/ChannelMigrationSankey';

// ─── Summary card beside success rate trend ───────────────────────────────────

interface SlaCardProps {
  rates: ChannelSuccessRate[] | undefined;
  isLoading: boolean;
}

function SlaCard({ rates, isLoading }: SlaCardProps) {
  if (isLoading || !rates) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 bg-muted/40 rounded" />)}
        </div>
      </div>
    );
  }

  const meetSla = rates.filter((r) => r.successPct >= 99).length;
  const belowSla = rates.filter((r) => r.successPct < 99).length;
  const worstChannel = rates[0]; // sorted worst first

  return (
    <div className="bg-card rounded-lg border border-border p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">SLA Summary</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{meetSla}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Channels ≥ 99%</div>
        </div>
        <div className={`rounded-lg border p-3 text-center ${belowSla > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-muted/20 border-border'}`}>
          <div className={`text-2xl font-bold ${belowSla > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
            {belowSla}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Below SLA target</div>
        </div>
      </div>

      {worstChannel && (
        <div>
          <div className="text-xs text-muted-foreground font-medium mb-1">Needs attention</div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <div className="font-semibold text-sm text-amber-800 dark:text-amber-200">{worstChannel.label}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {worstChannel.successPct.toFixed(2)}% success rate —{' '}
              {worstChannel.failed.toLocaleString()} failed,{' '}
              {worstChannel.timeout.toLocaleString()} timed out
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground font-medium mb-2">All channels</div>
        <div className="space-y-1.5">
          {[...rates].sort((a, b) => b.successPct - a.successPct).map((r) => (
            <div key={r.channel} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-muted-foreground">{r.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.successPct >= 99.5 ? 'bg-green-500' : r.successPct >= 99 ? 'bg-blue-500' : r.successPct >= 98 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(0, (r.successPct - 94) / 6) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right tabular-nums font-medium">{r.successPct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChannelAnalyticsPage() {
  useEffect(() => { document.title = 'Channel Analytics | CBS'; }, []);

  const {
    dateRange, setDateRange,
    stats, statsLoading,
    volumes, volumesLoading,
    mixTrend, mixTrendLoading,
    heatmap, heatmapLoading,
    successRates, successRatesLoading,
    successTrend, successTrendLoading,
    adoption, adoptionLoading,
    txnTypes, txnTypesLoading,
    migrations, migrationsLoading,
  } = useChannelAnalytics();

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
        title="Channel & Transaction Analytics"
        subtitle={`${format(dateRange.from, 'dd MMM yyyy')} — ${format(dateRange.to, 'dd MMM yyyy')}`}
        actions={
          <DateRangePicker
            value={{ from: dateRange.from, to: dateRange.to }}
            onChange={handleDateRangeChange}
          />
        }
      />

      <div className="page-container space-y-6">
        {/* Stats cards */}
        <ChannelStatsCards stats={stats} isLoading={statsLoading} />

        {/* Volume donut + mix trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChannelVolumeDonut volumes={volumes} isLoading={volumesLoading} />
          <ChannelMixTrend    data={mixTrend}   isLoading={mixTrendLoading} />
        </div>

        {/* Hourly heatmap */}
        <HourlyHeatmap data={heatmap} isLoading={heatmapLoading} />

        {/* Success rate table */}
        <SuccessRateTable rates={successRates} isLoading={successRatesLoading} />

        {/* Success rate trend + SLA summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SuccessRateTrend data={successTrend} isLoading={successTrendLoading} />
          </div>
          <SlaCard rates={successRates} isLoading={successRatesLoading} />
        </div>

        {/* Digital adoption */}
        <DigitalAdoptionMetrics data={adoption} isLoading={adoptionLoading} />

        {/* Transaction types */}
        <TransactionTypeTable types={txnTypes} isLoading={txnTypesLoading} />

        {/* Migration sankey */}
        {!migrationsLoading && migrations?.migrations && migrations.migrations.length > 0 && (
          <ChannelMigrationSankey data={migrations.migrations} migrationScore={migrations.migrationScore} />
        )}
      </div>
    </>
  );
}
