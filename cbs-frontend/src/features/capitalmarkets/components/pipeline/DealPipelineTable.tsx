import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen } from 'lucide-react';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CapitalMarketsDeal } from '../../api/capitalMarketsApi';

const DEAL_STAGES = ['ORIGINATION', 'STRUCTURING', 'MARKETING', 'PRICING', 'ALLOTMENT', 'SETTLED'] as const;

function DealProgress({ status }: { status: string }) {
  const idx = DEAL_STAGES.indexOf(status as any);
  const pct = status === 'SETTLED' ? 100 : Math.round(((idx + 1) / DEAL_STAGES.length) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

interface DealPipelineTableProps {
  deals: CapitalMarketsDeal[];
  isLoading: boolean;
}

export function DealPipelineTable({ deals, isLoading }: DealPipelineTableProps) {
  const navigate = useNavigate();

  const columns: ColumnDef<CapitalMarketsDeal, any>[] = [
    {
      accessorKey: 'code',
      header: 'Deal Code',
      cell: ({ row }) => <code className="text-xs font-mono font-medium text-primary">{row.original.code}</code>,
    },
    {
      accessorKey: 'issuer',
      header: 'Issuer',
      cell: ({ row }) => <span className="font-medium">{row.original.issuer}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
          row.original.type === 'ECM'
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        )}>
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'currency',
      header: 'CCY',
    },
    {
      accessorKey: 'targetAmount',
      header: 'Target',
      cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.targetAmount, row.original.currency)}</span>,
    },
    {
      accessorKey: 'coverageRatio',
      header: 'Coverage',
      cell: ({ row }) => {
        const c = row.original.coverageRatio;
        if (!c) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={cn('font-semibold text-xs', c >= 2 ? 'text-green-600' : c >= 1 ? 'text-amber-600' : 'text-red-600')}>
            {c.toFixed(1)}x
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => <DealProgress status={row.original.status} />,
    },
    {
      accessorKey: 'feesEarned',
      header: 'Fees',
      cell: ({ row }) => row.original.feesEarned ? formatMoney(row.original.feesEarned, row.original.currency) : '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/capital-markets/${row.original.code}`)}
            className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            View
          </button>
          <button
            onClick={() => navigate(`/capital-markets/${row.original.code}?tab=investors`)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
          >
            <BookOpen className="w-3 h-3" /> Book
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={deals}
      isLoading={isLoading}
      onRowClick={(row) => navigate(`/capital-markets/${row.code}`)}
      enableGlobalFilter
      emptyMessage="No deals match current filters"
    />
  );
}
