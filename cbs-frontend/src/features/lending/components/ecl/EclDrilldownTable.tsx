import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { EclLoan } from '../../types/ecl';

interface Props {
  data: EclLoan[];
  isLoading: boolean;
}

const STAGE_BADGE: Record<number, string> = {
  1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  3: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function EclDrilldownTable({ data, isLoading }: Props) {
  const columns = useMemo<ColumnDef<EclLoan, unknown>[]>(
    () => [
      {
        accessorKey: 'loanNumber',
        header: 'Loan #',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.loanNumber}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.customerName}</span>
        ),
      },
      {
        accessorKey: 'outstanding',
        header: 'Outstanding',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.outstanding, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              STAGE_BADGE[row.original.stage] ?? ''
            }`}
          >
            Stage {row.original.stage}
          </span>
        ),
      },
      {
        accessorKey: 'pd',
        header: 'PD',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatPercent(row.original.pd, 2)}</span>
        ),
      },
      {
        accessorKey: 'lgd',
        header: 'LGD',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatPercent(row.original.lgd, 2)}</span>
        ),
      },
      {
        accessorKey: 'ead',
        header: 'EAD',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.ead, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'ecl',
        header: 'ECL',
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatMoney(row.original.ecl, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.original.currency}</span>
        ),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableExport
      emptyMessage="No loans found for this stage."
      pageSize={10}
    />
  );
}
