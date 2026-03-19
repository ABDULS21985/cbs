import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { LeadFunnelRow } from '../../api/marketingAnalyticsApi';

interface LeadFunnelTableProps {
  data: LeadFunnelRow[];
  isLoading: boolean;
}

function buildColumns(bestConversionRate: number): ColumnDef<LeadFunnelRow>[] {
  return [
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className={cn('font-medium text-sm', row.original.conversionRate === bestConversionRate && 'text-green-600 dark:text-green-400')}>
          {row.original.source}
          {row.original.conversionRate === bestConversionRate && (
            <span className="ml-1.5 text-[10px] font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full px-1.5 py-0.5">BEST</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'leads',
      header: 'Leads',
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
    },
    {
      accessorKey: 'qualified',
      header: 'Qualified',
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
    },
    {
      accessorKey: 'applications',
      header: 'Applications',
      cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toLocaleString()}</span>,
    },
    {
      accessorKey: 'converted',
      header: 'Converted',
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<number>().toLocaleString()}</span>,
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      cell: ({ getValue }) => <span className="text-sm">{formatMoney(getValue<number>())}</span>,
    },
    {
      accessorKey: 'conversionRate',
      header: 'Conv. Rate',
      cell: ({ row }) => (
        <span className={cn(
          'text-sm font-semibold',
          row.original.conversionRate === bestConversionRate
            ? 'text-green-600 dark:text-green-400'
            : '',
        )}>
          {formatPercent(row.original.conversionRate, 1)}
        </span>
      ),
    },
    {
      accessorKey: 'costPerAcquisition',
      header: 'CPA',
      cell: ({ getValue }) => <span className="text-sm">{formatMoney(getValue<number>())}</span>,
    },
  ];
}

export function LeadFunnelTable({ data, isLoading }: LeadFunnelTableProps) {
  const bestConversionRate = data.length ? Math.max(...data.map((d) => d.conversionRate)) : 0;
  const totalLeads = data.reduce((s, d) => s + d.leads, 0);
  const totalConverted = data.reduce((s, d) => s + d.converted, 0);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const avgConvRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

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
            <span className="text-muted-foreground">Total Leads: </span>
            <span className="font-semibold">{totalLeads.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Converted: </span>
            <span className="font-semibold">{totalConverted.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Revenue: </span>
            <span className="font-semibold">{formatMoney(totalRevenue)}</span>
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
