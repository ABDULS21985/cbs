import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { Plus, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { escrowApi } from '../../api/escrowApi';
import type { EscrowMandate, EscrowStatus } from '../../types/escrow';

const STATUS_TABS: { label: string; value: EscrowStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Partially Released', value: 'PARTIALLY_RELEASED' },
  { label: 'Fully Released', value: 'FULLY_RELEASED' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const columns: ColumnDef<EscrowMandate, unknown>[] = [
  {
    accessorKey: 'mandateNumber',
    header: 'Mandate #',
    cell: ({ row }) => <span className="font-mono text-xs font-semibold text-primary">{row.original.mandateNumber}</span>,
  },
  { accessorKey: 'customerDisplayName', header: 'Customer' },
  {
    accessorKey: 'escrowType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.escrowType} />,
  },
  {
    accessorKey: 'purpose',
    header: 'Purpose',
    cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.purpose}</span>,
  },
  {
    accessorKey: 'mandatedAmount',
    header: 'Mandated',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.mandatedAmount, row.original.currencyCode)}</span>,
  },
  {
    accessorKey: 'releasedAmount',
    header: 'Released',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.releasedAmount, row.original.currencyCode)}</span>,
  },
  {
    accessorKey: 'remainingAmount',
    header: 'Remaining',
    cell: ({ row }) => <span className="font-mono text-sm font-semibold">{formatMoney(row.original.remainingAmount, row.original.currencyCode)}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'effectiveDate',
    header: 'Effective',
    cell: ({ row }) => <span className="text-xs">{formatDate(row.original.effectiveDate)}</span>,
  },
  {
    accessorKey: 'expiryDate',
    header: 'Expiry',
    cell: ({ row }) => <span className="text-xs">{row.original.expiryDate ? formatDate(row.original.expiryDate) : '—'}</span>,
  },
];

export function EscrowListPage() {
  useEffect(() => { document.title = 'Escrow & Trust | CBS'; }, []);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<EscrowStatus | 'ALL'>('ALL');

  const { data: mandates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['escrow', 'mandates'],
    queryFn: () => escrowApi.list(),
    staleTime: 30_000,
  });

  const filtered = statusFilter === 'ALL'
    ? mandates
    : mandates.filter((m) => m.status === statusFilter);

  const activeCount = mandates.filter((m) => m.status === 'ACTIVE').length;
  const totalMandated = mandates.reduce((s, m) => s + (m.mandatedAmount || 0), 0);
  const totalReleased = mandates.reduce((s, m) => s + (m.releasedAmount || 0), 0);
  const pendingReleases = mandates.reduce((s, m) =>
    s + (m.releases?.filter((r) => r.status === 'PENDING').length || 0), 0);

  return (
    <>
      <PageHeader
        title="Escrow & Trust Management"
        subtitle="Ring-fenced accounts with conditional release and multi-signatory approval"
        actions={
          <button
            onClick={() => navigate('/accounts/escrow/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Mandate
          </button>
        }
      />

      <div className="page-container space-y-5">
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load escrow mandates.</span>
            <button onClick={() => refetch()} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Mandates" value={mandates.length} format="number" icon={Shield} loading={isLoading} />
          <StatCard label="Active" value={activeCount} format="number" loading={isLoading} />
          <StatCard label="Total Mandated" value={totalMandated} format="money" compact loading={isLoading} />
          <StatCard label="Pending Releases" value={pendingReleases} format="number" loading={isLoading} />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count = tab.value === 'ALL' ? mandates.length : mandates.filter((m) => m.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                  statusFilter === tab.value
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground',
                )}
              >
                {tab.label}
                {count > 0 && <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="card">
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            enableGlobalFilter
            enableExport
            exportFilename="escrow-mandates"
            onRowClick={(row) => navigate(`/accounts/escrow/${row.id}`)}
            emptyMessage="No escrow mandates found"
          />
        </div>
      </div>
    </>
  );
}
