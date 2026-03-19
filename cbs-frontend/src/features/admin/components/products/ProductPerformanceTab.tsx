import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BankingProduct } from '../../api/productApi';

// Generate 12-month mock data based on product's current values
function generateMonthlyData(product: BankingProduct) {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const baseAccounts = Math.max(product.activeAccounts * 0.6, 100);
  const baseRevenue = Math.max(product.revenueMTD * 0.5, 10000);

  return months.map((month, i) => {
    const growthFactor = 1 + (i / months.length) * 0.7 + (Math.random() * 0.1 - 0.05);
    const accounts = Math.round(baseAccounts * growthFactor);
    const revenue = Math.round(baseRevenue * growthFactor * (0.9 + Math.random() * 0.2));
    return { month, accounts, revenue };
  });
}

function formatMoney(value: number): string {
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value.toLocaleString()}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

interface ProductPerformanceTabProps {
  product: BankingProduct;
}

export function ProductPerformanceTab({ product }: ProductPerformanceTabProps) {
  const monthlyData = generateMonthlyData(product);

  const totalRevenueYTD = monthlyData.slice(-9).reduce((sum, d) => sum + d.revenue, 0);
  const prevMonthAccounts = monthlyData[monthlyData.length - 2]?.accounts ?? 0;
  const growthPct =
    prevMonthAccounts > 0
      ? (((product.activeAccounts - prevMonthAccounts) / prevMonthAccounts) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Accounts"
          value={product.activeAccounts.toLocaleString()}
          sub={`+${growthPct}% vs last month`}
        />
        <StatCard
          label="Total Portfolio Balance"
          value={formatMoney(product.totalBalance)}
          sub={`Avg: ${formatMoney(product.activeAccounts > 0 ? product.totalBalance / product.activeAccounts : 0)}/account`}
        />
        <StatCard
          label="Revenue MTD"
          value={formatMoney(product.revenueMTD)}
          sub="Current month"
        />
        <StatCard
          label="Revenue YTD"
          value={formatMoney(totalRevenueYTD)}
          sub="Last 9 months"
        />
      </div>

      {/* Line Chart — Active Accounts */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold mb-4">Active Accounts (12-Month Trend)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [value.toLocaleString(), 'Accounts']}
            />
            <Line
              type="monotone"
              dataKey="accounts"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart — Monthly Revenue */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold mb-4">Monthly Revenue (₦)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(0)}M`;
                if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
                return `₦${v}`;
              }}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold mb-4">Key Metrics Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: 'Revenue per Account (MTD)',
              value: formatMoney(product.activeAccounts > 0 ? product.revenueMTD / product.activeAccounts : 0),
            },
            {
              label: 'Balance per Account (Avg)',
              value: formatMoney(product.activeAccounts > 0 ? product.totalBalance / product.activeAccounts : 0),
            },
            {
              label: 'Product Version',
              value: `v${product.version}`,
            },
            {
              label: 'Interest Type',
              value: product.interestType.replace(/_/g, ' '),
            },
            {
              label: 'Currency',
              value: product.currency,
            },
            {
              label: 'Category',
              value: product.category,
            },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <span className="text-sm font-semibold">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
