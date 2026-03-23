import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatPercent, formatMoneyCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RailUtilization } from '../../api/paymentAnalyticsApi';

interface RailsUtilizationTableProps {
  data: RailUtilization[];
  isLoading: boolean;
}

function successRateColor(rate: number): string {
  if (rate >= 99.5) return 'text-green-600 dark:text-green-400 font-semibold';
  if (rate >= 99) return 'text-blue-600 dark:text-blue-400 font-semibold';
  if (rate >= 98) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-red-600 dark:text-red-400 font-semibold';
}

const columns: ColumnDef<RailUtilization, any>[] = [
  {
    accessorKey: 'rail',
    header: 'Rail',
    cell: ({ getValue }) => (
      <span className="font-medium text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'volume',
    header: 'Volume',
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm">{getValue<number>().toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'value',
    header: 'Value (₦)',
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm font-medium">{formatMoneyCompact(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'avgLatencyMs',
    header: 'Avg Latency',
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm">{getValue<number>().toLocaleString()}ms</span>
    ),
  },
  {
    accessorKey: 'successRate',
    header: 'Success Rate',
    cell: ({ getValue }) => {
      const rate = getValue<number>();
      return (
        <span className={cn('tabular-nums text-sm', successRateColor(rate))}>
          {formatPercent(rate)}
        </span>
      );
    },
  },
  {
    accessorKey: 'costPerTxn',
    header: 'Cost / Txn',
    cell: ({ getValue }) => {
      const cost = getValue<number>();
      return (
        <span className="tabular-nums text-sm">
          {cost === 0 ? '—' : formatMoney(cost)}
        </span>
      );
    },
  },
];

export function RailsUtilizationTable({ data, isLoading }: RailsUtilizationTableProps) {
  const totals = useMemo(() => {
    if (!data.length) return null;
    const totalVolume = data.reduce((s, r) => s + r.volume, 0);
    const totalValue = data.reduce((s, r) => s + r.value, 0);
    const weightedSuccessSum = data.reduce((s, r) => s + r.successRate * r.volume, 0);
    const avgSuccess = totalVolume > 0 ? weightedSuccessSum / totalVolume : 0;
    const avgLatency = data.reduce((s, r) => s + r.avgLatencyMs, 0) / data.length;
    return { totalVolume, totalValue, avgSuccess, avgLatency };
  }, [data]);

  return (
    <div className="surface-card">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Rails Utilization</h2>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No rails data available"
        pageSize={10}
      />
      {!isLoading && totals && (
        <div className="border-t px-4 py-2.5 grid grid-cols-6 text-xs font-semibold text-muted-foreground bg-muted/30">
          <span>Totals</span>
          <span className="tabular-nums">{totals.totalVolume.toLocaleString()}</span>
          <span className="tabular-nums">{formatMoneyCompact(totals.totalValue)}</span>
          <span className="tabular-nums">{totals.avgLatency.toFixed(0)}ms avg</span>
          <span className={cn('tabular-nums', successRateColor(totals.avgSuccess))}>
            {formatPercent(totals.avgSuccess)} avg
          </span>
          <span />
        </div>
      )}
    </div>
  );
}
