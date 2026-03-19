import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatusBadge, DataTable } from '@/components/shared';
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
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['treasury', 'capital-markets', 'deals'],
    queryFn: () => apiGet<Deal[]>('/api/v1/capital-markets/deals'),
  });

  return (
    <>
      <PageHeader title="Capital Markets" subtitle="ECM/DCM deal pipeline, book building, allotments" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'pipeline', label: 'Deal Pipeline', badge: deals.length || undefined, content: (
            <div className="p-4"><DataTable columns={dealCols} data={deals} isLoading={isLoading} enableGlobalFilter /></div>
          )},
          { id: 'offers', label: 'Active Offers', content: <div className="p-8 text-center text-muted-foreground">Active offers tracking coming soon</div> },
          { id: 'book', label: 'Book Building', content: <div className="p-8 text-center text-muted-foreground">Investor order book coming soon</div> },
          { id: 'allotment', label: 'Allotments', content: <div className="p-8 text-center text-muted-foreground">Allotment management coming soon</div> },
        ]} />
      </div>
    </>
  );
}
