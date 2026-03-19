import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatusBadge, DataTable } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';

interface Deal { id: number; name: string; type: string; issuer: string; targetAmount: number; stage: string; leadManager: string; }

const mockDeals: Deal[] = [
  { id: 1, name: 'BUA Cement Bond', type: 'CORPORATE_BOND', issuer: 'BUA Cement Plc', targetAmount: 50000000000, stage: 'BOOKBUILDING', leadManager: 'BellBank' },
  { id: 2, name: 'FBNH Rights Issue', type: 'RIGHTS_ISSUE', issuer: 'FBN Holdings Plc', targetAmount: 150000000000, stage: 'REGULATORY', leadManager: 'FBN Quest' },
  { id: 3, name: 'MTN Nigeria CP', type: 'COMMERCIAL_PAPER', issuer: 'MTN Nigeria', targetAmount: 100000000000, stage: 'PRICING', leadManager: 'Stanbic IBTC' },
];

const dealCols: ColumnDef<Deal, any>[] = [
  { accessorKey: 'name', header: 'Deal Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.type} /> },
  { accessorKey: 'issuer', header: 'Issuer' },
  { accessorKey: 'targetAmount', header: 'Target', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.targetAmount)}</span> },
  { accessorKey: 'stage', header: 'Stage', cell: ({ row }) => <StatusBadge status={row.original.stage} dot /> },
  { accessorKey: 'leadManager', header: 'Lead Manager' },
];

export function CapitalMarketsPage() {
  return (
    <>
      <PageHeader title="Capital Markets" subtitle="ECM/DCM deal pipeline, book building, allotments" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'pipeline', label: 'Deal Pipeline', badge: mockDeals.length, content: (
            <div className="p-4"><DataTable columns={dealCols} data={mockDeals} enableGlobalFilter /></div>
          )},
          { id: 'offers', label: 'Active Offers', content: <div className="p-8 text-center text-muted-foreground">Active offers tracking coming soon</div> },
          { id: 'book', label: 'Book Building', content: <div className="p-8 text-center text-muted-foreground">Investor order book coming soon</div> },
          { id: 'allotment', label: 'Allotments', content: <div className="p-8 text-center text-muted-foreground">Allotment management coming soon</div> },
        ]} />
      </div>
    </>
  );
}
