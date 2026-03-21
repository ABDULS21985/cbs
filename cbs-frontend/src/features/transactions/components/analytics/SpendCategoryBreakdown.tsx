import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';
import type { SpendCategoryAnalytics } from '../../api/transactionAnalyticsApi';

const CATEGORY_COLORS: Record<string, string> = {
  Transfers: '#0284c7',
  Payments: '#2563eb',
  Bills: '#7c3aed',
  Salaries: '#16a34a',
  Fees: '#dc2626',
  'Loan Repayments': '#f59e0b',
  'ATM Cash': '#0f766e',
  Others: '#64748b',
};

interface SpendCategoryBreakdownProps {
  data: SpendCategoryAnalytics | null;
  priorData?: SpendCategoryAnalytics | null;
  isLoading?: boolean;
  onCategoryClick?: (category: string) => void;
}

function buildTrendRows(data: SpendCategoryAnalytics | null, priorData?: SpendCategoryAnalytics | null) {
  const byPeriod = new Map<string, Record<string, string | number>>();
  for (const point of data?.trend ?? []) {
    const row = byPeriod.get(point.period) ?? { period: point.period };
    row[point.category] = point.amount;
    byPeriod.set(point.period, row);
  }
  const priorTotals = (priorData?.trend ?? []).reduce<Record<string, number>>((totals, point) => {
    totals[point.period] = (totals[point.period] ?? 0) + point.amount;
    return totals;
  }, {});
  return Array.from(byPeriod.values()).map((row, index) => ({
    ...row,
    priorTotalSpend: Object.values(priorTotals)[index] ?? null,
  }));
}

export function SpendCategoryBreakdown({
  data,
  priorData,
  isLoading = false,
  onCategoryClick,
}: SpendCategoryBreakdownProps) {
  if (isLoading) {
    return <div className="h-[520px] animate-pulse rounded-xl border bg-card" />;
  }

  const trendRows = buildTrendRows(data, priorData);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Spend Category Breakdown</h2>
        <p className="text-sm text-muted-foreground">
          Posted debit activity grouped into business-friendly spend categories.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px,1fr]">
        <div>
          <div className="mb-3 text-sm text-muted-foreground">
            Total spend: <span className="font-medium text-foreground">{formatMoney(data?.totalSpend ?? 0)}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data?.categories ?? []}
                dataKey="amount"
                nameKey="category"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                onClick={(entry) => onCategoryClick?.(String(entry.category))}
              >
                {(data?.categories ?? []).map((entry) => (
                  <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? '#64748b'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatMoney(value)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {(data?.categories ?? []).map((category) => (
              <button
                key={category.category}
                type="button"
                onClick={() => onCategoryClick?.(category.category)}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left hover:bg-muted/50"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category.category] ?? '#64748b' }}
                  />
                  {category.category}
                </span>
                <span className="text-sm font-medium text-foreground">{formatPercent(category.percentage)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trendRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => formatMoneyCompact(Number(value))} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Legend />
              {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
                <Bar key={category} dataKey={category} stackId="spend" fill={color} radius={[4, 4, 0, 0]} />
              ))}
              {priorData && <Line type="monotone" dataKey="priorTotalSpend" name="Prior Period Total" stroke="#0f172a" strokeDasharray="4 4" strokeWidth={2} dot={false} />}
            </BarChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Count</th>
                  <th className="pb-2 font-medium text-right">Avg</th>
                  <th className="pb-2 font-medium text-right">% Total</th>
                </tr>
              </thead>
              <tbody>
                {(data?.categories ?? []).map((category) => (
                  <tr
                    key={category.category}
                    className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => onCategoryClick?.(category.category)}
                  >
                    <td className="py-2 font-medium text-foreground">{category.category}</td>
                    <td className="py-2 text-right">{formatMoney(category.amount)}</td>
                    <td className="py-2 text-right">{category.count.toLocaleString()}</td>
                    <td className="py-2 text-right">{formatMoney(category.average)}</td>
                    <td className="py-2 text-right">{formatPercent(category.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
