import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Covenant } from '../../types/facility';

interface CovenantComplianceTableProps {
  data: Covenant[];
  isLoading?: boolean;
}

const COMPLIANCE_STYLES: Record<string, string> = {
  COMPLIANT: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  BREACHED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  APPROACHING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function CovenantComplianceTable({ data, isLoading }: CovenantComplianceTableProps) {
  const columns = useMemo<ColumnDef<Covenant>[]>(
    () => [
      {
        accessorKey: 'covenant',
        header: 'Covenant',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.covenant}</span>
        ),
      },
      {
        accessorKey: 'threshold',
        header: 'Threshold',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">{row.original.threshold}</span>
        ),
      },
      {
        accessorKey: 'current',
        header: 'Current',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.current}</span>
        ),
      },
      {
        accessorKey: 'compliance',
        header: 'Compliance',
        cell: ({ row }) => {
          const style = COMPLIANCE_STYLES[row.original.compliance] ?? '';
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                style
              )}
            >
              {row.original.compliance.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'nextTestDate',
        header: 'Next Test Date',
        cell: ({ row }) => formatDate(row.original.nextTestDate),
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyMessage="No covenants defined for this facility"
      pageSize={10}
    />
  );
}
