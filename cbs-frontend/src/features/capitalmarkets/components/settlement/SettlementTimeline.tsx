import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { SettlementDashboardData } from '../../api/settlementApi';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#10b981', '#f59e0b', '#6366f1'];

interface SettlementChartsProps {
  data?: SettlementDashboardData;
  isLoading: boolean;
}

export function SettlementRateChart({ data, isLoading }: SettlementChartsProps) {
  if (isLoading || !data) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-medium mb-3">Settlement Rate — Last 30 Days</p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data.settlementRateByDay} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(1)}%`, 'Settlement Rate']}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SettlementByDepositoryChart({ data, isLoading }: SettlementChartsProps) {
  if (isLoading || !data || data.byDepository.length === 0) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-medium mb-3">Settlement by Depository</p>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data.byDepository}
            dataKey="count"
            nameKey="depository"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.byDepository.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopFailingCounterpartiesTable({ data, isLoading }: SettlementChartsProps) {
  if (isLoading || !data) return <div className="h-40 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-medium">Top Failing Counterparties</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Counterparty</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Fail Count</th>
            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Total Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.topFailingCounterparties.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground text-sm">No failing counterparties</td>
            </tr>
          ) : (
            data.topFailingCounterparties.map((cp) => (
              <tr key={cp.counterparty} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium">{cp.counterparty}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-red-600 font-medium">{cp.failCount}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{cp.totalAmount.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StpRateCard({ data, isLoading }: SettlementChartsProps) {
  if (isLoading || !data) return <div className="h-20 rounded-xl bg-muted animate-pulse" />;

  const pct = data.stpRate;
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-medium mb-2">STP Rate (Straight-Through Processing)</p>
      <div className="flex items-center gap-4">
        <span className="text-3xl font-bold tabular-nums">{pct.toFixed(1)}%</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
