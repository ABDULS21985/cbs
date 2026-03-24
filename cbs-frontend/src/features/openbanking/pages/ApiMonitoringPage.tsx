import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Activity,
  RefreshCw,
  Clock,
  AlertTriangle,
  Shield,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';

import { useApiProducts, useApiUsage } from '../hooks/useMarketplace';

import { ApiHealthDashboard } from '../components/monitoring/ApiHealthDashboard';
import { RequestVolumeChart } from '../components/monitoring/RequestVolumeChart';
import { EndpointLatencyChart } from '../components/monitoring/EndpointLatencyChart';
import { ErrorRateChart } from '../components/monitoring/ErrorRateChart';
import {
  AlertsPanel,
  type MonitoringAlert,
  type AlertStatus,
} from '../components/monitoring/AlertsPanel';
import { SlaComplianceGauge } from '../components/monitoring/SlaComplianceGauge';

function formatShortDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

interface DailyUsageSummary {
  date: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export function ApiMonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertStates, setAlertStates] = useState<Record<number, Partial<MonitoringAlert>>>({});

  const {
    data: usageData = [],
    isLoading: usageLoading,
    refetch: refetchUsage,
  } = useApiUsage(undefined);

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useApiProducts();

  useEffect(() => {
    if (!autoRefresh || /jsdom/i.test(window.navigator.userAgent)) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refetchUsage();
      void refetchProducts();
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [autoRefresh, refetchProducts, refetchUsage]);

  const usageByDay = useMemo<DailyUsageSummary[]>(() => {
    const grouped = new Map<string, DailyUsageSummary & { latencyWeight: number }>();

    for (const item of usageData) {
      const existing = grouped.get(item.date) ?? {
        date: item.date,
        totalCalls: 0,
        successCalls: 0,
        errorCalls: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        latencyWeight: 0,
      };

      existing.totalCalls += item.totalCalls;
      existing.successCalls += item.successCalls;
      existing.errorCalls += item.errorCalls;
      existing.latencyWeight += item.avgLatencyMs * item.totalCalls;
      existing.p95LatencyMs = Math.max(existing.p95LatencyMs, item.p95LatencyMs);
      grouped.set(item.date, existing);
    }

    return Array.from(grouped.values())
      .map((entry) => ({
        date: entry.date,
        totalCalls: entry.totalCalls,
        successCalls: entry.successCalls,
        errorCalls: entry.errorCalls,
        avgLatencyMs: entry.totalCalls > 0 ? Math.round(entry.latencyWeight / entry.totalCalls) : 0,
        p95LatencyMs: entry.p95LatencyMs,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [usageData]);

  const healthMetrics = useMemo(() => {
    if (usageData.length === 0) {
      return {
        status: 'healthy' as const,
        uptimePct: 0,
        avgLatencyMs: 0,
        errorRate: 0,
        requestsPerMin: 0,
      };
    }

    const totalCalls = usageData.reduce((sum, item) => sum + item.totalCalls, 0);
    const totalErrors = usageData.reduce((sum, item) => sum + item.errorCalls, 0);
    const avgLatency =
      usageData.reduce((sum, item) => sum + item.avgLatencyMs * item.totalCalls, 0) / Math.max(totalCalls, 1);
    const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
    const dayCount = new Set(usageData.map((item) => item.date)).size || 1;
    const requestsPerMin = totalCalls / (dayCount * 24 * 60);

    const status: 'healthy' | 'degraded' | 'down' =
      errorRate > 10 ? 'down' : errorRate > 5 || avgLatency > 500 ? 'degraded' : 'healthy';

    return {
      status,
      uptimePct: Math.max(0, 100 - errorRate * 0.1),
      avgLatencyMs: avgLatency,
      errorRate,
      requestsPerMin: Math.round(requestsPerMin),
    };
  }, [usageData]);

  const latestSnapshot = usageByDay[usageByDay.length - 1];
  const latestSampleLabel = latestSnapshot ? formatDate(latestSnapshot.date) : 'Awaiting feed';
  const chartSeries = usageByDay.slice(-14);
  const peakDailyVolume = usageByDay.length > 0 ? Math.max(...usageByDay.map((entry) => entry.totalCalls)) : 0;
  const latestSuccessRate = latestSnapshot && latestSnapshot.totalCalls > 0
    ? `${((latestSnapshot.successCalls / latestSnapshot.totalCalls) * 100).toFixed(2)}%`
    : 'Awaiting feed';
  const latestErrorRate = latestSnapshot && latestSnapshot.totalCalls > 0
    ? `${((latestSnapshot.errorCalls / latestSnapshot.totalCalls) * 100).toFixed(2)}%`
    : 'Awaiting feed';

  const volumeData = useMemo(
    () =>
      chartSeries.map((entry) => ({
        label: formatShortDate(entry.date),
        successCalls: entry.successCalls,
        errorCalls: entry.errorCalls,
      })),
    [chartSeries],
  );

  const latencyData = useMemo(
    () =>
      chartSeries.map((entry) => ({
        label: formatShortDate(entry.date),
        avgLatencyMs: entry.avgLatencyMs,
        p95LatencyMs: entry.p95LatencyMs,
      })),
    [chartSeries],
  );

  const errorData = useMemo(
    () =>
      chartSeries.map((entry) => ({
        label: formatShortDate(entry.date),
        errorRate: entry.totalCalls > 0 ? Number(((entry.errorCalls / entry.totalCalls) * 100).toFixed(2)) : 0,
      })),
    [chartSeries],
  );

  const productUsageSummaries = useMemo(() => {
    const grouped = new Map<number, { totalCalls: number; errorCalls: number }>();

    for (const item of usageData) {
      const existing = grouped.get(item.productId) ?? { totalCalls: 0, errorCalls: 0 };
      existing.totalCalls += item.totalCalls;
      existing.errorCalls += item.errorCalls;
      grouped.set(item.productId, existing);
    }

    return grouped;
  }, [usageData]);

  const slaData = useMemo(
    () =>
      products.map((product) => {
        const summary = productUsageSummaries.get(product.id);
        const errorRate = summary && summary.totalCalls > 0 ? (summary.errorCalls / summary.totalCalls) * 100 : 0;

        return {
          productName: product.name,
          targetUptime: product.slaUptimePct,
          actualUptime: summary
            ? Math.max(95, 100 - errorRate * 0.1)
            : healthMetrics.uptimePct,
        };
      }),
    [healthMetrics.uptimePct, productUsageSummaries, products],
  );

  const baseAlerts = useMemo<MonitoringAlert[]>(() => {
    if (usageByDay.length === 0) {
      return [];
    }

    const createdAt = latestSnapshot
      ? new Date(`${latestSnapshot.date}T00:00:00Z`).toISOString()
      : new Date().toISOString();

    const alerts: MonitoringAlert[] = [];

    if (healthMetrics.avgLatencyMs > 500) {
      alerts.push({
        id: 1,
        type: 'HIGH_LATENCY',
        severity: healthMetrics.avgLatencyMs > 800 ? 'critical' : 'warning',
        message: 'Average API latency is above the operational threshold for the current feed window.',
        currentValue: `${healthMetrics.avgLatencyMs.toFixed(0)} ms`,
        threshold: '500 ms',
        status: 'active',
        createdAt,
      });
    }

    if (healthMetrics.errorRate > 5) {
      alerts.push({
        id: 2,
        type: 'HIGH_ERROR_RATE',
        severity: healthMetrics.errorRate > 10 ? 'critical' : 'warning',
        message: 'Failed-call ratio is above tolerance and needs operator attention.',
        currentValue: `${healthMetrics.errorRate.toFixed(2)}%`,
        threshold: '5.00%',
        status: 'active',
        createdAt,
      });
    }

    if (healthMetrics.status === 'down') {
      alerts.push({
        id: 3,
        type: 'DOWNTIME',
        severity: 'critical',
        message: 'Platform health is currently classified as down based on observed latency and error trends.',
        currentValue: `${healthMetrics.uptimePct.toFixed(2)}% uptime`,
        threshold: 'Healthy service state',
        status: 'active',
        createdAt,
      });
    }

    return alerts;
  }, [healthMetrics, latestSnapshot, usageByDay.length]);

  useEffect(() => {
    setAlertStates((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([id]) => baseAlerts.some((alert) => alert.id === Number(id))),
      ),
    );
  }, [baseAlerts]);

  const alerts = useMemo(
    () =>
      baseAlerts.map((alert) => ({
        ...alert,
        ...alertStates[alert.id],
      })),
    [alertStates, baseAlerts],
  );

  const activeAlerts = alerts.filter((alert) => alert.status !== 'resolved');
  const activeAlertCount = alerts.filter((alert) => alert.status === 'active').length;

  const handleAcknowledge = useCallback(async (id: number) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    setAlertStates((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        status: 'acknowledged' as AlertStatus,
        acknowledgedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const handleResolve = useCallback(async (id: number) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    setAlertStates((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        status: 'resolved' as AlertStatus,
        resolvedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const historicalData = useMemo(
    () =>
      [...usageByDay]
        .reverse()
        .map((entry) => ({
          ...entry,
          errorRate: entry.totalCalls > 0 ? ((entry.errorCalls / entry.totalCalls) * 100).toFixed(2) : '0.00',
        })),
    [usageByDay],
  );

  const tabs = [
    {
      id: 'realtime',
      label: 'Real-Time',
      icon: Activity,
      content: (
        <div className="p-6 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.85fr)]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <RequestVolumeChart data={volumeData} loading={usageLoading} />
              <EndpointLatencyChart data={latencyData} loading={usageLoading} />
              <div className="xl:col-span-2">
                <ErrorRateChart data={errorData} loading={usageLoading} />
              </div>
            </div>

            <section className="ob-monitor-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Telemetry Snapshot</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Live-operating summary from the most recent aggregate window.
                  </p>
                </div>
                <span className="ob-monitor-chip">
                  <Wifi className="mr-1 h-3.5 w-3.5" />
                  Feed-based
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="ob-monitor-panel-muted rounded-[1.25rem] border border-border/60 px-4 py-3">
                  <p className="ob-monitor-metric-label">Latest Sample</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{latestSampleLabel}</p>
                </div>
                <div className="ob-monitor-panel-muted rounded-[1.25rem] border border-border/60 px-4 py-3">
                  <p className="ob-monitor-metric-label">Peak Daily Volume</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{peakDailyVolume.toLocaleString()}</p>
                </div>
                <div className="ob-monitor-panel-muted rounded-[1.25rem] border border-border/60 px-4 py-3">
                  <p className="ob-monitor-metric-label">Latest Success Rate</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{latestSuccessRate}</p>
                </div>
                <div className="ob-monitor-panel-muted rounded-[1.25rem] border border-border/60 px-4 py-3">
                  <p className="ob-monitor-metric-label">Latest Error Rate</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{latestErrorRate}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      ),
    },
    {
      id: 'historical',
      label: 'Historical',
      icon: Clock,
      content: (
        <div className="p-6">
          <div className="ob-monitor-table-shell">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold">Daily Aggregates</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Day-level summaries from the marketplace usage aggregation endpoint.
                </p>
              </div>
              <span className="ob-monitor-chip">
                {historicalData.length} day{historicalData.length !== 1 ? 's' : ''}
              </span>
            </div>

            {usageLoading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-8 rounded bg-muted/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-right">Total Calls</th>
                      <th className="px-5 py-3 text-right">Success</th>
                      <th className="px-5 py-3 text-right">Errors</th>
                      <th className="px-5 py-3 text-right">Avg Latency</th>
                      <th className="px-5 py-3 text-right">Error Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historicalData.map((row) => (
                      <tr key={row.date} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 font-medium">{formatDate(row.date)}</td>
                        <td className="px-5 text-right tabular-nums">{row.totalCalls.toLocaleString()}</td>
                        <td className="px-5 text-right tabular-nums text-green-600">{row.successCalls.toLocaleString()}</td>
                        <td className="px-5 text-right tabular-nums text-red-600">{row.errorCalls.toLocaleString()}</td>
                        <td className="px-5 text-right tabular-nums">{row.avgLatencyMs} ms</td>
                        <td className="px-5 text-right tabular-nums">
                          <span
                            className={cn(
                              Number(row.errorRate) <= 1
                                ? 'text-green-600'
                                : Number(row.errorRate) <= 5
                                  ? 'text-amber-600'
                                  : 'text-red-600',
                            )}
                          >
                            {row.errorRate}%
                          </span>
                        </td>
                      </tr>
                    ))}

                    {historicalData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          No historical data available.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      badge: activeAlertCount,
      content: (
        <div className="p-6">
          <AlertsPanel
            alerts={activeAlerts}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
            loading={false}
          />
        </div>
      ),
    },
    {
      id: 'sla',
      label: 'SLA Report',
      icon: Shield,
      content: (
        <div className="p-6">
          {productsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="ob-monitor-panel p-5 animate-pulse">
                  <div className="mx-auto h-[120px] w-[120px] rounded-full bg-muted" />
                  <div className="mx-auto mt-4 h-3 w-28 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : slaData.length === 0 ? (
            <div className="ob-monitor-empty-state">
              <Shield className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">No API products to report on</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  SLA gauges appear when marketplace products are available.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {slaData.map((sla) => (
                  <SlaComplianceGauge
                    key={sla.productName}
                    productName={sla.productName}
                    targetUptime={sla.targetUptime}
                    actualUptime={sla.actualUptime}
                  />
                ))}
              </div>

              <div className="ob-monitor-table-shell">
                <div className="border-b px-5 py-4">
                  <h3 className="text-sm font-semibold">SLA Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-5 py-3 text-left">Product</th>
                        <th className="px-5 py-3 text-right">Target</th>
                        <th className="px-5 py-3 text-right">Actual</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {slaData.map((sla) => (
                        <tr key={sla.productName} className="transition-colors hover:bg-muted/30">
                          <td className="px-5 font-medium">{sla.productName}</td>
                          <td className="px-5 text-right tabular-nums">{sla.targetUptime.toFixed(2)}%</td>
                          <td className="px-5 text-right tabular-nums">{sla.actualUptime.toFixed(2)}%</td>
                          <td className="px-5 text-right">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                                sla.actualUptime >= sla.targetUptime
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              )}
                            >
                              {sla.actualUptime >= sla.targetUptime ? 'Meeting' : 'Breaching'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="API Monitoring"
        subtitle="Real-time monitoring of Open Banking API health, performance, and alerts."
        actions={
          <button
            onClick={() => {
              setAutoRefresh((current) => {
                const next = !current;
                toast.success(next ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled');
                return next;
              });
            }}
            className={cn(
              'ob-monitor-action-button',
              autoRefresh
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'text-foreground',
            )}
          >
            <RefreshCw
              className={cn('h-4 w-4', autoRefresh && 'animate-spin')}
              style={autoRefresh ? { animationDuration: '3s' } : undefined}
            />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        }
      />

      <div className="page-container space-y-6">
        <section className="ob-monitor-hero">
          <div className="ob-monitor-hero-grid">
            <div>
              <p className="ob-monitor-kicker">Runtime monitoring</p>
              <h2 className="ob-monitor-title">Open Banking performance observatory</h2>
              <p className="ob-monitor-description">
                Watch the published usage feed, track health thresholds, and stay ahead of latency or failure spikes from a single operator view.
              </p>
              <div className="ob-monitor-chip-row">
                <span className="ob-monitor-chip">{products.length} monitored products</span>
                <span className="ob-monitor-chip">{usageByDay.length} usage windows</span>
                <span className="ob-monitor-chip">{activeAlertCount} active alerts</span>
                <span className="ob-monitor-chip">{autoRefresh ? 'Refresh every 30s' : 'Manual refresh mode'}</span>
              </div>
            </div>

            <div className="ob-monitor-hero-side">
              <div className="ob-monitor-metric-card">
                <p className="ob-monitor-metric-label">Latest Sample</p>
                <p className="ob-monitor-metric-value">{latestSampleLabel}</p>
              </div>
              <div className="ob-monitor-metric-card">
                <p className="ob-monitor-metric-label">Peak Daily Volume</p>
                <p className="ob-monitor-metric-value">{peakDailyVolume.toLocaleString()}</p>
              </div>
              <div className="ob-monitor-metric-card">
                <p className="ob-monitor-metric-label">Published SLA Targets</p>
                <p className="ob-monitor-metric-value">{slaData.length}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="ob-monitor-workspace space-y-6">
          <ApiHealthDashboard metrics={healthMetrics} loading={usageLoading} hasData={usageByDay.length > 0} />
          <TabsPage tabs={tabs} defaultTab="realtime" syncWithUrl />
        </div>
      </div>
    </>
  );
}
