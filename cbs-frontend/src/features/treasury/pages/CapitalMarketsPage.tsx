import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, DataTable } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';

interface Deal { id: number; name: string; type: string; issuer: string; targetAmount: number; stage: string; leadManager: string; }

const dealCols: ColumnDef<Deal, any>[] = [
  { accessorKey: 'name', header: 'Deal Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.type} /> },
  { accessorKey: 'issuer', header: 'Issuer' },
  { accessorKey: 'targetAmount', header: 'Target', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.targetAmount)}</span> },
  { accessorKey: 'stage', header: 'Stage', cell: ({ row }) => <StatusBadge status={row.original.stage} dot /> },
  { accessorKey: 'leadManager', header: 'Lead Manager' },
];

export function CapitalMarketsPage() {
  const { data: deals = [], isLoading, isError } = useQuery({
    queryKey: ['treasury', 'capital-markets', 'deals'],
    queryFn: () => apiGet<Deal[]>('/api/v1/capital-markets/deals'),
  });

  return (
    <>
      <PageHeader title="Capital Markets" subtitle="Live capital-markets deal pipeline from the backend" />
      <div className="page-container space-y-4">
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load capital-markets deals from the backend.
          </div>
        )}
        <div className="rounded-lg border bg-card p-4">
          <DataTable columns={dealCols} data={deals} isLoading={isLoading} enableGlobalFilter emptyMessage="No capital-markets deals returned by the backend" />
        </div>
      </div>
    </>
  );
}
