import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { Campaign } from '../../api/marketingAnalyticsApi';

interface CampaignPerformanceTableProps {
  data: Campaign[];
  isLoading: boolean;
  onRowClick: (campaign: Campaign) => void;
}

const columns: ColumnDef<Campaign>[] = [
  {
    accessorKey: 'name',
    header: 'Campaign',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm text-foreground">{row.original.name}</p>
        <p className="text-xs font-mono text-muted-foreground">{row.original.code}</p>
        <StatusBadge status={row.original.status} dot />
      </div>
    ),
  },
  {
    accessorKey: 'sentCount',
    header: 'Sent',
    cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'deliveredCount',
    header: 'Delivered',
    cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'openedCount',
    header: 'Opened',
    cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'clickedCount',
    header: 'Clicked',
    cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'convertedCount',
    header: 'Converted',
    cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'revenueGenerated',
    header: 'Revenue',
    cell: ({ getValue }) => <span className="text-sm">{formatMoney(getValue<number>())}</span>,
  },
  {
    accessorKey: 'conversionRate',
    header: 'Conv. Rate',
    cell: ({ getValue }) => <span className="text-sm font-semibold">{formatPercent(getValue<number>(), 1)}</span>,
  },
];

export function CampaignPerformanceTable({ data, isLoading, onRowClick }: CampaignPerformanceTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableGlobalFilter
      enableColumnVisibility
      exportFilename="campaigns"
      emptyMessage="No campaigns found"
    />
  );
}
