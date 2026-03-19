import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import type { SanctionsMatch } from '../../types/sanctions';

interface Props {
  data: SanctionsMatch[];
  isLoading: boolean;
}

export function FalsePositiveLog({ data, isLoading }: Props) {
  const columns = useMemo<ColumnDef<SanctionsMatch>[]>(
    () => [
      {
        accessorKey: 'matchNumber',
        header: 'Match #',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.matchNumber}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.customerName}</span>
        ),
      },
      {
        accessorKey: 'entityMatched',
        header: 'Entity',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.entityMatched}</span>
        ),
      },
      {
        id: 'justifiedBy',
        header: 'Justified By',
        cell: () => (
          <span className="text-sm text-muted-foreground">Compliance Officer</span>
        ),
      },
      {
        accessorKey: 'screenedAt',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.screenedAt)}</span>
        ),
      },
      {
        id: 'justification',
        header: 'Justification',
        cell: () => (
          <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
            Customer identity verified through additional KYC documents. Name similarity is coincidental.
          </span>
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
      enableGlobalFilter
      enableExport
      exportFilename="false-positive-log"
      emptyMessage="No false positive records found"
      pageSize={15}
    />
  );
}
