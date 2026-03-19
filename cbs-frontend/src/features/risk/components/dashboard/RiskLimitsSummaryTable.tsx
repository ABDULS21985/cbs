import { TrendingUp, TrendingDown, Minus, Flag } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { RiskLimit } from '../../types/dashboard';

interface Props {
  data: RiskLimit[];
  isLoading?: boolean;
}

const TrendIcon = ({ trend }: { trend: 'UP' | 'DOWN' | 'FLAT' }) => {
  if (trend === 'UP') return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend === 'DOWN') return <TrendingDown className="w-4 h-4 text-green-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const columns: ColumnDef<RiskLimit>[] = [
  {
    accessorKey: 'riskType',
    header: 'Risk Type',
    cell: ({ getValue }) => (
      <span className="font-medium text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'metric',
    header: 'Metric',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'current',
    header: 'Current',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<number>().toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'limit',
    header: 'Limit',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<number>().toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'utilizationPct',
    header: 'Utilization',
    cell: ({ getValue }) => {
      const pct = getValue<number>();
      const barColor =
        pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', barColor)}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className={cn(
            'text-xs font-medium w-10 text-right',
            pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-green-600',
          )}>
            {pct.toFixed(1)}%
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'breached',
    header: 'Breached',
    cell: ({ row }) => {
      const { breached, utilizationPct } = row.original;
      if (breached) {
        return (
          <div className="flex items-center gap-1 text-red-600">
            <Flag className="w-3.5 h-3.5 fill-current" />
            <span className="text-xs font-medium">BREACHED</span>
          </div>
        );
      }
      if (utilizationPct > 80) {
        return <span className="text-amber-600 text-sm">⚠</span>;
      }
      return <span className="text-muted-foreground text-sm">—</span>;
    },
  },
  {
    accessorKey: 'trend',
    header: 'Trend',
    cell: ({ getValue }) => <TrendIcon trend={getValue<'UP' | 'DOWN' | 'FLAT'>()} />,
  },
];

export function RiskLimitsSummaryTable({ data, isLoading }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Risk Limits Summary</h3>
      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        emptyMessage="No risk limits configured"
        pageSize={10}
        enableExport
        exportFilename="risk-limits"
      />
    </div>
  );
}
