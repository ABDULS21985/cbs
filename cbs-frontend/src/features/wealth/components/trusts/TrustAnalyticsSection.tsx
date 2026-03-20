import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import { ChartSkeleton } from '@/components/shared/ChartSkeleton';
import { useTrustAnalytics } from '../../hooks/useWealth';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRUST_TYPE_COLORS: Record<string, string> = {
  revocable: '#10b981',
  irrevocable: '#3b82f6',
  testamentary: '#f59e0b',
  charitable: '#8b5cf6',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TrustAnalyticsSection() {
  const { data, isLoading } = useTrustAnalytics();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Trust Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* (a) Total Distributions by Trust Type - Horizontal Bar Chart */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Total Distributions by Trust Type</h3>
          {isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data?.distributionsByType ?? []}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatMoneyCompact(v)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fontSize: 11 }}
                  width={100}
                  tickFormatter={(v: string) =>
                    v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatMoneyCompact(v)}
                  labelFormatter={(label: string) =>
                    label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* (b) Corpus Growth Over 36 Months - Multi-line Chart */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Corpus Growth (36 Months)</h3>
          {isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data?.corpusGrowth ?? []}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis
                  tickFormatter={(v) => formatMoneyCompact(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    formatMoneyCompact(v),
                    name.replace(/\b\w/g, (c) => c.toUpperCase()),
                  ]}
                />
                <Legend
                  iconType="line"
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value: string) =>
                    value.replace(/\b\w/g, (c) => c.toUpperCase())
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revocable"
                  stroke={TRUST_TYPE_COLORS.revocable}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="irrevocable"
                  stroke={TRUST_TYPE_COLORS.irrevocable}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="testamentary"
                  stroke={TRUST_TYPE_COLORS.testamentary}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="charitable"
                  stroke={TRUST_TYPE_COLORS.charitable}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* (c) Beneficiary Count Distribution - Histogram-style Bar Chart */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Beneficiary Count Distribution</h3>
          {isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data?.beneficiaryDistribution ?? []}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} trusts`, 'Count']}
                  labelFormatter={(label: string) => `${label} beneficiaries`}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* (d) Fee Income Trend - Area Chart with Gradient */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Fee Income Trend</h3>
          {isLoading ? (
            <ChartSkeleton height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={data?.feeIncomeTrend ?? []}
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  interval={2}
                />
                <YAxis
                  tickFormatter={(v) => formatMoneyCompact(v)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: number) => formatMoneyCompact(v)} />
                <Area
                  type="monotone"
                  dataKey="feeIncome"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#feeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
