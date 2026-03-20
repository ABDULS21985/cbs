import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/shared';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { SegmentAnalytics } from '../../types/customer';

const columns: ColumnDef<SegmentAnalytics, any>[] = [
  {
    accessorKey: 'name',
    header: 'Segment',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: row.original.colorCode || '#6b7280' }}
        />
        <span className="text-sm font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'customerCount',
    header: 'Customers',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{row.original.customerCount.toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'avgBalance',
    header: 'Avg Balance',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{formatMoneyCompact(row.original.avgBalance)}</span>
    ),
  },
  {
    accessorKey: 'totalBalance',
    header: 'Total Balance',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{formatMoneyCompact(row.original.totalBalance)}</span>
    ),
  },
  {
    id: 'share',
    header: 'Balance Share',
    cell: ({ row, table }) => {
      const allRows = table.getRowModel().rows;
      const total = allRows.reduce((s, r) => s + r.original.totalBalance, 0);
      const pct = total > 0 ? (row.original.totalBalance / total) * 100 : 0;
      return (
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: row.original.colorCode || '#6b7280' }}
            />
          </div>
          <span className="text-xs tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
        </div>
      );
    },
  },
];

interface SegmentComparisonTableProps {
  data: SegmentAnalytics[];
  isLoading: boolean;
}

export function SegmentComparisonTable({ data, isLoading }: SegmentComparisonTableProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-medium">Segment Comparison</p>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/customers/segments/${row.code}`)}
        emptyMessage="No segment analytics available"
      />
    </div>
  );
}
