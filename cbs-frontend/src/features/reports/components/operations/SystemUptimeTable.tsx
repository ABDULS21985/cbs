import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { ServiceUptime } from '../../api/operationalReportApi';

interface SystemUptimeTableProps {
  data: ServiceUptime[];
  isLoading: boolean;
}

function UptimeBar({ pct }: { pct: number }) {
  const color =
    pct >= 99.9
      ? 'bg-emerald-500'
      : pct >= 99
        ? 'bg-amber-500'
        : 'bg-red-500';
  const textColor =
    pct >= 99.9
      ? 'text-emerald-700'
      : pct >= 99
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold w-14 text-right tabular-nums', textColor)}>
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

export function SystemUptimeTable({ data, isLoading }: SystemUptimeTableProps) {
  const columns = useMemo<ColumnDef<ServiceUptime, any>[]>(
    () => [
      {
        accessorKey: 'service',
        header: 'Service',
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'uptimePct',
        header: 'Uptime',
        cell: ({ getValue }) => <UptimeBar pct={getValue<number>()} />,
      },
      {
        accessorKey: 'downtimeMinutes',
        header: 'Downtime (min)',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>().toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'incidentCount',
        header: 'Incidents',
        cell: ({ getValue }) => {
          const val = getValue<number>();
          return (
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                val === 0
                  ? 'text-emerald-600'
                  : val <= 3
                    ? 'text-amber-600'
                    : 'text-red-600',
              )}
            >
              {val}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">System Uptime</h2>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No uptime data available"
      />
    </div>
  );
}
