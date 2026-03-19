import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { format, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { achApi, type SettlementSummary } from '../../api/achApi';

function NetPositionCell({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={cn('font-mono text-sm font-medium', isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
      {isPositive ? '+' : ''}{formatMoney(value, 'USD')}
    </span>
  );
}

function SettlementCalendar({ settlements }: { settlements: SettlementSummary[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const countByDate = settlements.reduce<Record<string, number>>((acc, s) => {
    const d = s.date;
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        7-Day Settlement Calendar
      </h3>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const count = countByDate[dateStr] || 0;
          const isToday = format(today, 'yyyy-MM-dd') === dateStr;

          return (
            <div
              key={dateStr}
              className={cn(
                'flex flex-col items-center rounded-lg p-2 text-center transition-all',
                isToday
                  ? 'bg-blue-600 text-white'
                  : count > 0
                  ? 'bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  isToday ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400',
                )}
              >
                {format(day, 'EEE')}
              </span>
              <span
                className={cn(
                  'text-lg font-bold mt-0.5',
                  isToday ? 'text-white' : 'text-gray-900 dark:text-white',
                )}
              >
                {format(day, 'd')}
              </span>
              {count > 0 ? (
                <span
                  className={cn(
                    'mt-1 text-xs font-semibold px-1.5 py-0.5 rounded-full',
                    isToday
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
                  )}
                >
                  {count}
                </span>
              ) : (
                <span className="mt-1 h-5" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800" />
          Has settlements
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-600" />
          Today
        </div>
      </div>
    </div>
  );
}

export function AchSettlementSummary() {
  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['ach-settlement'],
    queryFn: () => achApi.getSettlementSummary(),
  });

  const columns: ColumnDef<SettlementSummary, unknown>[] = [
    {
      accessorKey: 'counterparty',
      header: 'Rail / Counterparty',
      cell: ({ getValue }) => (
        <span className="font-medium text-sm">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'debitCount',
      header: 'Debit Count',
      cell: ({ getValue }) => (
        <span className="text-sm">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'creditCount',
      header: 'Credit Count',
      cell: ({ getValue }) => (
        <span className="text-sm">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'netPosition',
      header: 'Net Position',
      cell: ({ getValue }) => <NetPositionCell value={getValue() as number} />,
    },
    {
      accessorKey: 'date',
      header: 'Settlement Date',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {format(parseISO(String(getValue())), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Settlement Summary
        </h3>
        <DataTable
          columns={columns}
          data={settlements}
          isLoading={isLoading}
          emptyMessage="No settlement data available"
          pageSize={10}
        />
      </div>

      <SettlementCalendar settlements={settlements} />
    </div>
  );
}
