import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatMoney } from '@/lib/formatters';
import type { CapitalMarketsDeal, Investor } from '../../api/capitalMarketsApi';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DealAnalyticsTabProps {
  deal: CapitalMarketsDeal;
  investors: Investor[];
}

export function DealAnalyticsTab({ deal, investors }: DealAnalyticsTabProps) {
  const totalBids = useMemo(() => investors.reduce((s, i) => s + i.bidAmount, 0), [investors]);

  // Concentration: top 5 investors as % of total
  const concentration = useMemo(() => {
    const sorted = [...investors].sort((a, b) => b.bidAmount - a.bidAmount).slice(0, 5);
    return sorted.map((inv) => ({
      name: inv.name.length > 20 ? inv.name.slice(0, 20) + '...' : inv.name,
      amount: inv.bidAmount,
      pct: totalBids > 0 ? (inv.bidAmount / totalBids) * 100 : 0,
    }));
  }, [investors, totalBids]);

  // Fee breakdown (simulated from deal data)
  const feeBreakdown = useMemo(() => {
    const total = deal.feesEarned ?? 0;
    return [
      { name: 'Management Fee', value: total * 0.40 },
      { name: 'Underwriting Fee', value: total * 0.35 },
      { name: 'Selling Concession', value: total * 0.20 },
      { name: 'Legal/Admin', value: total * 0.05 },
    ].filter((f) => f.value > 0);
  }, [deal.feesEarned]);

  if (investors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm font-medium">No analytics data available</p>
        <p className="text-xs mt-1">Analytics will populate as investors are added.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Investor Concentration */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-1">Investor Concentration</h3>
        <p className="text-xs text-muted-foreground mb-4">Top 5 investors by bid volume</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={concentration} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fee Breakdown */}
      {feeBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">Fee Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Total: {formatMoney(deal.feesEarned ?? 0, deal.currency)}</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={feeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                {feeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v, deal.currency)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {feeBreakdown.map((f, i) => (
              <span key={f.name} className="flex items-center gap-1 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="rounded-xl border bg-card p-5 md:col-span-2">
        <h3 className="text-sm font-semibold mb-4">Deal Metrics Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Bid-to-Cover', value: deal.coverageRatio ? `${deal.coverageRatio.toFixed(2)}x` : '—' },
            { label: 'Avg Bid Size', value: investors.length > 0 ? formatMoney(totalBids / investors.length, deal.currency) : '—' },
            { label: 'Total Investors', value: investors.length.toString() },
            { label: 'Fee Yield', value: deal.targetAmount > 0 ? `${(((deal.feesEarned ?? 0) / deal.targetAmount) * 100).toFixed(2)}%` : '—' },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="text-lg font-bold tabular-nums mt-1">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
