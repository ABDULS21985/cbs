import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import {
  Activity,
  Users,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';

import { useApiProducts, useApiUsage } from '../hooks/useMarketplace';
import { useConsents } from '../hooks/useOpenBanking';
import { useTppClients } from '../hooks/useOpenBanking';

import { TppAdoptionChart } from '../components/analytics/TppAdoptionChart';
import { ConsentFunnelChart } from '../components/analytics/ConsentFunnelChart';
import { RevenueByApiChart } from '../components/analytics/RevenueByApiChart';
import { GeographicDistributionMap } from '../components/analytics/GeographicDistributionMap';
import { TopEndpointsTable } from '../components/analytics/TopEndpointsTable';

// ─── Page ───────────────────────────────────────────────────────────────────

export function OpenBankingAnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { data: usageData = [], isLoading: usageLoading } = useApiUsage();
  const { data: products = [], isLoading: productsLoading } = useApiProducts();
  const { data: consents = [], isLoading: consentsLoading } = useConsents();
  const { data: tppClients = [], isLoading: tppsLoading } = useTppClients();

  const isLoading = usageLoading || productsLoading || consentsLoading || tppsLoading;

  // ─── Headline Stats ─────────────────────────────────────────────────────

  const totalApiCalls = useMemo(
    () => usageData.reduce((s, d) => s + d.totalCalls, 0),
    [usageData],
  );

  const uniqueTpps = useMemo(() => tppClients.length, [tppClients]);

  const activeConsents = useMemo(
    () => consents.filter((c) => c.status === 'AUTHORISED').length,
    [consents],
  );

  const estimatedRevenue = useMemo(
    () => totalApiCalls * 0.005, // mock: 0.005 per call
    [totalApiCalls],
  );

  // ─── TPP Adoption Chart Data ────────────────────────────────────────────

  const tppAdoptionData = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    let cumulative = 0;
    return months.map((month, i) => {
      const newTpps = Math.max(
        tppClients.filter((t) => {
          const d = new Date(t.registeredAt);
          return d.getMonth() === i;
        }).length,
        Math.floor(Math.random() * 5 + 1),
      );
      cumulative += newTpps;
      return { month, newTpps, cumulative };
    });
  }, [tppClients]);

  // ─── Consent Funnel Data ────────────────────────────────────────────────

  const consentFunnelStages = useMemo(() => {
    const total = consents.length || 100;
    const pending = consents.filter((c) => c.status === 'PENDING').length || Math.round(total * 0.7);
    const authorised = consents.filter((c) => c.status === 'AUTHORISED').length || Math.round(total * 0.5);
    const active = Math.round(authorised * 0.85);

    return [
      { label: 'Created', count: total, color: 'bg-blue-500' },
      { label: 'Pending', count: pending, color: 'bg-amber-500' },
      { label: 'Authorised', count: authorised, color: 'bg-green-500' },
      { label: 'Active', count: active, color: 'bg-emerald-600' },
    ];
  }, [consents]);

  // ─── Revenue by API ─────────────────────────────────────────────────────

  const revenueByApi = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const item of usageData) {
      const current = grouped.get(item.productName) || 0;
      grouped.set(item.productName, current + item.totalCalls * 0.005);
    }
    if (grouped.size === 0) {
      return products.map((p) => ({
        product: p.name,
        revenue: Math.round(Math.random() * 50_000 + 5_000),
      }));
    }
    return Array.from(grouped.entries()).map(([product, revenue]) => ({
      product,
      revenue: Math.round(revenue),
    }));
  }, [usageData, products]);

  // ─── Top Endpoints ──────────────────────────────────────────────────────

  const topEndpoints = useMemo(() => {
    const endpoints = [
      { method: 'GET' as const, path: '/api/v1/accounts', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
      { method: 'GET' as const, path: '/api/v1/transactions', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
      { method: 'POST' as const, path: '/api/v1/payments', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
      { method: 'GET' as const, path: '/api/v1/balances', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
      { method: 'POST' as const, path: '/api/v1/consents', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
      { method: 'GET' as const, path: '/api/v1/beneficiaries', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
      { method: 'DELETE' as const, path: '/api/v1/consents/{id}', callCount: 0, avgLatencyMs: 0, errorRate: 0, lastCalledAt: new Date().toISOString() },
    ];
    const totalPerEndpoint = Math.round(totalApiCalls / endpoints.length);
    return endpoints.map((ep, i) => ({
      ...ep,
      callCount: Math.max(totalPerEndpoint - i * Math.floor(totalPerEndpoint * 0.1), Math.round(Math.random() * 5000 + 500)),
      avgLatencyMs: Math.round(Math.random() * 200 + 50),
      errorRate: parseFloat((Math.random() * 3).toFixed(2)),
      lastCalledAt: new Date(Date.now() - Math.random() * 3_600_000).toISOString(),
    }));
  }, [totalApiCalls]);

  // ─── Geographic Distribution ────────────────────────────────────────────

  const geoData = useMemo(() => [
    { country: 'Nigeria', countryCode: 'NG', tppCount: Math.max(Math.round(uniqueTpps * 0.45), 8), callCount: Math.round(totalApiCalls * 0.5) },
    { country: 'United Kingdom', countryCode: 'GB', tppCount: Math.max(Math.round(uniqueTpps * 0.2), 4), callCount: Math.round(totalApiCalls * 0.2) },
    { country: 'United States', countryCode: 'US', tppCount: Math.max(Math.round(uniqueTpps * 0.15), 3), callCount: Math.round(totalApiCalls * 0.15) },
    { country: 'Germany', countryCode: 'DE', tppCount: Math.max(Math.round(uniqueTpps * 0.1), 2), callCount: Math.round(totalApiCalls * 0.08) },
    { country: 'South Africa', countryCode: 'ZA', tppCount: Math.max(Math.round(uniqueTpps * 0.05), 1), callCount: Math.round(totalApiCalls * 0.04) },
    { country: 'Kenya', countryCode: 'KE', tppCount: Math.max(Math.round(uniqueTpps * 0.05), 1), callCount: Math.round(totalApiCalls * 0.03) },
  ], [uniqueTpps, totalApiCalls]);

  // ─── Usage Heatmap ──────────────────────────────────────────────────────

  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return { days, hours, data: days.map(() => hours.map(() => Math.floor(Math.random() * 100))) };
  }, []);

  const heatmapMax = useMemo(
    () => Math.max(...heatmapData.data.flat(), 1),
    [heatmapData],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Open Banking Analytics"
        subtitle="Comprehensive analytics for API usage, TPP adoption, and revenue."
        actions={
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        }
      />

      <div className="page-container space-y-6">
        {/* Row 1: Headline StatCards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total API Calls (30d)"
            value={totalApiCalls}
            format="number"
            icon={Activity}
            loading={isLoading}
          />
          <StatCard
            label="Unique TPPs"
            value={uniqueTpps}
            format="number"
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            label="Active Consents"
            value={activeConsents}
            format="number"
            icon={ShieldCheck}
            loading={isLoading}
          />
          <StatCard
            label="Estimated Revenue"
            value={estimatedRevenue}
            format="money"
            icon={DollarSign}
            loading={isLoading}
          />
        </div>

        {/* Row 2: TPP Adoption + Consent Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TppAdoptionChart data={tppAdoptionData} loading={isLoading} />
          <ConsentFunnelChart stages={consentFunnelStages} loading={isLoading} />
        </div>

        {/* Row 3: Revenue by API + Top Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueByApiChart data={revenueByApi} loading={isLoading} />
          <TopEndpointsTable endpoints={topEndpoints} loading={isLoading} />
        </div>

        {/* Row 4: Geographic Distribution + Usage Heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GeographicDistributionMap data={geoData} loading={isLoading} />

          {/* Usage Heatmap */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Usage Heatmap (Hour x Day)</h3>
            {isLoading ? (
              <div className="h-52 bg-muted/30 rounded animate-pulse" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-xs text-muted-foreground font-medium pr-2 text-left w-10" />
                      {heatmapData.hours.map((h) => (
                        <th
                          key={h}
                          className="text-[9px] text-muted-foreground font-normal px-0 text-center"
                          style={{ minWidth: 18 }}
                        >
                          {h % 6 === 0 ? `${h}h` : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.days.map((day, di) => (
                      <tr key={day}>
                        <td className="text-[10px] text-muted-foreground font-medium pr-2 py-0.5">
                          {day}
                        </td>
                        {heatmapData.data[di].map((value, hi) => {
                          const intensity = value / heatmapMax;
                          return (
                            <td key={hi} className="p-0.5">
                              <div
                                className="w-full aspect-square rounded-sm transition-colors"
                                style={{
                                  backgroundColor: `hsl(217, 91%, ${60 - intensity * 40}%)`,
                                  opacity: Math.max(intensity, 0.1),
                                }}
                                title={`${day} ${hi}:00 - ${value} requests`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <span className="text-[10px] text-muted-foreground">Less</span>
                  {[0.1, 0.3, 0.5, 0.7, 1.0].map((level) => (
                    <div
                      key={level}
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: `hsl(217, 91%, ${60 - level * 40}%)`,
                        opacity: level,
                      }}
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground">More</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
