import { useEffect, useMemo, useRef } from 'react';
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
  selectedTransactionIds: string[];
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onToggleTransactionSelection: (transactionId: string) => void;
  onToggleSelectAllVisible: () => void;
  highlightedTransactionIds?: string[];
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(event) => {
        event.stopPropagation();
        onChange();
      }}
      onClick={(event) => event.stopPropagation()}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border"
    />
  );
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

export function TransactionResultsTable({
  transactions,
  isLoading,
  onRowClick,
  selectedTransactionIds,
  allVisibleSelected,
  someVisibleSelected,
  onToggleTransactionSelection,
  onToggleSelectAllVisible,
  highlightedTransactionIds = [],
  pageIndex,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
}: TransactionResultsTableProps) {
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<Transaction, any>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <SelectionCheckbox
            checked={allVisibleSelected}
            indeterminate={someVisibleSelected}
            onChange={onToggleSelectAllVisible}
            ariaLabel="Select all visible transactions"
          />
        ),
        cell: ({ row }) => (
          <SelectionCheckbox
            checked={selectedTransactionIds.includes(String(row.original.id))}
            onChange={() => onToggleTransactionSelection(String(row.original.id))}
            ariaLabel={`Select transaction ${row.original.reference}`}
          />
        ),
        enableSorting: false,
        size: 44,
      },
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
                  navigate(`/accounts?q=${encodeURIComponent(acct)}`);
                }}
                className="font-mono text-xs text-primary hover:underline block"
                title="View account details"
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
    [
      allVisibleSelected,
      navigate,
      onRowClick,
      onToggleSelectAllVisible,
      onToggleTransactionSelection,
      selectedTransactionIds,
      someVisibleSelected,
    ],
  );

  return (
    <DataTable
      columns={columns}
      data={transactions}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableColumnVisibility
      emptyMessage="No transactions found"
      getRowClassName={(transaction) =>
        highlightedTransactionIds.includes(String(transaction.id))
          ? 'bg-green-50/70 dark:bg-green-900/15'
          : undefined
      }
      manualPagination={{
        pageIndex,
        pageSize,
        pageCount: Math.max(Math.ceil(totalRows / pageSize), 1),
        rowCount: totalRows,
        onPageChange,
        onPageSizeChange,
      }}
    />
  );
}
