import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, LayoutGrid, List, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getRecurringDeposits, type RecurringDeposit } from '../api/goalApi';
import { RecurringDepositCard } from '../components/recurring/RecurringDepositCard';
import { PaymentProgressBar } from '../components/recurring/PaymentProgressBar';

export function RecurringDepositListPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ['recurring-deposits'],
    queryFn: getRecurringDeposits,
  });

  const filtered = useMemo(() => {
    let result = deposits;
    if (statusFilter) result = result.filter((d) => d.status === statusFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((d) =>
        (d.depositNumber?.toLowerCase().includes(q)) ||
        (d.customer?.displayName?.toLowerCase().includes(q)) ||
        String(d.id).includes(q)
      );
    }
    return result;
  }, [deposits, statusFilter, searchTerm]);

  const activeCount = deposits.filter((d) => d.status === 'ACTIVE').length;
  const totalValue = deposits.reduce((s, d) => s + d.installmentAmount * d.totalInstallments, 0);
  const onTrack = deposits.filter((d) => d.status === 'ACTIVE' && d.missedInstallments === 0).length;
  const overdueCount = deposits.filter((d) => d.missedInstallments > 0).length;

  const columns: ColumnDef<RecurringDeposit, unknown>[] = [
    { accessorKey: 'depositNumber', header: 'Deposit #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.depositNumber ?? `RD-${row.original.id}`}</span> },
    { id: 'customer', header: 'Customer', cell: ({ row }) => <span className="font-medium text-sm">{row.original.customer?.displayName ?? '—'}</span> },
    { accessorKey: 'installmentAmount', header: 'Installment', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.installmentAmount)}</span> },
    { accessorKey: 'frequency', header: 'Freq', cell: ({ row }) => <span className="text-xs capitalize">{row.original.frequency.toLowerCase().replace('_', '-')}</span> },
    { id: 'progress', header: 'Progress', cell: ({ row }) => <PaymentProgressBar paid={row.original.completedInstallments} total={row.original.totalInstallments} size="sm" /> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot /> },
    { accessorKey: 'nextDueDate', header: 'Next Due', cell: ({ row }) => <span className={cn('text-xs', row.original.missedInstallments > 0 && 'text-red-600 font-medium')}>{formatDate(row.original.nextDueDate)}</span> },
    { accessorKey: 'totalPenalties', header: 'Penalties', cell: ({ row }) => row.original.totalPenalties > 0 ? <span className="text-red-600 font-mono text-xs">{formatMoney(row.original.totalPenalties)}</span> : <span className="text-xs text-muted-foreground">—</span> },
  ];

  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader title="Recurring Deposits" subtitle="Manage scheduled deposit plans"
        actions={<button onClick={() => navigate('/accounts/recurring-deposits/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Plan</button>} />

      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card"><div className="stat-label">Active Plans</div><div className="stat-value text-green-600">{activeCount}</div></div>
          <div className="stat-card"><div className="stat-label">Total Value</div><div className="stat-value text-sm font-mono">{formatMoney(totalValue)}</div></div>
          <div className="stat-card"><div className="stat-label">On Track</div><div className="stat-value">{onTrack}</div></div>
          <div className="stat-card"><div className="stat-label">Overdue</div><div className="stat-value text-red-600">{overdueCount}</div></div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="MATURED">Matured</option>
            <option value="BROKEN">Broken</option>
            <option value="CLOSED">Closed</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-lg', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={cn('p-2 rounded-lg', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : viewMode === 'grid' ? (
          filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground"><p className="text-sm font-medium">No recurring deposits found</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((d) => <RecurringDepositCard key={d.id} deposit={d} />)}
            </div>
          )
        ) : (
          <DataTable columns={columns} data={filtered} enableGlobalFilter enableExport exportFilename="recurring-deposits"
            onRowClick={(rd) => navigate(`/accounts/recurring-deposits/${rd.id}`)} emptyMessage="No recurring deposits found" />
        )}
      </div>
    </>
  );
}
