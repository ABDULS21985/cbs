import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { useSingleObligors } from '../../hooks/useCreditRisk';
import type { SingleObligor } from '../../types/creditRisk';

const columns: ColumnDef<SingleObligor, any>[] = [
  {
    accessorKey: 'rank',
    header: 'Rank',
    cell: ({ row }) => (
      <span className="text-xs font-mono text-muted-foreground">#{row.original.rank}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.breached && (
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        )}
        <span className={row.original.breached ? 'text-red-700 dark:text-red-400 font-medium' : ''}>
          {row.original.customerName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ row }) => (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-muted">
        {row.original.rating}
      </span>
    ),
  },
  {
    accessorKey: 'exposure',
    header: 'Exposure',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatMoney(row.original.exposure)}</span>
    ),
  },
  {
    accessorKey: 'pctOfCapital',
    header: '% of Capital',
    cell: ({ row }) => {
      const { pctOfCapital, limit, breached } = row.original;
      const fillPct = Math.min((pctOfCapital / limit) * 100, 100);
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
            <div
              className={`h-1.5 rounded-full ${breached ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className={`text-xs font-mono w-12 ${breached ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
            {formatPercent(pctOfCapital)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'limit',
    header: 'Limit',
    cell: ({ row }) => (
      <span className="text-xs font-mono text-muted-foreground">{formatPercent(row.original.limit)}</span>
    ),
  },
  {
    accessorKey: 'breached',
    header: 'Breached',
    cell: ({ row }) => row.original.breached ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="w-3 h-3" />
        Breached
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        OK
      </span>
    ),
  },
];

export function SingleObligorTable() {
  const { data: obligors = [], isLoading } = useSingleObligors();

  const top20 = useMemo(() => obligors.slice(0, 20), [obligors]);

  return (
    <div className="surface-card">
      <div className="px-4 py-3 border-b">
        <h4 className="text-sm font-semibold">Large Exposures — Top 20 Single Obligors</h4>
        {obligors.some(o => o.breached) && (
          <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {obligors.filter(o => o.breached).length} obligor(s) breaching regulatory limit
          </p>
        )}
      </div>
      <DataTable
        columns={columns}
        data={top20}
        isLoading={isLoading}
        emptyMessage="No large exposures data available"
        pageSize={20}
        enableExport
        exportFilename="large-exposures"
      />
    </div>
  );
}
