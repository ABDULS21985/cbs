import { Link } from 'react-router-dom';
import {
  TrendingUp,
  BarChart2,
  Activity,
  ShoppingCart,
  Landmark,
  Layers,
  ChevronRight,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { useTreasuryHomeData } from '../hooks/useTreasuryHome';
import type { DealerDesk, TreasuryDeal } from '../api/tradingApi';
import { formatDate } from '@/lib/formatters';

// ─── Quick Nav ─────────────────────────────────────────────────────────────────

interface NavCard {
  icon: React.ElementType;
  name: string;
  description: string;
  href: string;
  accent: string;
}

const NAV_CARDS: NavCard[] = [
  {
    icon: TrendingUp,
    name: 'Deals',
    description: 'Book, confirm, and settle treasury deals',
    href: '/treasury/deals',
    accent: 'text-blue-500',
  },
  {
    icon: Landmark,
    name: 'Fixed Income',
    description: 'Bond holdings, coupon calendar, and pricing',
    href: '/treasury/fixed-income',
    accent: 'text-violet-500',
  },
  {
    icon: Activity,
    name: 'Market Data',
    description: 'FX rates, money market, and feed status',
    href: '/treasury/market-data',
    accent: 'text-green-500',
  },
  {
    icon: ShoppingCart,
    name: 'Orders',
    description: 'Market orders, executions, and trade ops',
    href: '/treasury/orders',
    accent: 'text-amber-500',
  },
  {
    icon: BarChart2,
    name: 'Capital Markets',
    description: 'Market making, trading books, positions',
    href: '/treasury/capital-markets',
    accent: 'text-pink-500',
  },
  {
    icon: Layers,
    name: 'ALM',
    description: 'Asset/liability management and scenarios',
    href: '/treasury/alm',
    accent: 'text-teal-500',
  },
];

// ─── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({ label, value, suffix = '' }: { label: string; value: number | null | undefined; suffix?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value != null ? `${value.toFixed(2)}${suffix}` : '—'}
      </div>
    </div>
  );
}

// ─── Deal Status badge ─────────────────────────────────────────────────────────

const DEAL_STATUS_COLORS: Record<string, string> = {
  BOOKED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONFIRMED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SETTLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function TreasuryHomePage() {
  const { deals, desks, analytics, almScenarios } = useTreasuryHomeData();

  const dealList = (deals.data ?? []).slice(0, 5);
  const deskList = desks.data ?? [];
  // analytics returns an array; use the most recent record
  const metrics = Array.isArray(analytics.data) ? analytics.data[0] ?? null : null;
  const scenarios = almScenarios.data ?? [];

  const totalDealCount = deals.data?.length ?? 0;
  const activeDeskCount = deskList.filter((d) => d.status === 'ACTIVE').length;
  const totalDeskPnl = deskList.reduce((sum, d) => sum + (d.todayPnl ?? 0), 0);
  const hasAlerts = scenarios.length === 0 && !almScenarios.isLoading;

  return (
    <>
      <PageHeader
        title="Treasury"
        subtitle="Treasury management and financial markets hub"
      />
      <div className="page-container space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Deals"
            value={totalDealCount}
            loading={deals.isLoading}
          />
          <StatCard
            label="Active Desks"
            value={activeDeskCount}
            loading={desks.isLoading}
          />
          <KpiTile label="NIM" value={metrics?.nim} suffix="%" />
          <KpiTile label="CAR" value={metrics?.car} suffix="%" />
        </div>

        {/* Treasury Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiTile label="ROA" value={metrics.roa} suffix="%" />
            <KpiTile label="ROE" value={metrics.roe} suffix="%" />
            <KpiTile label="Yield" value={metrics.yield} suffix="%" />
            <KpiTile label="As of" value={null} />
          </div>
        )}

        {/* Alert */}
        {hasAlerts && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              No ALM scenarios found. Consider running scenario analysis.
            </p>
          </div>
        )}

        {/* Quick Navigation */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  to={card.href}
                  className="group flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className={`w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${card.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{card.name}</p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Two-column section: Recent Deals + Dealer Desks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Deals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recent Deals</h3>
              <Link to="/treasury/deals" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="rounded-lg border border-border divide-y divide-border">
              {deals.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                  </div>
                ))
              ) : dealList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No deals found</div>
              ) : (
                dealList.map((deal: TreasuryDeal) => (
                  <div key={deal.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{deal.dealRef}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${DEAL_STATUS_COLORS[deal.status] ?? ''}`}>
                          {deal.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{deal.type} · {deal.counterparty}</p>
                      <p className="text-xs text-muted-foreground">{deal.currency} {deal.amount.toLocaleString()} · {formatDate(deal.bookedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-medium">{deal.rate}%</p>
                      <p className="text-xs text-muted-foreground">rate</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dealer Desks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Dealer Desks</h3>
              <Link to="/treasury/capital-markets" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="rounded-lg border border-border divide-y divide-border">
              {desks.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" />
                  </div>
                ))
              ) : deskList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No dealer desks found</div>
              ) : (
                deskList.slice(0, 5).map((desk: DealerDesk) => {
                  const pnlPositive = (desk.todayPnl ?? 0) >= 0;
                  return (
                    <div key={desk.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{desk.name}</p>
                        <p className="text-xs text-muted-foreground">{desk.assetClass} · {desk.code}</p>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-1 justify-end text-xs font-medium ${pnlPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {pnlPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(desk.todayPnl ?? 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Daily PnL</p>
                      </div>
                    </div>
                  );
                })
              )}
              {deskList.length > 0 && (
                <div className="px-4 py-2 bg-muted/30">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total Daily PnL</span>
                    <span className={`font-semibold ${totalDeskPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalDeskPnl >= 0 ? '+' : ''}{totalDeskPnl.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ALM Scenarios */}
        {scenarios.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">ALM Scenarios</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Scenario</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Run Date</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">NIM Impact</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">EVA Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scenarios.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.scenarioType}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(s.runDate)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-medium ${s.impactOnNim >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {s.impactOnNim >= 0 ? '+' : ''}{s.impactOnNim?.toFixed(2)}%
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs font-medium ${s.impactOnEva >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {s.impactOnEva >= 0 ? '+' : ''}{s.impactOnEva?.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
