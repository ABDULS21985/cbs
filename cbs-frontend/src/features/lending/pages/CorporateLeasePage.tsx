import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable } from '@/components/shared';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { Briefcase, Clock, DollarSign, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useCorporateLeases, useCorporateLeaseSummary, useCorporateLeaseMaturity, useCreateCorporateLease } from '../hooks/useLendingExt';
import { toast } from 'sonner';

export function CorporateLeasePage() {
  useEffect(() => { document.title = 'Corporate Lease Portfolios | CBS'; }, []);
  const [customerId, setCustomerId] = useState(0);

  const { data: portfolios = [], isLoading } = useCorporateLeases();
  const { data: summary } = useCorporateLeaseSummary(customerId);
  const { data: maturity = [] } = useCorporateLeaseMaturity(customerId);

  const totalLiability = portfolios.reduce((s: number, p: any) => s + (p.totalLeaseLiability ?? 0), 0);
  const totalActive = portfolios.reduce((s: number, p: any) => s + (p.activeLeases ?? 0), 0);
  const expiringSoon = portfolios.reduce((s: number, p: any) => s + (p.expiringNext90Days ?? 0), 0);

  const cols: ColumnDef<any, unknown>[] = [
    { accessorKey: 'corporateCustomerId', header: 'Customer ID' },
    { accessorKey: 'totalLeases', header: 'Total Leases' },
    { accessorKey: 'activeLeases', header: 'Active' },
    { accessorKey: 'totalRouAssetValue', header: 'ROU Assets', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.totalRouAssetValue)}</span> },
    { accessorKey: 'totalLeaseLiability', header: 'Liability', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.totalLeaseLiability)}</span> },
    { accessorKey: 'weightedAvgRate', header: 'Avg Rate', cell: ({ row }) => formatPercent(row.original.weightedAvgRate ?? 0) },
    { accessorKey: 'annualLeaseExpense', header: 'Annual Expense', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.annualLeaseExpense)}</span> },
    { accessorKey: 'expiringNext90Days', header: 'Expiring 90d' },
    { accessorKey: 'asOfDate', header: 'As Of', cell: ({ row }) => row.original.asOfDate ? formatDate(row.original.asOfDate) : '—' },
  ];

  return (
    <>
      <PageHeader title="Corporate Lease Portfolios" subtitle="Portfolio-level lease management and IFRS 16 analytics" />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Portfolios" value={portfolios.length} format="number" icon={Briefcase} />
          <StatCard label="Active Leases" value={totalActive} format="number" icon={DollarSign} />
          <StatCard label="Total Liability" value={formatMoney(totalLiability)} icon={DollarSign} />
          <StatCard label="Expiring 90d" value={expiringSoon} format="number" icon={Clock} />
        </div>

        <DataTable columns={cols} data={portfolios} isLoading={isLoading} enableGlobalFilter emptyMessage="No corporate lease portfolios" />

        {/* Customer lookup */}
        <div className="surface-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Customer Lease Summary</h3>
          <div className="flex gap-3 items-end">
            <div><label className="text-xs text-muted-foreground">Customer ID</label>
              <input type="number" value={customerId || ''} onChange={(e) => setCustomerId(Number(e.target.value))} placeholder="Enter customer ID"
                className="w-48 mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
          </div>
          {summary && customerId > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total Leases</p><p className="font-bold">{summary.totalLeases}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Active</p><p className="font-bold">{summary.activeLeases}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">ROU Assets</p><p className="font-bold font-mono">{formatMoney(summary.totalRouAssetValue)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Liability</p><p className="font-bold font-mono">{formatMoney(summary.totalLeaseLiability)}</p></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
