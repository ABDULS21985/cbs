import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { CreditCard, Clock, Truck, CheckCircle2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCards, useBulkActivate } from '../hooks/useCardData';
import type { Card } from '../types/card';

const SCHEME_COLORS: Record<string, string> = {
  VISA: 'text-blue-600',
  MASTERCARD: 'text-red-600',
  VERVE: 'text-slate-700 dark:text-slate-300',
};

const columns: ColumnDef<Card, unknown>[] = [
  {
    accessorKey: 'cardNumberMasked',
    header: 'Card #',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">{row.original.cardNumberMasked}</span>
    ),
  },
  {
    accessorKey: 'customerDisplayName',
    header: 'Customer',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.customerDisplayName}</span>,
  },
  {
    accessorKey: 'cardType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.cardType} />,
  },
  {
    accessorKey: 'cardScheme',
    header: 'Scheme',
    cell: ({ row }) => (
      <span className={cn('text-xs font-bold', SCHEME_COLORS[row.original.cardScheme])}>
        {row.original.cardScheme}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'issueDate',
    header: 'Issued',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.issueDate ? formatDate(row.original.issueDate) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'deliveryMethod',
    header: 'Delivery',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.deliveryMethod?.replace('_', ' ') ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'branchCode',
    header: 'Branch',
    cell: ({ row }) => (
      <span className="text-xs font-mono">{row.original.branchCode ?? '—'}</span>
    ),
  },
  {
    id: 'tier',
    header: 'Tier',
    cell: ({ row }) => (
      <span className="text-xs uppercase tracking-wider">{row.original.cardTier ?? '—'}</span>
    ),
  },
];

export function CardIssuancePage() {
  useEffect(() => { document.title = 'Card Issuance | CBS'; }, []);

  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: allCards = [], isLoading } = useCards(statusFilter ? { status: statusFilter } : undefined);
  const bulkActivate = useBulkActivate();

  const pendingIssuance = allCards.filter((c) => c.status === 'PENDING_ACTIVATION').length;
  const issuedToday = allCards.filter((c) => {
    if (!c.issueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return c.issueDate.startsWith(today);
  }).length;
  const activeCount = allCards.filter((c) => c.status === 'ACTIVE').length;
  const courierCount = allCards.filter((c) => c.deliveryMethod === 'COURIER' && c.status === 'PENDING_ACTIVATION').length;

  const STATUS_FILTERS = [
    { label: 'All', value: undefined },
    { label: 'Pending Activation', value: 'PENDING_ACTIVATION' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Blocked', value: 'BLOCKED' },
  ];

  const handleBulkActivate = () => {
    if (selectedIds.length === 0) {
      toast.error('Select cards to activate');
      return;
    }
    bulkActivate.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(`${selectedIds.length} card(s) activated`);
        setSelectedIds([]);
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Card Issuance"
        subtitle="Card operations dashboard — issue, track, and fulfill cards"
        actions={
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkActivate}
                disabled={bulkActivate.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Activate Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => navigate('/cards/request')}
              className="flex items-center gap-2 btn-primary"
            >
              <Plus className="w-4 h-4" /> New Card Request
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pending Issuance" value={pendingIssuance} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Issued Today" value={issuedToday} format="number" icon={CreditCard} loading={isLoading} />
          <StatCard label="Active Cards" value={activeCount} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Courier In-Transit" value={courierCount} format="number" icon={Truck} loading={isLoading} />
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted/40 border-border',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={allCards}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="card-issuance"
          emptyMessage="No cards found"
          pageSize={20}
          onRowClick={(row) => navigate(`/cards/${row.id}`)}
        />
      </div>
    </>
  );
}
