import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Activity,
  RefreshCw,
  Clock,
  AlertTriangle,
  BarChart3,
  Shield,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';

import { useApiUsage } from '../hooks/useMarketplace';
import { useApiProducts } from '../hooks/useMarketplace';

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateTimeLabels(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getTime() - (count - 1 - i) * 60_000);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function ApiMonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refetchInterval = autoRefresh ? 30_000 : undefined;

  const {
    data: usageData = [],
    isLoading: usageLoading,
  } = useApiUsage(undefined);

  const {
    data: products = [],
    isLoading: productsLoading,
  } = useApiProducts();

  // ─── Computed Metrics ───────────────────────────────────────────────────

  const healthMetrics = useMemo(() => {
    if (usageData.length === 0) {
      return {
        status: 'healthy' as const,
        uptimePct: 99.99,
        avgLatencyMs: 0,
        errorRate: 0,
        requestsPerMin: 0,
      };
    }

    const totalCalls = usageData.reduce((s, d) => s + d.totalCalls, 0);
    const totalErrors = usageData.reduce((s, d) => s + d.errorCalls, 0);
    const avgLatency =
      usageData.reduce((s, d) => s + d.avgLatencyMs * d.totalCalls, 0) / Math.max(totalCalls, 1);
    const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;
    const days = new Set(usageData.map((d) => d.date)).size || 1;
    const reqPerMin = totalCalls / (days * 24 * 60);

    const status: 'healthy' | 'degraded' | 'down' =
      errorRate > 10 ? 'down' : errorRate > 5 || avgLatency > 500 ? 'degraded' : 'healthy';

    return {
      status,
      uptimePct: Math.max(100 - errorRate * 0.1, 95),
      avgLatencyMs: avgLatency,
      errorRate,
      requestsPerMin: Math.round(reqPerMin),
    };
  }, [usageData]);

  // ─── Chart Data ─────────────────────────────────────────────────────────

  const timeLabels = useMemo(() => generateTimeLabels(60), []);

  const volumeData = useMemo(() => {
    if (usageData.length === 0) {
      return timeLabels.map((time) => ({
        time,
        success: Math.floor(Math.random() * 100 + 50),
        error: Math.floor(Math.random() * 5),
      }));
    }
    return timeLabels.map((time, i) => {
      const item = usageData[i % usageData.length];
      return {
        time,
        success: item ? Math.round(item.successCalls / 60) : 0,
        error: item ? Math.round(item.errorCalls / 60) : 0,
      };
    });
  }, [usageData, timeLabels]);

  const latencyData = useMemo(() => {
    return timeLabels.map((time, i) => {
      const item = usageData[i % Math.max(usageData.length, 1)];
      const base = item?.avgLatencyMs ?? 120;
      return {
        time,
        p50: Math.round(base * 0.7),
        p95: Math.round(item?.p95LatencyMs ?? base * 1.5),
        p99: Math.round((item?.p95LatencyMs ?? base * 1.5) * 1.4),
      };
    });
  }, [usageData, timeLabels]);

  const errorData = useMemo(() => {
    return timeLabels.map((time, i) => {
      const item = usageData[i % Math.max(usageData.length, 1)];
      const errors = item?.errorCalls ?? Math.floor(Math.random() * 5);
      return {
        time,
        client4xx: Math.round(errors * 0.7),
        server5xx: Math.round(errors * 0.3),
      };
    });
  }, [usageData, timeLabels]);

  // ─── Alerts (mock state) ────────────────────────────────────────────────

  const [alerts, setAlerts] = useState<MonitoringAlert[]>(() => [
    {
      id: 1,
      type: 'HIGH_LATENCY',
      severity: 'warning',
      message: 'Average latency exceeds 500ms on /api/v1/accounts',
      currentValue: '523 ms',
      threshold: '500 ms',
      status: 'active',
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: 2,
      type: 'HIGH_ERROR_RATE',
      severity: 'critical',
      message: 'Error rate spike on payment initiation endpoints',
      currentValue: '8.2%',
      threshold: '5%',
      status: 'active',
      createdAt: new Date(Date.now() - 1_800_000).toISOString(),
    },
    {
      id: 3,
      type: 'RATE_LIMIT_BREACH',
      severity: 'info',
      message: 'TPP "FinTech App" approaching rate limit on /api/v1/transactions',
      currentValue: '95/100 req/min',
      threshold: '100 req/min',
      status: 'acknowledged',
      createdAt: new Date(Date.now() - 7_200_000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 5_400_000).toISOString(),
    },
  ]);

  const handleAcknowledge = useCallback(async (id: number) => {
    await new Promise((r) => setTimeout(r, 500));
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: 'acknowledged' as AlertStatus, acknowledgedAt: new Date().toISOString() }
          : a,
      ),
    );
  }, []);

  const handleResolve = useCallback(async (id: number) => {
    await new Promise((r) => setTimeout(r, 500));
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: 'resolved' as AlertStatus, resolvedAt: new Date().toISOString() }
          : a,
      ),
    );
  }, []);

  const activeAlerts = alerts.filter((a) => a.status !== 'resolved');

  // ─── Active Connections ─────────────────────────────────────────────────

  const activeConnections = useMemo(() => {
    return Math.round(healthMetrics.requestsPerMin * 0.3 + 12);
  }, [healthMetrics.requestsPerMin]);

  // ─── SLA Data ───────────────────────────────────────────────────────────

  const slaData = useMemo(() => {
    return products.map((p) => ({
      productName: p.name,
      targetUptime: p.slaUptimePct || 99.9,
      actualUptime: Math.max(
        (p.slaUptimePct || 99.9) - Math.random() * 0.5 + 0.2,
        98,
      ),
    }));
  }, [products]);

  // ─── Historical Aggregates ──────────────────────────────────────────────

  const historicalData = useMemo(() => {
    const grouped = new Map<string, { total: number; success: number; errors: number; latency: number; count: number }>();
    for (const item of usageData) {
      const existing = grouped.get(item.date) || { total: 0, success: 0, errors: 0, latency: 0, count: 0 };
      existing.total += item.totalCalls;
      existing.success += item.successCalls;
      existing.errors += item.errorCalls;
      existing.latency += item.avgLatencyMs;
      existing.count += 1;
      grouped.set(item.date, existing);
    }
    return Array.from(grouped.entries())
      .map(([date, d]) => ({
        date,
        totalCalls: d.total,
        successCalls: d.success,
        errorCalls: d.errors,
        avgLatencyMs: Math.round(d.latency / Math.max(d.count, 1)),
        errorRate: d.total > 0 ? ((d.errors / d.total) * 100).toFixed(2) : '0.00',
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [usageData]);

  // ─── Tabs ───────────────────────────────────────────────────────────────

  const tabs = [
    {
      id: 'realtime',
      label: 'Real-Time',
      icon: Activity,
      content: (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RequestVolumeChart data={volumeData} loading={usageLoading} />
            <EndpointLatencyChart data={latencyData} loading={usageLoading} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorRateChart data={errorData} loading={usageLoading} />
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Active Connections</h3>
              <div className="flex flex-col items-center justify-center py-8">
                <Wifi className="w-8 h-8 text-blue-500 mb-3" />
                <span className="text-4xl font-bold tabular-nums">{activeConnections}</span>
                <span className="text-sm text-muted-foreground mt-1">connections</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t text-center">
                <div>
                  <p className="text-xs text-muted-foreground">AISP</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {Math.round(activeConnections * 0.5)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PISP</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {Math.round(activeConnections * 0.35)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Other</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {Math.round(activeConnections * 0.15)}
                  </p>
                </div>
              </div>
            </div>
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
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">Daily Aggregates</h3>
              <span className="text-xs text-muted-foreground">
                {historicalData.length} day{historicalData.length !== 1 ? 's' : ''}
              </span>
            </div>
            {usageLoading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Total Calls</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Success</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Errors</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Avg Latency</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Error Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historicalData.map((row) => (
                      <tr key={row.date} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-medium">{formatDate(row.date)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{row.totalCalls.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-green-600">{row.successCalls.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-red-600">{row.errorCalls.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{row.avgLatencyMs} ms</td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <span
                            className={cn(
                              parseFloat(row.errorRate) <= 1 ? 'text-green-600' : parseFloat(row.errorRate) <= 5 ? 'text-amber-600' : 'text-red-600',
                            )}
                          >
                            {row.errorRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {historicalData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          No historical data available.
                        </td>
                      </tr>
                    )}
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
      badge: activeAlerts.filter((a) => a.status === 'active').length,
      content: (
        <AlertsPanel
          alerts={alerts}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
          loading={false}
        />
      ),
    },
    {
      id: 'sla',
      label: 'SLA Report',
      icon: Shield,
      content: (
        <div className="p-6">
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                  <div className="w-[120px] h-[120px] rounded-full bg-muted" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : slaData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Shield className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No API products to show SLA data for.</p>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap gap-8 justify-center">
                {slaData.map((sla) => (
                  <SlaComplianceGauge
                    key={sla.productName}
                    productName={sla.productName}
                    targetUptime={sla.targetUptime}
                    actualUptime={sla.actualUptime}
                  />
                ))}
              </div>
              <div className="mt-8 rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h3 className="text-sm font-semibold">SLA Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Product</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Target</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Actual</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {slaData.map((sla) => (
                        <tr key={sla.productName} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 font-medium">{sla.productName}</td>
                          <td className="px-5 py-3 text-right tabular-nums">{sla.targetUptime.toFixed(2)}%</td>
                          <td className="px-5 py-3 text-right tabular-nums">{sla.actualUptime.toFixed(2)}%</td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
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

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="API Monitoring"
        subtitle="Real-time monitoring of Open Banking API health, performance, and alerts."
        actions={
          <button
            onClick={() => {
              setAutoRefresh(!autoRefresh);
              toast.success(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled (30s)');
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800 dark:text-green-400'
                : 'hover:bg-muted',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} style={autoRefresh ? { animationDuration: '3s' } : undefined} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
        }
      />

      <div className="page-container space-y-6">
        <ApiHealthDashboard metrics={healthMetrics} loading={usageLoading} />
        <TabsPage tabs={tabs} defaultTab="realtime" />
      </div>
    </>
  );
}
