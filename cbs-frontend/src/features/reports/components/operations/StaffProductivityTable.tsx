import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Trophy } from 'lucide-react';
import { DataTable, MoneyDisplay } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { StaffProductivity } from '../../api/operationalReportApi';

interface StaffProductivityTableProps {
  data: StaffProductivity[];
  isLoading: boolean;
}

const TOP_STAFF_LEADERBOARD = [
  { rank: 1, name: 'Chukwuemeka Obi', branch: 'Victoria Island', txnCount: 312 },
  { rank: 2, name: 'Amaka Nwosu', branch: 'Ikeja, Lagos', txnCount: 298 },
  { rank: 3, name: 'Bashir Musa', branch: 'Kano Central', txnCount: 285 },
  { rank: 4, name: 'Ngozi Adeyemi', branch: 'Wuse II, Abuja', txnCount: 274 },
  { rank: 5, name: 'Tunde Afolabi', branch: 'Port Harcourt', txnCount: 261 },
];

const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600', 'text-muted-foreground', 'text-muted-foreground'];

export function StaffProductivityTable({ data, isLoading }: StaffProductivityTableProps) {
  const maxTxnPerStaff = useMemo(
    () => (data.length ? Math.max(...data.map((d) => d.txnPerStaff)) : 0),
    [data],
  );

  const columns = useMemo<ColumnDef<StaffProductivity, any>[]>(
    () => [
      {
        accessorKey: 'branch',
        header: 'Branch',
        cell: ({ row, getValue }) => {
          const isTop = row.original.txnPerStaff === maxTxnPerStaff && maxTxnPerStaff > 0;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{getValue<string>()}</span>
              {isTop && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700">
                  <Trophy className="w-2.5 h-2.5" />
                  Top Performer
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'staffCount',
        header: 'Staff Count',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'txnPerStaff',
        header: 'Txn / Staff',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm font-medium">{getValue<number>().toFixed(1)}</span>
        ),
      },
      {
        accessorKey: 'revenuePerStaff',
        header: 'Revenue / Staff',
        cell: ({ getValue }) => (
          <MoneyDisplay amount={getValue<number>()} compact />
        ),
      },
      {
        accessorKey: 'customersServed',
        header: 'Customers Served',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-sm">{getValue<number>().toLocaleString()}</span>
        ),
      },
    ],
    [maxTxnPerStaff],
  );

  return (
    <div className="surface-card p-4 space-y-6">
      <h2 className="text-sm font-semibold text-foreground">Staff Productivity</h2>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No staff productivity data available"
      />

      {/* Top 5 Leaderboard */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Top 5 Staff Leaderboard
        </h3>
        <div className="divide-y divide-border rounded-lg border overflow-hidden">
          {TOP_STAFF_LEADERBOARD.map((staff) => (
            <div
              key={staff.rank}
              className="flex items-center gap-3 px-4 py-2.5 bg-card hover:bg-muted/30 transition-colors"
            >
              <span className={cn('text-base font-bold w-6 text-center tabular-nums flex-shrink-0', RANK_COLORS[staff.rank - 1])}>
                {staff.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{staff.name}</p>
                <p className="text-xs text-muted-foreground truncate">{staff.branch}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold tabular-nums text-foreground">{staff.txnCount.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">transactions</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
