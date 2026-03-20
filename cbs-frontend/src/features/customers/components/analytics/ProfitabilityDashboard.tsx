import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ProfitabilityData } from '../../api/analyticsApi';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

interface Props {
  data: ProfitabilityData;
  currency?: string;
}

export function ProfitabilityDashboard({ data, currency = 'NGN' }: Props) {
  const revenueItems = [
    { label: 'Interest Income', value: data.interestIncome, format: 'money' as const, currency },
    { label: 'Fee Income', value: data.feeIncome, format: 'money' as const, currency },
    { label: 'FX Income', value: data.fxIncome, format: 'money' as const, currency },
    { label: 'Other Income', value: data.otherIncome, format: 'money' as const, currency },
  ];

  const costItems = [
    { label: 'Cost of Funds', value: data.costOfFunds, format: 'money' as const, currency },
    { label: 'Operating Cost', value: data.operatingCost, format: 'money' as const, currency },
    { label: 'Provisions', value: data.provisions, format: 'money' as const, currency },
    { label: 'Other Cost', value: data.otherCost, format: 'money' as const, currency },
  ];

  return (
    <div className="space-y-6">
      {/* P&L Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">Revenue</h3>
          <InfoGrid items={revenueItems} columns={2} />
          <div className="mt-3 pt-3 border-t flex justify-between text-sm font-semibold">
            <span>Total Revenue</span>
            <span className="text-green-600">{formatMoney(data.totalRevenue, currency)}</span>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Cost</h3>
          <InfoGrid items={costItems} columns={2} />
          <div className="mt-3 pt-3 border-t flex justify-between text-sm font-semibold">
            <span>Total Cost</span>
            <span className="text-red-600">{formatMoney(data.totalCost, currency)}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Net Contribution</p>
          <p className={cn('text-2xl font-bold mt-1', data.netContribution >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatMoney(data.netContribution, currency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data.marginPct.toFixed(1)}% margin</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Lifetime Value</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatMoney(data.lifetimeValue, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">over {data.tenureMonths}mo tenure</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold mt-1">{formatMoney(data.totalBalance, currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.accountCount} accounts</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Revenue Breakdown</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={data.revenueBreakdown} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {data.revenueBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {data.revenueBreakdown.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div>
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatMoney(item.value, currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
