import { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { DateRangePicker } from '@/components/shared';
import { channelAnalyticsApi } from '../api/channelAnalyticsApi';
import type {
  ChannelStats,
  ChannelVolume,
  ChannelMixPoint,
  HourlyHeatmapCell,
  ChannelSuccessRate,
  SuccessRateTrendPoint,
  DigitalAdoption,
  TransactionType,
  MigrationData,
} from '../api/channelAnalyticsApi';
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
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to:   new Date(),
  });

  const [stats,           setStats]          = useState<ChannelStats | undefined>();
  const [volumes,         setVolumes]        = useState<ChannelVolume[]>([]);
  const [mixTrend,        setMixTrend]       = useState<ChannelMixPoint[]>([]);
  const [heatmap,         setHeatmap]        = useState<HourlyHeatmapCell[]>([]);
  const [successRates,    setSuccessRates]   = useState<ChannelSuccessRate[]>([]);
  const [successTrend,    setSuccessTrend]   = useState<SuccessRateTrendPoint[]>([]);
  const [adoption,        setAdoption]       = useState<DigitalAdoption | undefined>();
  const [txnTypes,        setTxnTypes]       = useState<TransactionType[]>([]);
  const [migrations,      setMigrations]     = useState<MigrationData[]>([]);
  const [migrationScore,  setMigrationScore] = useState('');

  const [loading, setLoading] = useState({
    stats: true, volumes: true, mixTrend: true, heatmap: true,
    successRates: true, successTrend: true, adoption: true,
    txnTypes: true, migrations: true,
  });

  const params = {
    dateFrom: format(dateRange.from, 'yyyy-MM-dd'),
    dateTo:   format(dateRange.to,   'yyyy-MM-dd'),
  };

  useEffect(() => {
    setLoading((l) => ({ ...l, stats: true }));
    channelAnalyticsApi.getChannelStats(params).then((d) => {
      setStats(d);
      setLoading((l) => ({ ...l, stats: false }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dateFrom, params.dateTo]);

  useEffect(() => {
    setLoading((l) => ({ ...l, volumes: true }));
    channelAnalyticsApi.getChannelVolumes(params).then((d) => {
      setVolumes(d);
      setLoading((l) => ({ ...l, volumes: false }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dateFrom, params.dateTo]);

  useEffect(() => {
    setLoading((l) => ({ ...l, heatmap: true, successRates: true, txnTypes: true }));
    channelAnalyticsApi.getHourlyHeatmap(params).then((d) => {
      setHeatmap(d);
      setLoading((l) => ({ ...l, heatmap: false }));
    });
    channelAnalyticsApi.getChannelSuccessRates(params).then((d) => {
      setSuccessRates(d);
      setLoading((l) => ({ ...l, successRates: false }));
    });
    channelAnalyticsApi.getTransactionTypes(params).then((d) => {
      setTxnTypes(d);
      setLoading((l) => ({ ...l, txnTypes: false }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dateFrom, params.dateTo]);

  // Static data — load once
  useEffect(() => {
    channelAnalyticsApi.getChannelMixTrend().then((d) => {
      setMixTrend(d);
      setLoading((l) => ({ ...l, mixTrend: false }));
    });
    channelAnalyticsApi.getSuccessRateTrend().then((d) => {
      setSuccessTrend(d);
      setLoading((l) => ({ ...l, successTrend: false }));
    });
    channelAnalyticsApi.getDigitalAdoption().then((d) => {
      setAdoption(d);
      setLoading((l) => ({ ...l, adoption: false }));
    });
    channelAnalyticsApi.getMigrationData().then((d) => {
      setMigrations(d.migrations);
      setMigrationScore(d.migrationScore);
      setLoading((l) => ({ ...l, migrations: false }));
    });
  }, []);

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
        <ChannelStatsCards stats={stats} isLoading={loading.stats} />

        {/* Volume donut + mix trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChannelVolumeDonut volumes={volumes} isLoading={loading.volumes} />
          <ChannelMixTrend    data={mixTrend}   isLoading={loading.mixTrend} />
        </div>

        {/* Hourly heatmap */}
        <HourlyHeatmap data={heatmap} isLoading={loading.heatmap} />

        {/* Success rate table */}
        <SuccessRateTable rates={successRates} isLoading={loading.successRates} />

        {/* Success rate trend + SLA summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SuccessRateTrend data={successTrend} isLoading={loading.successTrend} />
          </div>
          <SlaCard rates={successRates} isLoading={loading.successRates} />
        </div>

        {/* Digital adoption */}
        <DigitalAdoptionMetrics data={adoption} isLoading={loading.adoption} />

        {/* Transaction types */}
        <TransactionTypeTable types={txnTypes} isLoading={loading.txnTypes} />

        {/* Migration sankey */}
        {!loading.migrations && migrations.length > 0 && (
          <ChannelMigrationSankey data={migrations} migrationScore={migrationScore} />
        )}
      </div>
    </>
  );
}
