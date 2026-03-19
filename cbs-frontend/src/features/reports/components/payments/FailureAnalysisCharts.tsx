import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { FailureReason, FailedTransaction } from '../../api/paymentAnalyticsApi';

interface FailureAnalysisChartsProps {
  reasons: FailureReason[];
  topFailed: FailedTransaction[];
  isLoading: boolean;
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold">{d.reason}</p>
      <p className="text-muted-foreground">
        Count: <span className="text-foreground font-medium">{d.count.toLocaleString()}</span>
      </p>
      <p className="text-muted-foreground">
        Share: <span className="text-foreground font-medium">{d.percentage}%</span>
      </p>
    </div>
  );
}

function RetryBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING_RETRY: 'bg-amber-50 text-amber-700',
    RETRIED_SUCCESS: 'bg-green-50 text-green-700',
    MAX_RETRIES: 'bg-red-50 text-red-700',
    NOT_RETRIED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const columns: ColumnDef<FailedTransaction, any>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{formatDate(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ getValue }) => (
      <span className="text-xs font-medium tabular-nums">{formatMoney(getValue<number>())}</span>
    ),
    sortingFn: 'basic',
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ getValue }) => (
      <span className="text-xs">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'retryStatus',
    header: 'Retry Status',
    cell: ({ getValue }) => <RetryBadge status={getValue<string>()} />,
  },
];

export function FailureAnalysisCharts({ reasons, topFailed, isLoading }: FailureAnalysisChartsProps) {
  const sortedFailed = useMemo(
    () => [...topFailed].sort((a, b) => b.amount - a.amount).slice(0, 10),
    [topFailed],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 h-72 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Pie — Failure Reasons */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Failure Reasons</h2>
        <div className="flex flex-col items-center">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={reasons}
                cx="50%"
                cy="50%"
                outerRadius={90}
                paddingAngle={2}
                dataKey="count"
              >
                {reasons.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 w-full max-w-xs mt-2">
            {reasons.map((r) => (
              <div key={r.reason} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-muted-foreground flex-1">{r.reason}</span>
                <span className="font-medium text-foreground tabular-nums">{r.count.toLocaleString()}</span>
                <span className="text-muted-foreground w-10 text-right">{r.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table — Top Failed Transactions */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Top Failed Transactions</h2>
        <DataTable
          columns={columns}
          data={sortedFailed}
          pageSize={10}
          emptyMessage="No failed transactions"
        />
      </div>
    </div>
  );
}
