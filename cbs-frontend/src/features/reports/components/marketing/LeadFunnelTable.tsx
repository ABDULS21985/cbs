import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatPercent } from '@/lib/formatters';
import type { LeadFunnelRow } from '../../api/marketingAnalyticsApi';

interface LeadFunnelTableProps {
  data: LeadFunnelRow[];
  isLoading: boolean;
}

function buildColumns(bestConversionRate: number): ColumnDef<LeadFunnelRow>[] {
  return [
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {row.original.stage}
          {row.original.conversionRate === bestConversionRate && (
            <span className="ml-1.5 text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full px-1.5 py-0.5">BEST</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'count',
      header: 'Count',
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
    },
    {
      accessorKey: 'conversionRate',
      header: 'Conv. Rate',
      cell: ({ getValue }) => <span className="text-sm font-semibold">{formatPercent(getValue<number>(), 1)}</span>,
    },
  ];
}

export function LeadFunnelTable({ data, isLoading }: LeadFunnelTableProps) {
  const bestConversionRate = data.length ? Math.max(...data.map((d) => d.conversionRate)) : 0;
  const totalStages = data.length;
  const totalLeads = data.reduce((s, d) => s + d.count, 0);
  const avgConvRate = totalStages > 0 ? data.reduce((s, d) => s + d.conversionRate, 0) / totalStages : 0;

  const columns = buildColumns(bestConversionRate);

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No lead funnel data found"
      />
      {!isLoading && data.length > 0 && (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 flex flex-wrap gap-6 text-xs">
          <div>
            <span className="text-muted-foreground">Tracked Records: </span>
            <span className="font-semibold">{totalLeads.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Stages: </span>
            <span className="font-semibold">{totalStages}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Conv. Rate: </span>
            <span className="font-semibold">{formatPercent(avgConvRate, 1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
