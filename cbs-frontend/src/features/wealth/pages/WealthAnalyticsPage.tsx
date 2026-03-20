import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, BarChart3, Activity, Award } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SUMMARY = {
  totalAum: 16_600_000_000,
  aumGrowthYtd: 12.4,
  avgPortfolioReturn: 13.2,
  benchmarkReturn: 10.1,
  alphaPct: 3.1,
  sharpeRatio: 1.42,
  clientCount: 88,
  newClientsYtd: 12,
};

const AUM_TREND = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3, 1);
  d.setMonth(d.getMonth() - (11 - i));
  return {
    month: d.toISOString().slice(0, 7),
    aum: 12_000_000_000 + i * 380_000_000 + Math.sin(i * 0.8) * 200_000_000,
    returns: 8 + i * 0.4 + Math.sin(i) * 1.2,
  };
});

const ALLOCATION = [
  { name: 'Equities', value: 42, color: 'hsl(var(--primary))' },
  { name: 'Fixed Income', value: 28, color: '#10b981' },
  { name: 'Alternatives', value: 15, color: '#f59e0b' },
  { name: 'Real Estate', value: 10, color: '#8b5cf6' },
  { name: 'Cash', value: 5, color: '#94a3b8' },
];

const RISK_RETURN = [
  { name: 'Adaeze', risk: 8.2, return: 14.2, aum: 4800 },
  { name: 'Emeka', risk: 6.5, return: 11.8, aum: 3200 },
  { name: 'Ngozi', risk: 9.1, return: 16.5, aum: 6500 },
  { name: 'Chukwudi', risk: 5.8, return: 9.3, aum: 2100 },
];

const PLAN_TYPE_DATA = [
  { quarter: 'Q1 2025', COMPREHENSIVE: 18, RETIREMENT: 12, EDUCATION: 8, ESTATE: 5 },
  { quarter: 'Q2 2025', COMPREHENSIVE: 22, RETIREMENT: 14, EDUCATION: 9, ESTATE: 6 },
  { quarter: 'Q3 2025', COMPREHENSIVE: 26, RETIREMENT: 16, EDUCATION: 11, ESTATE: 7 },
  { quarter: 'Q4 2025', COMPREHENSIVE: 29, RETIREMENT: 18, EDUCATION: 12, ESTATE: 8 },
  { quarter: 'Q1 2026', COMPREHENSIVE: 31, RETIREMENT: 19, EDUCATION: 13, ESTATE: 9 },
];

const PLAN_TYPES = ['COMPREHENSIVE', 'RETIREMENT', 'EDUCATION', 'ESTATE'] as const;
const PLAN_TYPE_COLORS: Record<string, string> = {
  COMPREHENSIVE: 'hsl(var(--primary))',
  RETIREMENT: '#10b981',
  EDUCATION: '#f59e0b',
  ESTATE: '#8b5cf6',
};

// Last 6 months for heatmap
const HEATMAP_MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(2026, 3, 1);
  d.setMonth(d.getMonth() - (5 - i));
  return d.toLocaleString('default', { month: 'short' });
});

const HEATMAP_DATA: Record<string, number[]> = {
  COMPREHENSIVE: [88, 91, 85, 93, 87, 94],
  RETIREMENT: [72, 78, 65, 80, 74, 82],
  EDUCATION: [58, 63, 55, 69, 61, 71],
  ESTATE: [84, 79, 88, 76, 90, 85],
};

const TOP_CLIENTS = [
  { rank: 1, name: 'Alhaji Bello Enterprises', planCode: 'WMP-0001', planType: 'COMPREHENSIVE', advisor: 'Ngozi Adeleke', aum: 1_200_000_000, ytdReturn: 15.2, status: 'ACTIVE' },
  { rank: 2, name: 'Adunola Okafor Family Trust', planCode: 'WMP-0003', planType: 'ESTATE', advisor: 'Adaeze Nwosu', aum: 980_000_000, ytdReturn: 12.7, status: 'ACTIVE' },
  { rank: 3, name: 'Chief Emeka Obi Holdings', planCode: 'WMP-0007', planType: 'COMPREHENSIVE', advisor: 'Ngozi Adeleke', aum: 870_000_000, ytdReturn: 17.1, status: 'ACTIVE' },
  { rank: 4, name: 'Biodun Adelabu & Sons Ltd', planCode: 'WMP-0012', planType: 'RETIREMENT', advisor: 'Chukwudi Eze', aum: 760_000_000, ytdReturn: 9.8, status: 'ACTIVE' },
  { rank: 5, name: 'Fatima Al-Hassan Foundation', planCode: 'WMP-0015', planType: 'EDUCATION', advisor: 'Emeka Obiora', aum: 690_000_000, ytdReturn: 11.4, status: 'ACTIVE' },
  { rank: 6, name: 'Olawale Bamidele Investments', planCode: 'WMP-0019', planType: 'COMPREHENSIVE', advisor: 'Adaeze Nwosu', aum: 620_000_000, ytdReturn: 14.6, status: 'ACTIVE' },
  { rank: 7, name: 'Ngozi Amadi Ventures', planCode: 'WMP-0022', planType: 'RETIREMENT', advisor: 'Chukwudi Eze', aum: 550_000_000, ytdReturn: 8.9, status: 'UNDER_REVIEW' },
  { rank: 8, name: 'Mallam Isah Dantani Group', planCode: 'WMP-0028', planType: 'COMPREHENSIVE', advisor: 'Ngozi Adeleke', aum: 490_000_000, ytdReturn: 13.3, status: 'ACTIVE' },
  { rank: 9, name: 'Princess Aisha Bello Family', planCode: 'WMP-0031', planType: 'ESTATE', advisor: 'Emeka Obiora', aum: 430_000_000, ytdReturn: 16.0, status: 'ACTIVE' },
  { rank: 10, name: 'Chike Okonkwo Asset Mgmt', planCode: 'WMP-0035', planType: 'COMPREHENSIVE', advisor: 'Adaeze Nwosu', aum: 380_000_000, ytdReturn: 10.5, status: 'ACTIVE' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAum(value: number): string {
  if (Math.abs(value) >= 1e9) return `₦${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `₦${(value / 1e6).toFixed(1)}M`;
  return `₦${value.toLocaleString()}`;
}

function heatmapColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  if (pct >= 60) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  return 'bg-rose-500/20 text-rose-700 dark:text-rose-400';
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: 'green' | 'red' | 'muted';
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      {sub && (
        <p
          className={cn(
            'text-xs font-medium',
            subColor === 'green' && 'text-emerald-600 dark:text-emerald-400',
            subColor === 'red' && 'text-rose-600 dark:text-rose-400',
            subColor === 'muted' && 'text-muted-foreground',
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WealthAnalyticsPage() {
  useEffect(() => {
    document.title = 'Wealth Analytics | CBS';
  }, []);

  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-03-20');

  const aumTrendFormatted = AUM_TREND.map((d) => ({
    ...d,
    label: new Date(d.month + '-01').toLocaleString('default', { month: 'short' }),
  }));

  return (
    <>
      <PageHeader
        title="Wealth Analytics"
        subtitle="Portfolio performance, AUM trends, and risk analytics"
        actions={
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* ── Section 1: KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard
            label="Total AUM"
            value={formatAum(MOCK_SUMMARY.totalAum)}
            sub="Assets Under Management"
            subColor="muted"
            icon={BarChart3}
          />
          <KpiCard
            label="YTD AUM Growth"
            value={formatPercent(MOCK_SUMMARY.aumGrowthYtd)}
            sub="+₦1.84B since Jan"
            subColor="green"
            icon={TrendingUp}
          />
          <KpiCard
            label="Avg Portfolio Return"
            value={formatPercent(MOCK_SUMMARY.avgPortfolioReturn)}
            sub="12-month trailing"
            subColor="muted"
            icon={Activity}
          />
          <KpiCard
            label="vs Benchmark"
            value={`+${formatPercent(MOCK_SUMMARY.alphaPct)} α`}
            sub={`Benchmark: ${formatPercent(MOCK_SUMMARY.benchmarkReturn)}`}
            subColor="green"
            icon={TrendingUp}
          />
          <KpiCard
            label="Sharpe Ratio"
            value={MOCK_SUMMARY.sharpeRatio.toFixed(2)}
            sub="Risk-adjusted return"
            subColor="muted"
            icon={Award}
          />
          <KpiCard
            label="New Clients YTD"
            value={String(MOCK_SUMMARY.newClientsYtd)}
            sub={`${MOCK_SUMMARY.clientCount} total clients`}
            subColor="green"
            icon={Users}
          />
        </div>

        {/* ── Section 2: AUM Trend + Asset Allocation ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AUM Trend Chart */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">AUM Trend (12 Months)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={aumTrendFormatted} margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="aum"
                  orientation="left"
                  tickFormatter={(v) => `₦${(v / 1e9).toFixed(1)}B`}
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <YAxis
                  yAxisId="returns"
                  orientation="right"
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  tick={{ fontSize: 11 }}
                  width={42}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) =>
                    name === 'aum'
                      ? [formatAum(value), 'AUM']
                      : [formatPercent(value), 'Returns']
                  }
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  yAxisId="aum"
                  type="monotone"
                  dataKey="aum"
                  name="AUM"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="returns"
                  type="monotone"
                  dataKey="returns"
                  name="Returns"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Allocation Donut */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Asset Allocation</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="relative" style={{ width: 220, height: 220 }}>
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={ALLOCATION}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {ALLOCATION.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number) => [`${value}%`, 'Allocation']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-muted-foreground">Total AUM</span>
                  <span className="text-sm font-bold">₦16.6B</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {ALLOCATION.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.name} ({item.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Advisor Risk-Return Profile ───────────────────────── */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Advisor Risk-Return Profile</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={RISK_RETURN} margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [
                  formatPercent(value),
                  name === 'risk' ? 'Portfolio Risk' : 'Portfolio Return',
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={MOCK_SUMMARY.benchmarkReturn}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'Benchmark 10.1%', position: 'right', fontSize: 10, fill: '#f59e0b' }}
              />
              <Bar dataKey="risk" name="Risk %" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="return" name="Return %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Section 4: Plan Type Distribution + Goal Achievement Heatmap ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stacked Plan Type Distribution */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Plan Type Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={PLAN_TYPE_DATA} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {PLAN_TYPES.map((type) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    stackId="plans"
                    fill={PLAN_TYPE_COLORS[type]}
                    radius={type === 'ESTATE' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Goal Achievement Heatmap */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Goal Achievement Rate (%)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-3 min-w-[110px]">
                      Plan Type
                    </th>
                    {HEATMAP_MONTHS.map((m) => (
                      <th key={m} className="text-center font-medium text-muted-foreground pb-2 px-1 min-w-[44px]">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {PLAN_TYPES.map((type) => (
                    <tr key={type}>
                      <td className="py-1 pr-3 font-medium text-foreground whitespace-nowrap">{type}</td>
                      {HEATMAP_DATA[type].map((pct, i) => (
                        <td key={i} className="py-1 px-1 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-full rounded px-1 py-0.5 font-semibold',
                              heatmapColor(pct),
                            )}
                          >
                            {pct}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-500/20" />
                  ≥80% On Track
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-amber-500/20" />
                  60–79% At Risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-rose-500/20" />
                  &lt;60% Off Track
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 5: Top 10 Clients by AUM ────────────────────────────── */}
        <div className="rounded-xl border bg-card">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold">Top 10 Clients by AUM</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium w-10">#</th>
                  <th className="px-4 py-3 text-left font-medium">Client Name</th>
                  <th className="px-4 py-3 text-left font-medium">Plan Code</th>
                  <th className="px-4 py-3 text-left font-medium">Plan Type</th>
                  <th className="px-4 py-3 text-left font-medium">Advisor</th>
                  <th className="px-4 py-3 text-right font-medium">AUM</th>
                  <th className="px-4 py-3 text-right font-medium">YTD Return</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {TOP_CLIENTS.map((client) => (
                  <tr key={client.rank} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-medium">{client.rank}</td>
                    <td className="px-4 py-3 font-medium">{client.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {client.planCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${PLAN_TYPE_COLORS[client.planType]}22`,
                          color: PLAN_TYPE_COLORS[client.planType],
                        }}
                      >
                        {client.planType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{client.advisor}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatAum(client.aum)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right font-semibold tabular-nums text-xs',
                        client.ytdReturn > 10
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {client.ytdReturn > 10 ? '+' : ''}
                      {formatPercent(client.ytdReturn)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
