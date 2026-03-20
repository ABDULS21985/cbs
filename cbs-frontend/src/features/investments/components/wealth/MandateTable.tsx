import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { WealthManagementPlan } from '../../api/wealthApi';

const columns: ColumnDef<WealthManagementPlan, unknown>[] = [
  {
    accessorKey: 'planCode',
    header: 'Code',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.planCode}</span>,
  },
  {
    accessorKey: 'customerId',
    header: 'Client',
    cell: ({ row }) => <span className="font-medium">Customer #{row.original.customerId}</span>,
  },
  {
    accessorKey: 'planType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.planType} />,
  },
  {
    accessorKey: 'totalInvestableAssets',
    header: 'Investable Assets',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.totalInvestableAssets != null ? formatMoney(row.original.totalInvestableAssets) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'advisorId',
    header: 'Advisor',
    cell: ({ row }) => <span className="text-sm">{row.original.advisorId ?? '—'}</span>,
  },
  {
    accessorKey: 'nextReviewDate',
    header: 'Next Review',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.nextReviewDate ? formatDate(row.original.nextReviewDate) : '—'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

interface Props {
  mandates: WealthManagementPlan[];
  isLoading?: boolean;
  onRowClick?: (mandate: WealthManagementPlan) => void;
}

export function MandateTable({ mandates, isLoading, onRowClick }: Props) {
  return (
    <DataTable
      columns={columns}
      data={mandates}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No wealth management mandates found"
      onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
    />
  );
}
