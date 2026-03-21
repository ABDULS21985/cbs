import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { MarketOrder } from '../../types/treasury';

interface ExecutionQualityChartsProps {
  orders: MarketOrder[];
}

export function ExecutionQualityCharts({ orders }: ExecutionQualityChartsProps) {
  const filledOrders = orders.filter((order) => order.status === 'FILLED');
  const slippageByInstrument = Array.from(
    filledOrders.reduce((map, order) => {
      const key = order.instrumentName;
      const slippageBps =
        order.price && order.avgFillPrice
          ? Math.abs((order.avgFillPrice - order.price) / order.price) * 10_000
          : 0;
      const entry = map.get(key) ?? { instrument: key, slippageBps: 0, fillRate: 0, count: 0 };
      entry.slippageBps += slippageBps;
      entry.fillRate += order.quantity > 0 ? (order.filledQuantity / order.quantity) * 100 : 0;
      entry.count += 1;
      map.set(key, entry);
      return map;
    }, new Map<string, { instrument: string; slippageBps: number; fillRate: number; count: number }>()),
  ).map(([, value]) => ({
    instrument: value.instrument,
    slippageBps: value.count > 0 ? value.slippageBps / value.count : 0,
    fillRate: value.count > 0 ? value.fillRate / value.count : 0,
  }));

  const statusBreakdown = ['FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED'].map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));

  const largestExecutions = filledOrders
    .map((order) => ({
      instrument: order.instrumentName,
      notional: order.filledQuantity * (order.avgFillPrice ?? order.price ?? 0),
      fillRate: order.quantity > 0 ? (order.filledQuantity / order.quantity) * 100 : 0,
    }))
    .sort((left, right) => right.notional - left.notional)
    .slice(0, 8);

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No orders are available for execution-quality analytics.
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-xl border bg-card p-4">
        <h4 className="text-sm font-semibold">Slippage by Instrument</h4>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slippageByInstrument}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="instrument" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)}bps`, 'Avg Slippage']} />
              <Bar dataKey="slippageBps" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h4 className="text-sm font-semibold">Order Outcome Mix</h4>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [value, 'Orders']} />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h4 className="text-sm font-semibold">Largest Executions</h4>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={largestExecutions}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="instrument" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`} />
              <Tooltip formatter={(value: number, name: string) => [name === 'notional' ? formatMoney(value) : `${value.toFixed(1)}%`, name === 'notional' ? 'Executed Notional' : 'Fill Rate']} />
              <Bar dataKey="notional" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
