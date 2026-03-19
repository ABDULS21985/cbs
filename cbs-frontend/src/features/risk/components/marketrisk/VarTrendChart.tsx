import { ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { formatMoneyCompact } from '@/lib/formatters';
import type { VarTrendPoint, BacktestResult } from '../../api/marketRiskApi';

interface Props { data: VarTrendPoint[]; varLimit: number; backtest: BacktestResult | null; currency: string }

export function VarTrendChart({ data, varLimit, backtest, currency }: Props) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">VaR Trend (60 Days)</h3>
        {backtest && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${backtest.zone === 'GREEN' ? 'bg-green-100 text-green-700' : backtest.zone === 'YELLOW' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            Backtest: {backtest.exceptions} exceptions in {backtest.totalDays} days — {backtest.zone}
          </span>
        )}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Legend />
            <ReferenceLine y={varLimit} stroke="#ef4444" strokeDasharray="5 5" label="Limit" />
            <Line type="monotone" dataKey="var95" name="VaR (95%)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Scatter dataKey="actualPnl" name="Actual P&L" fill="#6366f1" shape="circle" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
