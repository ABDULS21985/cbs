import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle, Clock, DollarSign, TrendingUp, ShieldAlert, Scale,
  Download, Search,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useSecuritiesFailsDashboard,
  useSecuritiesFailsCounterpartyReport,
} from '../hooks/useCustodyExt';
import type { SecuritiesFail } from '../types/securitiesFail';
import { AgingBucketChart } from '../components/AgingBucketChart';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ESCALATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BUY_IN_INITIATED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function agingColor(days: number) {
  if (days <= 2) return 'text-green-600 dark:text-green-400';
  if (days <= 10) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function SecuritiesFailsPage() {
  useEffect(() => { document.title = 'Securities Fails | CBS'; }, []);
  const navigate = useNavigate();
  const [bucketFilter, setBucketFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: dashboard, isLoading: dashLoading } = useSecuritiesFailsDashboard();
  const { data: cpReport } = useSecuritiesFailsCounterpartyReport();

  // Parse dashboard data
  const db = dashboard as Record<string, unknown> | undefined;
  const fails = (db?.fails as SecuritiesFail[]) ?? [];
  const openCount = (db?.openCount as number) ?? fails.filter(f => f.status === 'OPEN').length;
  const totalAmount = (db?.totalAmount as number) ?? fails.reduce((s, f) => s + (f.amount ?? 0), 0);
  const avgAging = (db?.avgAgingDays as number) ?? (fails.length > 0 ? Math.round(fails.reduce((s, f) => s + f.agingDays, 0) / fails.length) : 0);
  const buyInEligible = (db?.buyInEligible as number) ?? fails.filter(f => f.buyInEligible).length;
  const penaltyTotal = (db?.penaltyAccrued as number) ?? fails.reduce((s, f) => s + (f.penaltyAccrued ?? 0), 0);
  const escalatedCount = (db?.escalated as number) ?? fails.filter(f => f.status === 'ESCALATED').length;

  // Aging bucket data
  const bucketData = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    fails.forEach(f => {
      const bucket = f.agingBucket || 'Unknown';
      if (!map[bucket]) map[bucket] = { count: 0, amount: 0 };
      map[bucket].count++;
      map[bucket].amount += f.amount ?? 0;
    });
    return Object.entries(map).map(([bucket, v]) => ({ bucket, ...v }));
  }, [fails]);

  // Counterparty report data
  const cpData = useMemo(() => {
    if (cpReport && typeof cpReport === 'object' && !Array.isArray(cpReport)) {
      return Object.entries(cpReport as Record<string, number>).map(([name, count]) => ({ name, count }));
    }
    return [];
  }, [cpReport]);

  // Filtered fails
  const filtered = useMemo(() => {
    let result = fails;
    if (bucketFilter) result = result.filter(f => f.agingBucket === bucketFilter);
    if (statusFilter) result = result.filter(f => f.status === statusFilter);
    return result;
  }, [fails, bucketFilter, statusFilter]);

  const columns = useMemo<ColumnDef<SecuritiesFail, unknown>[]>(() => [
    { accessorKey: 'failRef', header: 'Fail Ref', cell: ({ row }) => (
      <button onClick={e => { e.stopPropagation(); navigate(`/custody/fails/${row.original.failRef}`); }}
        className="font-mono text-xs font-medium text-primary hover:underline">{row.original.failRef}</button>
    )},
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => (
      <div><span className="text-sm font-medium">{row.original.instrumentCode}</span><p className="text-xs text-muted-foreground truncate max-w-[150px]">{row.original.instrumentName}</p></div>
    )},
    { accessorKey: 'isin', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.isin}</span> },
    { accessorKey: 'counterpartyName', header: 'Counterparty', cell: ({ row }) => <span className="text-sm">{row.original.counterpartyName}</span> },
    { accessorKey: 'failType', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.failType?.replace(/_/g, ' ')}</span> },
    { accessorKey: 'originalSettlementDate', header: 'Orig Settle', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.originalSettlementDate)}</span> },
    { accessorKey: 'agingDays', header: 'Aging', cell: ({ row }) => (
      <span className={cn('text-sm font-semibold font-mono', agingColor(row.original.agingDays))}>{row.original.agingDays}d</span>
    )},
    { accessorKey: 'agingBucket', header: 'Bucket', cell: ({ row }) => <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.original.agingBucket}</span> },
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => <span className="font-mono text-xs">{row.original.quantity?.toLocaleString()}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
    { accessorKey: 'penaltyAccrued', header: 'Penalty', cell: ({ row }) => (
      <span className={cn('font-mono text-xs', (row.original.penaltyAccrued ?? 0) > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground')}>
        {(row.original.penaltyAccrued ?? 0) > 0 ? formatMoney(row.original.penaltyAccrued) : '—'}
      </span>
    )},
    { accessorKey: 'buyInEligible', header: 'Buy-In', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        row.original.buyInEligible ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-500')}>
        {row.original.buyInEligible ? 'Yes' : 'No'}
      </span>
    )},
    { accessorKey: 'escalationLevel', header: 'Escalation', cell: ({ row }) => <span className="text-xs">{row.original.escalationLevel || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[row.original.status] || 'bg-gray-100 text-gray-600')}>
        {row.original.status?.replace(/_/g, ' ')}
      </span>
    )},
  ], [navigate]);

  return (
    <>
      <PageHeader title="Securities Fails Management" subtitle="Settlement fail tracking, escalation, buy-in, and CSDR penalties" />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Open Fails" value={openCount} format="number" icon={AlertTriangle} loading={dashLoading} />
          <StatCard label="Total Amount" value={totalAmount} format="money" compact icon={DollarSign} loading={dashLoading} />
          <StatCard label="Avg Aging" value={`${avgAging}d`} icon={Clock} loading={dashLoading} />
          <StatCard label="Buy-In Eligible" value={buyInEligible} format="number" icon={ShieldAlert} loading={dashLoading} />
          <StatCard label="Penalty Accrued" value={penaltyTotal} format="money" compact icon={Scale} loading={dashLoading} />
          <StatCard label="Escalated" value={escalatedCount} format="number" icon={TrendingUp} loading={dashLoading} />
        </div>

        {/* Aging Chart */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Aging Distribution</h3>
            {bucketFilter && (
              <button onClick={() => setBucketFilter('')} className="text-xs text-primary hover:underline">Clear filter: {bucketFilter}</button>
            )}
          </div>
          <AgingBucketChart data={bucketData} onBucketClick={b => setBucketFilter(bucketFilter === b ? '' : b)} />
        </div>

        {/* Counterparty Report */}
        {cpData.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-3">Counterparty Fail Report</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cpData.map(cp => (
                <div key={cp.name} className={cn('rounded-lg border p-3', cp.count > 5 ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : '')}>
                  <p className="text-xs text-muted-foreground truncate">{cp.name}</p>
                  <p className={cn('text-lg font-bold font-mono', cp.count > 5 ? 'text-red-600' : '')}>{cp.count}</p>
                  <p className="text-[10px] text-muted-foreground">open fails</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['', 'OPEN', 'ESCALATED', 'BUY_IN_INITIATED', 'RESOLVED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40 border-border')}>
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>

        {/* Table */}
        <DataTable columns={columns} data={filtered} isLoading={dashLoading} enableGlobalFilter enableExport exportFilename="securities-fails"
          emptyMessage="No securities fails found" pageSize={20} onRowClick={row => navigate(`/custody/fails/${row.failRef}`)} />
      </div>
    </>
  );
}
