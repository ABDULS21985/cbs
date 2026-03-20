import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Landmark, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { useEconomicCapitalByDate } from '../hooks/useCapitalMarketsExt';
import type { EconomicCapital } from '../types/economicCapital';

// ── Page ─────────────────────────────────────────────────────────────────────

export function EconomicCapitalPage() {
  useEffect(() => { document.title = 'Economic Capital | CBS'; }, []);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { data: capitalData = [], isLoading } = useEconomicCapitalByDate(selectedDate);
  const records = capitalData as EconomicCapital[];

  const totalEC = records.reduce((s, r) => s + (r.economicCapital || 0), 0);
  const totalAvailable = records.reduce((s, r) => s + (r.availableCapital || 0), 0);
  const totalSurplus = records.reduce((s, r) => s + (r.capitalSurplusDeficit || 0), 0);
  const avgRaroc = records.length ? records.reduce((s, r) => s + (r.rarocPct || 0), 0) / records.length : 0;

  // Group by business unit for allocation table
  const buData = useMemo(() => {
    const map: Record<string, { bu: string; credit: number; market: number; operational: number; total: number; raroc: number; count: number }> = {};
    records.forEach((r) => {
      const bu = r.businessUnit || 'Unassigned';
      if (!map[bu]) map[bu] = { bu, credit: 0, market: 0, operational: 0, total: 0, raroc: 0, count: 0 };
      const entry = map[bu];
      if (r.riskType === 'CREDIT') entry.credit += r.economicCapital;
      else if (r.riskType === 'MARKET') entry.market += r.economicCapital;
      else entry.operational += r.economicCapital;
      entry.total += r.economicCapital;
      entry.raroc += r.rarocPct || 0;
      entry.count++;
    });
    return Object.values(map).map((e) => ({ ...e, raroc: e.count ? e.raroc / e.count : 0 }));
  }, [records]);

  // Stacked bar chart data by BU
  const chartData = useMemo(() => buData.map((b) => ({
    name: b.bu,
    Credit: b.credit,
    Market: b.market,
    Operational: b.operational,
  })), [buData]);

  // Simulate 12-month trend from current data (using calcDate grouping)
  const trendData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    records.forEach((r) => {
      const month = r.calcDate?.substring(0, 7) || selectedDate.substring(0, 7);
      monthMap[month] = (monthMap[month] || 0) + r.economicCapital;
    });
    return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, ec]) => ({ month, ec }));
  }, [records, selectedDate]);

  const buColumns = useMemo<ColumnDef<typeof buData[0], unknown>[]>(() => [
    { accessorKey: 'bu', header: 'Business Unit' },
    { accessorKey: 'credit', header: 'Credit Risk', cell: ({ row }) => formatMoney(row.original.credit) },
    { accessorKey: 'market', header: 'Market Risk', cell: ({ row }) => formatMoney(row.original.market) },
    { accessorKey: 'operational', header: 'Op Risk', cell: ({ row }) => formatMoney(row.original.operational) },
    { accessorKey: 'total', header: 'Total EC', cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.total)}</span> },
    { accessorKey: 'raroc', header: 'RAROC', cell: ({ row }) => formatPercent(row.original.raroc) },
  ], []);

  return (
    <>
      <PageHeader title="Economic Capital" subtitle="Risk-adjusted capital allocation and adequacy analysis" />
      <div className="page-container space-y-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Calculation Date:</label>
          <input type="date" className="input w-44" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Economic Capital" value={totalEC} format="money" icon={Landmark} />
          <StatCard label="Available Capital" value={totalAvailable} format="money" icon={ShieldCheck} />
          <StatCard label="Surplus / Deficit" value={totalSurplus} format="money" icon={totalSurplus >= 0 ? TrendingUp : AlertTriangle} />
          <StatCard label="Avg RAROC" value={avgRaroc} format="percent" icon={TrendingUp} />
        </div>

        {chartData.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">Capital by Business Unit</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} className="text-xs" />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="Credit" stackId="a" fill="#ef4444" />
                <Bar dataKey="Market" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Operational" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b"><h3 className="text-sm font-semibold">Capital Allocation by Business Unit</h3></div>
          <DataTable columns={buColumns} data={buData} isLoading={isLoading} pageSize={20} />
        </div>

        {trendData.length > 1 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">Economic Capital Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} className="text-xs" />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Line type="monotone" dataKey="ec" stroke="#3b82f6" strokeWidth={2} name="Economic Capital" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
