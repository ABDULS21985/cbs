import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { DataTable } from '@/components/shared';
import { formatMoneyCompact } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { SegmentAnalytics } from '../../types/customer';

const columns: ColumnDef<SegmentAnalytics, any>[] = [
  {
    accessorKey: 'name',
    header: 'Segment',
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: row.original.colorCode || '#6b7280' }}
        />
        <div>
          <p className="text-sm font-semibold leading-tight">{row.original.name}</p>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest">{row.original.code}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'customerCount',
    header: 'Customers',
    cell: ({ row }) => (
      <span
        className="inline-flex items-center justify-center min-w-[52px] px-2 py-0.5 rounded text-xs font-bold text-white tabular-nums"
        style={{ backgroundColor: row.original.colorCode || '#6b7280' }}
      >
        {row.original.customerCount.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'avgBalance',
    header: 'Avg Balance',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatMoneyCompact(row.original.avgBalance)}
      </span>
    ),
  },
  {
    accessorKey: 'totalBalance',
    header: 'Total Balance',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-semibold">
        {formatMoneyCompact(row.original.totalBalance)}
      </span>
    ),
  },
  {
    id: 'share',
    header: 'Balance Share',
    cell: ({ row, table }) => {
      const allRows = table.getRowModel().rows;
      const total = allRows.reduce((s, r) => s + r.original.totalBalance, 0);
      const pct = total > 0 ? (row.original.totalBalance / total) * 100 : 0;
      const color = row.original.colorCode || '#6b7280';
      return (
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
          <span
            className="text-[10px] font-bold tabular-nums w-8 text-right"
            style={{ color }}
          >
            {pct.toFixed(0)}%
          </span>
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
    <div className="data-table rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Segment Analytics Matrix
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">{data.length} segments</span>
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
