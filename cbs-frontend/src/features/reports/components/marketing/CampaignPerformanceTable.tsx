import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Campaign } from '../../api/marketingAnalyticsApi';

interface CampaignPerformanceTableProps {
  data: Campaign[];
  isLoading: boolean;
  onRowClick: (campaign: Campaign) => void;
}

const TYPE_COLORS: Record<Campaign['type'], string> = {
  ACQUISITION: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CROSS_SELL: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RETENTION: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REACTIVATION: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BRAND_AWARENESS: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

function TypeBadge({ type }: { type: Campaign['type'] }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TYPE_COLORS[type])}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function RoiBadge({ roi }: { roi: number }) {
  const color =
    roi >= 2
      ? 'text-green-600 dark:text-green-400'
      : roi >= 1
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';
  return <span className={cn('font-semibold text-sm', color)}>{roi > 0 ? `${roi.toFixed(2)}x` : '—'}</span>;
}

const columns: ColumnDef<Campaign>[] = [
  {
    accessorKey: 'name',
    header: 'Campaign',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm text-foreground">{row.original.name}</p>
        <StatusBadge status={row.original.status} dot />
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <TypeBadge type={row.original.type} />,
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>()}</span>,
  },
  {
    id: 'dates',
    header: 'Period',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(row.original.startDate)} — {formatDate(row.original.endDate)}
      </span>
    ),
  },
  {
    accessorKey: 'targetCount',
    header: 'Target',
    cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'reachedCount',
    header: 'Reached',
    cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'conversions',
    header: 'Conversions',
    cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<number>().toLocaleString()}</span>,
  },
  {
    accessorKey: 'cost',
    header: 'Cost',
    cell: ({ getValue }) => <span className="text-sm">{formatMoney(getValue<number>())}</span>,
  },
  {
    accessorKey: 'revenue',
    header: 'Revenue',
    cell: ({ getValue }) => <span className="text-sm">{formatMoney(getValue<number>())}</span>,
  },
  {
    accessorKey: 'roi',
    header: 'ROI',
    cell: ({ getValue }) => <RoiBadge roi={getValue<number>()} />,
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
