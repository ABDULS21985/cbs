import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Investor } from '../../api/capitalMarketsApi';

interface InvestorBookTableProps {
  investors: Investor[];
  isLoading: boolean;
  targetAmount: number;
  currency: string;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export function InvestorBookTable({ investors, isLoading, targetAmount, currency }: InvestorBookTableProps) {
  const totalBids = useMemo(() => investors.reduce((s, i) => s + i.bidAmount, 0), [investors]);
  const totalAllocated = useMemo(() => investors.reduce((s, i) => s + (i.allocatedAmount ?? 0), 0), [investors]);
  const coverageRatio = targetAmount > 0 ? totalBids / targetAmount : 0;

  // Bid distribution by price
  const bidDistribution = useMemo(() => {
    const byPrice = new Map<number, number>();
    investors.forEach((inv) => {
      const price = inv.bidPrice ?? 0;
      byPrice.set(price, (byPrice.get(price) ?? 0) + inv.bidAmount);
    });
    return Array.from(byPrice.entries())
      .map(([price, volume]) => ({ price: price.toFixed(2), volume }))
      .sort((a, b) => Number(a.price) - Number(b.price));
  }, [investors]);

  // Investor type breakdown (simulated from name patterns since type isn't in the Investor interface)
  const typeBreakdown = useMemo(() => {
    const types: Record<string, number> = { Pension: 0, 'Asset Mgr': 0, Bank: 0, Insurance: 0, Retail: 0, Other: 0 };
    investors.forEach((inv) => {
      const n = inv.name.toLowerCase();
      if (n.includes('pension')) types['Pension'] += inv.bidAmount;
      else if (n.includes('asset') || n.includes('invest') || n.includes('am ')) types['Asset Mgr'] += inv.bidAmount;
      else if (n.includes('bank') || n.includes('stanbic') || n.includes('gtb')) types['Bank'] += inv.bidAmount;
      else if (n.includes('insur')) types['Insurance'] += inv.bidAmount;
      else if (n.includes('individual') || n.includes('retail')) types['Retail'] += inv.bidAmount;
      else types['Other'] += inv.bidAmount;
    });
    return Object.entries(types).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [investors]);

  const columns: ColumnDef<Investor, unknown>[] = [
    { accessorKey: 'name', header: 'Investor', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      accessorKey: 'bidAmount', header: 'Bid Amount',
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.bidAmount, currency)}</span>,
    },
    {
      accessorKey: 'bidPrice', header: 'Bid Price',
      cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.bidPrice != null ? row.original.bidPrice.toFixed(2) : '—'}</span>,
    },
    {
      accessorKey: 'allocatedAmount', header: 'Allocated',
      cell: ({ row }) => {
        const alloc = row.original.allocatedAmount;
        if (alloc == null) return <span className="text-muted-foreground">—</span>;
        const pct = targetAmount > 0 ? (alloc / targetAmount) * 100 : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tabular-nums">{formatMoney(alloc, currency)}</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'allocationStatus', header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.allocationStatus ?? 'PENDING'} dot />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary footer */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Bids</div>
          <div className="font-mono font-bold">{formatMoney(totalBids, currency)}</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-xs text-muted-foreground">Total Allocated</div>
          <div className="font-mono font-bold">{formatMoney(totalAllocated, currency)}</div>
        </div>
        <div className={cn('rounded-lg p-3 text-center', coverageRatio >= 2 ? 'bg-green-50 dark:bg-green-900/20' : coverageRatio >= 1 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
          <div className="text-xs text-muted-foreground">Coverage</div>
          <div className={cn('font-mono font-bold', coverageRatio >= 2 ? 'text-green-700' : coverageRatio >= 1 ? 'text-amber-700' : 'text-red-700')}>
            {coverageRatio.toFixed(2)}x
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={investors}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="investor-book"
        emptyMessage="No investors in book yet"
      />

      {/* Mini charts */}
      {investors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bid distribution */}
          {bidDistribution.length > 1 && (
            <div className="surface-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bid Distribution by Price</h4>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={bidDistribution}>
                  <XAxis dataKey="price" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`} />
                  <Tooltip formatter={(v: number) => [formatMoney(v, currency), 'Volume']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Type breakdown */}
          {typeBreakdown.length > 0 && (
            <div className="surface-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Investor Type Breakdown</h4>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={typeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={2}>
                    {typeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v, currency)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {typeBreakdown.map((t, i) => (
                  <span key={t.name} className="flex items-center gap-1 text-[10px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
