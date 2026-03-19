import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction } from '../api/transactionApi';

interface TransactionResultsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRowClick: (t: Transaction) => void;
}

function ChannelBadge({ channel }: { channel: string }) {
  const colorMap: Record<string, string> = {
    MOBILE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    WEB: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ATM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    POS: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    BRANCH: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    USSD: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    AGENT: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorMap[channel] ?? colorMap['BRANCH'])}>
      {channel}
    </span>
  );
}

export function TransactionResultsTable({ transactions, isLoading, onRowClick }: TransactionResultsTableProps) {
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<Transaction, any>[]>(
    () => [
      {
        id: 'dateTime',
        header: 'Date / Time',
        accessorKey: 'dateTime',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
            {formatDateTime(getValue<string>())}
          </span>
        ),
      },
      {
        id: 'reference',
        header: 'Reference',
        accessorKey: 'reference',
        cell: ({ row, getValue }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.original);
            }}
            className="font-mono text-xs text-primary hover:underline whitespace-nowrap"
          >
            {getValue<string>()}
          </button>
        ),
      },
      {
        id: 'account',
        header: 'Account',
        accessorFn: (row) => row.fromAccount ?? row.toAccount ?? '',
        cell: ({ row }) => {
          const acct = row.original.fromAccount ?? row.original.toAccount;
          const name = row.original.fromAccountName ?? row.original.toAccountName;
          if (!acct) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/accounts?q=${acct}`);
                }}
                className="font-mono text-xs text-primary hover:underline block"
              >
                {acct.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}
              </button>
              {name && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{name}</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        cell: ({ getValue }) => (
          <span className="text-sm max-w-[200px] truncate block" title={getValue<string>()}>
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: 'channel',
        header: 'Channel',
        accessorKey: 'channel',
        cell: ({ getValue }) => <ChannelBadge channel={getValue<string>()} />,
      },
      {
        id: 'debit',
        header: 'Debit',
        accessorKey: 'debitAmount',
        cell: ({ getValue }) => {
          const v = getValue<number | undefined>();
          if (!v) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <span className="font-mono text-sm text-red-600 dark:text-red-400 whitespace-nowrap">
              {formatMoney(v)}
            </span>
          );
        },
      },
      {
        id: 'credit',
        header: 'Credit',
        accessorKey: 'creditAmount',
        cell: ({ getValue }) => {
          const v = getValue<number | undefined>();
          if (!v) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <span className="font-mono text-sm text-green-600 dark:text-green-400 whitespace-nowrap">
              {formatMoney(v)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
    ],
    [onRowClick, navigate],
  );

  return (
    <DataTable
      columns={columns}
      data={transactions}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableColumnVisibility
      enableExport
      exportFilename="transactions"
      emptyMessage="No transactions found"
      pageSize={20}
    />
  );
}
