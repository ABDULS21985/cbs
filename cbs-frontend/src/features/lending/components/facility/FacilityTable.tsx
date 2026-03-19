import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { CreditFacility } from '../../types/facility';

interface FacilityTableProps {
  data: CreditFacility[];
  isLoading?: boolean;
  onRowClick?: (row: CreditFacility) => void;
}

const TYPE_LABELS: Record<string, string> = {
  REVOLVING: 'Revolving',
  TERM: 'Term',
  OVERDRAFT: 'Overdraft',
  GUARANTEE: 'Guarantee',
  LC: 'Letter of Credit',
};

export function FacilityTable({ data, isLoading, onRowClick }: FacilityTableProps) {
  const columns = useMemo<ColumnDef<CreditFacility>[]>(
    () => [
      {
        accessorKey: 'facilityNumber',
        header: 'Facility #',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.facilityNumber}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.customerName}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-sm">{TYPE_LABELS[row.original.type] ?? row.original.type}</span>
        ),
      },
      {
        accessorKey: 'approvedLimit',
        header: 'Limit',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatMoney(row.original.approvedLimit, row.original.currency)}</span>
        ),
      },
      {
        accessorKey: 'utilized',
        header: 'Utilized',
        cell: ({ row }) => {
          const pct = row.original.approvedLimit > 0
            ? (row.original.utilized / row.original.approvedLimit) * 100
            : 0;
          const color =
            pct < 70 ? 'bg-green-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div className="space-y-1 min-w-[100px]">
              <span className="font-mono text-sm">{formatMoney(row.original.utilized, row.original.currency)}</span>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={`${color} h-1.5 rounded-full`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'available',
        header: 'Available',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-green-600">
            {formatMoney(row.original.available, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry',
        cell: ({ row }) => formatDate(row.original.expiryDate),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableExport
      exportFilename="credit-facilities"
      emptyMessage="No credit facilities found"
      pageSize={15}
    />
  );
}
