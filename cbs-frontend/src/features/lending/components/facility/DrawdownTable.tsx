import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { Drawdown } from '../../types/facility';

interface DrawdownTableProps {
  data: Drawdown[];
  isLoading?: boolean;
}

export function DrawdownTable({ data, isLoading }: DrawdownTableProps) {
  const columns = useMemo<ColumnDef<Drawdown>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
      },
      {
        accessorKey: 'rate',
        header: 'Rate',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.rate.toFixed(2)}%</span>
        ),
      },
      {
        accessorKey: 'maturityDate',
        header: 'Maturity',
        cell: ({ row }) => formatDate(row.original.maturityDate),
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
      emptyMessage="No drawdowns recorded for this facility"
      enableExport
      exportFilename="drawdowns"
      pageSize={10}
    />
  );
}
