import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { SlaRow } from '../../api/operationalReportApi';

interface SlaPerformanceTableProps {
  data: SlaRow[];
  isLoading: boolean;
}

function AchievementBar({ pct }: { pct: number }) {
  const color =
    pct >= 95
      ? 'bg-emerald-500'
      : pct >= 90
        ? 'bg-amber-500'
        : 'bg-red-500';
  const textColor =
    pct >= 95
      ? 'text-emerald-700'
      : pct >= 90
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold w-12 text-right tabular-nums', textColor)}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function formatSlaTarget(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours >= 24) return `${Math.round(hours / 24)}d`;
  return `${hours}h`;
}

export function SlaPerformanceTable({ data, isLoading }: SlaPerformanceTableProps) {
  const columns = useMemo<ColumnDef<SlaRow, any>[]>(
    () => [
      {
        accessorKey: 'process',
        header: 'Process',
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'slaTargetHours',
        header: 'SLA Target',
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm">{formatSlaTarget(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'actualHours',
        header: 'Actual',
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums">{formatSlaTarget(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'achievementPct',
        header: 'Achievement %',
        cell: ({ getValue }) => <AchievementBar pct={getValue<number>()} />,
      },
      {
        accessorKey: 'breaches',
        header: 'Breaches',
        cell: ({ getValue }) => {
          const val = getValue<number>();
          return (
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                val === 0
                  ? 'text-emerald-600'
                  : val <= 10
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
    <div className="surface-card p-4 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">SLA Performance</h2>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No SLA data available"
      />
    </div>
  );
}
