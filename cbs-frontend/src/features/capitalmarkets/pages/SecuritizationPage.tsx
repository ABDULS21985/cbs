import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, DollarSign, TrendingDown, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useActiveSecuritizations } from '../hooks/useCapitalMarketsExt';
import type { SecuritizationVehicle } from '../types/securitization';

// ── Tranche Detail ──────────────────────────────────────────────────────────

function TrancheDetail({ tranches }: { tranches: unknown }) {
  const data = useMemo(() => {
    if (!tranches) return [];
    if (Array.isArray(tranches)) return tranches;
    if (typeof tranches === 'object') return Object.values(tranches).flat();
    return [];
  }, [tranches]);

  if (!data.length) return <p className="text-sm text-muted-foreground py-2">No tranche data available.</p>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Tranche</th>
          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Seniority</th>
          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Rating</th>
          <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Coupon</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {data.map((t: Record<string, unknown>, i: number) => (
          <tr key={i} className="hover:bg-muted/20">
            <td className="px-4 py-2 font-medium">{(t.name || t.trancheName || `Tranche ${i + 1}`) as string}</td>
            <td className="px-4 py-2">
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                (t.seniority as string) === 'SENIOR' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                (t.seniority as string) === 'MEZZANINE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}>{(t.seniority || 'N/A') as string}</span>
            </td>
            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(Number(t.amount || t.balance || 0))}</td>
            <td className="px-4 py-2">{(t.rating || 'NR') as string}</td>
            <td className="px-4 py-2 text-right tabular-nums">{formatPercent(Number(t.coupon || t.couponRate || 0))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SecuritizationPage() {
  useEffect(() => { document.title = 'Securitization Vehicles | CBS'; }, []);

  const { data: vehicles = [], isLoading } = useActiveSecuritizations();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const list = vehicles as SecuritizationVehicle[];

  const active = list.filter((v) => v.status === 'ACTIVE' || v.status === 'ISSUED');
  const totalIssued = list.reduce((s, v) => s + (v.totalIssued || 0), 0);
  const avgDelinquency = list.length ? list.reduce((s, v) => s + (v.delinquency30dPct || 0), 0) / list.length : 0;
  const avgPrepayment = list.length ? list.reduce((s, v) => s + (v.prepaymentRateCpr || 0), 0) / list.length : 0;

  const chartData = useMemo(() =>
    list.slice(0, 10).map((v) => ({
      name: v.vehicleCode,
      '30d': v.delinquency30dPct,
      '60d': v.delinquency60dPct,
      '90d': v.delinquency90dPct,
    })), [list]);

  const columns = useMemo<ColumnDef<SecuritizationVehicle, unknown>[]>(() => [
    { id: 'expand', header: '', size: 40, cell: ({ row }) => (
      <button className="p-1 rounded hover:bg-muted" onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)}>
        {expandedId === row.original.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    )},
    { accessorKey: 'vehicleCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.vehicleCode}</span> },
    { accessorKey: 'vehicleName', header: 'Name' },
    { accessorKey: 'vehicleType', header: 'Type', cell: ({ row }) => <span className="text-xs font-semibold">{row.original.vehicleType}</span> },
    { accessorKey: 'totalIssued', header: 'Total Issued', cell: ({ row }) => formatMoney(row.original.totalIssued, row.original.currency) },
    { accessorKey: 'delinquency30dPct', header: '30d DQ', cell: ({ row }) => formatPercent(row.original.delinquency30dPct) },
    { accessorKey: 'delinquency60dPct', header: '60d DQ', cell: ({ row }) => formatPercent(row.original.delinquency60dPct) },
    { accessorKey: 'delinquency90dPct', header: '90d DQ', cell: ({ row }) => formatPercent(row.original.delinquency90dPct) },
    { accessorKey: 'prepaymentRateCpr', header: 'CPR', cell: ({ row }) => formatPercent(row.original.prepaymentRateCpr) },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ], [expandedId]);

  return (
    <>
      <PageHeader title="Securitization Vehicles" subtitle="ABS, MBS, CLO and CDO management" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Vehicles" value={active.length} format="number" icon={Building2} />
          <StatCard label="Total Issued" value={totalIssued} format="money" icon={DollarSign} />
          <StatCard label="Avg 30d Delinquency" value={avgDelinquency} format="percent" icon={TrendingDown} />
          <StatCard label="Avg Prepayment CPR" value={avgPrepayment} format="percent" icon={BarChart3} />
        </div>

        <div className="card overflow-hidden">
          <DataTable columns={columns} data={list} isLoading={isLoading} pageSize={15} />
          {expandedId && (
            <div className="border-t px-6 py-4 bg-muted/20">
              <h4 className="text-sm font-semibold mb-2">Tranche Structure</h4>
              <TrancheDetail tranches={list.find((v) => v.id === expandedId)?.tranches} />
            </div>
          )}
        </div>

        {chartData.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4">Delinquency Rates by Vehicle</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis tickFormatter={(v) => `${v}%`} className="text-xs" />
                <Tooltip formatter={(v: number) => formatPercent(v)} />
                <Legend />
                <Bar dataKey="30d" fill="#f59e0b" name="30-Day" />
                <Bar dataKey="60d" fill="#ef4444" name="60-Day" />
                <Bar dataKey="90d" fill="#991b1b" name="90-Day" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
