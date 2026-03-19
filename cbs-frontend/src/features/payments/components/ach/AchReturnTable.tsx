import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, MoneyDisplay, StatusBadge } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { achApi, ACH_RETURN_CODES, type AchReturn } from '../../api/achApi';

export function AchReturnTable() {
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['ach-returns'],
    queryFn: () => achApi.getReturns(),
  });

  const columns: ColumnDef<AchReturn, unknown>[] = [
    {
      accessorKey: 'originalRef',
      header: 'Original Ref',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-medium">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'returnCode',
      header: 'Return Code',
      cell: ({ getValue }) => {
        const code = String(getValue());
        const description = ACH_RETURN_CODES[code];
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400">{code}</span>
            {description && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'returnReason',
      header: 'Reason',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => <MoneyDisplay amount={getValue() as number} currency="USD" />,
    },
    {
      accessorKey: 'returnDate',
      header: 'Return Date',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {formatDateTime(String(getValue()))}
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
    <DataTable
      columns={columns}
      data={returns}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No returns found"
      pageSize={10}
    />
  );
}
