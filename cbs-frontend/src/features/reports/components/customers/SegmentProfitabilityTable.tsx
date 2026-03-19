import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { SegmentProfitability } from '../../api/customerAnalyticsApi';

interface SegmentProfitabilityTableProps {
  data: SegmentProfitability[];
  isLoading: boolean;
}

function MarginCell({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={cn('text-xs font-semibold tabular-nums', isPositive ? 'text-green-600' : 'text-red-600')}>
      {isPositive ? '+' : ''}{formatMoney(value)}
    </span>
  );
}

const columns: ColumnDef<SegmentProfitability, any>[] = [
  {
    accessorKey: 'segment',
    header: 'Segment',
    cell: ({ getValue }) => (
      <span className="text-xs font-semibold">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'customers',
    header: 'Customers',
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums">{getValue<number>().toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'avgBalance',
    header: 'Avg Balance',
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums">{formatMoney(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'avgRevenue',
    header: 'Avg Revenue',
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums">{formatMoney(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'avgCost',
    header: 'Avg Cost',
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums">{formatMoney(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'netMargin',
    header: 'Net Margin',
    cell: ({ getValue }) => <MarginCell value={getValue<number>()} />,
    sortingFn: 'basic',
  },
  {
    accessorKey: 'ltv',
    header: 'LTV',
    cell: ({ getValue }) => (
      <span className="text-xs font-medium tabular-nums">{formatMoney(getValue<number>())}</span>
    ),
    sortingFn: 'basic',
  },
];

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">
        Net Margin: <span className={cn('font-medium', value >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(value)}</span>
      </p>
    </div>
  );
}

export function SegmentProfitabilityTable({ data, isLoading }: SegmentProfitabilityTableProps) {
  const chartData = useMemo(
    () => data.map((d) => ({ name: d.segment, netMargin: d.netMargin })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Segment Profitability</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="overflow-hidden">
          <DataTable
            columns={columns}
            data={data}
            pageSize={10}
            emptyMessage="No segment data"
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Net Margin by Segment</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `₦${(v / 1000).toFixed(0)}K` : `₦${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={96}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="netMargin" radius={[0, 3, 3, 0]} maxBarSize={24}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.netMargin >= 0 ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
