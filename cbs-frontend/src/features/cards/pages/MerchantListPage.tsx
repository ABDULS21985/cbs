import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import { Plus, Store, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { useMerchants } from '../hooks/useCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { Merchant } from '../types/card';
import { cn } from '@/lib/utils';

const riskColors: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PROHIBITED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const columns: ColumnDef<Merchant, any>[] = [
  {
    accessorKey: 'merchantId',
    header: 'Merchant ID',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.merchantId}</span>,
  },
  {
    accessorKey: 'merchantName',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.merchantName}</span>,
  },
  {
    accessorKey: 'mcc',
    header: 'MCC',
    cell: ({ row }) => (
      <div>
        <span className="font-mono text-xs">{row.original.mcc}</span>
        <span className="block text-xs text-muted-foreground">{row.original.mccDescription}</span>
      </div>
    ),
  },
  {
    accessorKey: 'terminalCount',
    header: 'Terminals',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.terminalCount}</span>,
  },
  {
    accessorKey: 'monthlyVolume',
    header: 'Monthly Volume',
    cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.monthlyVolume)}</span>,
  },
  {
    accessorKey: 'mdrRate',
    header: 'MDR %',
    cell: ({ row }) => <span className="text-sm tabular-nums">{formatPercent(row.original.mdrRate)}</span>,
  },
  {
    accessorKey: 'chargebackRate',
    header: 'CB %',
    cell: ({ row }) => (
      <span className={cn('text-sm tabular-nums font-medium', row.original.chargebackRate > 1 && 'text-red-600')}>
        {formatPercent(row.original.chargebackRate)}
      </span>
    ),
  },
  {
    accessorKey: 'riskCategory',
    header: 'Risk',
    cell: ({ row }) => (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', riskColors[row.original.riskCategory])}>
        {row.original.riskCategory}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'onboardedDate',
    header: 'Onboarded',
    cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.original.onboardedDate)}</span>,
  },
];

export function MerchantListPage() {
  const navigate = useNavigate();
  const { data: merchants = [], isLoading } = useMerchants();

  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [mccSearch, setMccSearch] = useState('');
  const [highCbOnly, setHighCbOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = merchants;
    if (statusFilter) result = result.filter((m) => m.status === statusFilter);
    if (riskFilter) result = result.filter((m) => m.riskCategory === riskFilter);
    if (mccSearch) result = result.filter((m) => m.mcc.includes(mccSearch) || m.mccDescription.toLowerCase().includes(mccSearch.toLowerCase()));
    if (highCbOnly) result = result.filter((m) => m.chargebackRate > 1);
    return result;
  }, [merchants, statusFilter, riskFilter, mccSearch, highCbOnly]);

  const totalVolume = merchants.reduce((s, m) => s + m.monthlyVolume, 0);
  const mdrRevenue = merchants.reduce((s, m) => s + (m.monthlyVolume * m.mdrRate) / 100, 0);
  const highRisk = merchants.filter((m) => m.riskCategory === 'HIGH' || m.riskCategory === 'PROHIBITED').length;
  const avgCb = merchants.length > 0 ? merchants.reduce((s, m) => s + m.chargebackRate, 0) / merchants.length : 0;

  return (
    <>
      <PageHeader
        title="Merchant Management"
        subtitle="Onboard, monitor, and manage acquiring merchants"
        actions={
          <button
            onClick={() => navigate('/cards/merchants/onboard')}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="w-4 h-4" /> Onboard Merchant
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Active Merchants" value={merchants.filter((m) => m.status === 'ACTIVE').length} format="number" icon={Store} />
          <StatCard label="Monthly Volume" value={totalVolume} format="money" compact icon={TrendingUp} />
          <StatCard label="MDR Revenue" value={mdrRevenue} format="money" compact icon={BarChart3} />
          <StatCard label="High Risk" value={highRisk} format="number" icon={AlertTriangle} />
          <StatCard label="Avg CB Rate" value={avgCb} format="percent" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Risk</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="PROHIBITED">Prohibited</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">MCC Search</label>
            <input
              value={mccSearch}
              onChange={(e) => setMccSearch(e.target.value)}
              placeholder="Code or description..."
              className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
            />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={highCbOnly}
                onChange={(e) => setHighCbOnly(e.target.checked)}
                className="rounded border-muted-foreground/30"
              />
              <span className="text-xs text-muted-foreground">CB &gt; 1% only</span>
            </label>
          </div>
          {(statusFilter || riskFilter || mccSearch || highCbOnly) && (
            <div className="flex items-end pb-0.5 ml-auto">
              <button
                onClick={() => { setStatusFilter(''); setRiskFilter(''); setMccSearch(''); setHighCbOnly(false); }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="merchants"
          onRowClick={(row) => navigate(`/cards/merchants/${row.id}`)}
          emptyMessage="No merchants match your filters"
        />
      </div>
    </>
  );
}
