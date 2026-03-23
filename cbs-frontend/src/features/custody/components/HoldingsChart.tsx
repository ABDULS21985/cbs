import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PIE_PALETTE, SEMANTIC_CHART_COLORS } from '@/lib/chartPalette';
import { formatMoney } from '@/lib/formatters';
import type { SecuritiesPosition } from '../types/securitiesPosition';

interface HoldingsChartProps {
  positions: SecuritiesPosition[];
  currency?: string;
}

export function HoldingsChart({ positions, currency = 'NGN' }: HoldingsChartProps) {
  const donutData = useMemo(() => {
    return [...positions]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 10)
      .map((p) => ({
        name: p.instrumentCode,
        fullName: p.instrumentName,
        value: p.marketValue,
      }));
  }, [positions]);

  const plData = useMemo(() => {
    return [...positions]
      .sort((a, b) => Math.abs(b.unrealizedGainLoss) - Math.abs(a.unrealizedGainLoss))
      .slice(0, 10)
      .map((p) => ({
        name: p.instrumentCode,
        pnl: p.unrealizedGainLoss,
        fill: p.unrealizedGainLoss >= 0 ? SEMANTIC_CHART_COLORS.success : SEMANTIC_CHART_COLORS.danger,
      }));
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm font-medium">No positions to chart</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Donut: Market Value Distribution */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-1">Holdings by Market Value</h3>
        <p className="text-xs text-muted-foreground mb-4">Top 10 positions</p>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2}>
              {donutData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatMoney(v, currency)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar: Unrealized P&L */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-1">Unrealized P&L by Instrument</h3>
        <p className="text-xs text-muted-foreground mb-4">Top 10 by absolute value</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={plData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
            <Tooltip formatter={(v: number) => [formatMoney(v, currency), 'P&L']}
              contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {plData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
