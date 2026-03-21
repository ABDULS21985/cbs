import { memo, useCallback, useEffect, useMemo, useRef, useState, type AriaAttributes, type KeyboardEvent as ReactKeyboardEvent, type UIEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Transaction } from '../api/transactionApi';
import type { TransactionSortDirection, TransactionSortField } from '../hooks/useTransactionSearch';
import { TransactionTableSkeleton } from './TransactionTableSkeleton';

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
  sortBy: TransactionSortField;
  sortDirection: TransactionSortDirection;
  onSortChange: (sortBy: TransactionSortField, sortDirection: TransactionSortDirection) => void;
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

function safeAmount(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getTransactionAmount(transaction: Transaction): number | null {
  return safeAmount(transaction.debitAmount) ?? safeAmount(transaction.creditAmount);
}

function getNextSortDirection(
  currentSortBy: TransactionSortField,
  currentSortDirection: TransactionSortDirection,
  targetSortBy: TransactionSortField,
): TransactionSortDirection {
  if (currentSortBy !== targetSortBy) {
    return targetSortBy === 'postingDate' ? 'desc' : 'asc';
  }
  return currentSortDirection === 'asc' ? 'desc' : 'asc';
}

interface TransactionTableRowProps {
  transaction: Transaction;
  isSelected: boolean;
  isHighlighted: boolean;
  onRowClick: (transaction: Transaction) => void;
  onToggleSelection: (transactionId: string) => void;
  onOpenAccountWorkspace: (accountNumber: string) => void;
}

const TransactionTableRow = memo(function TransactionTableRow({
  transaction,
  isSelected,
  isHighlighted,
  onRowClick,
  onToggleSelection,
  onOpenAccountWorkspace,
}: TransactionTableRowProps) {
  const accountNumber = transaction.fromAccount ?? transaction.toAccount ?? '';
  const accountName = transaction.fromAccountName ?? transaction.toAccountName ?? '';
  const transactionAmount = getTransactionAmount(transaction);
  const normalizedStatus = transaction.status.replace(/_/g, ' ');

  const handleKeyboardAction = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onRowClick(transaction);
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      onToggleSelection(String(transaction.id));
    }
  };

  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/20',
        transaction.amlFlagged && 'bg-red-50/70 dark:bg-red-950/20',
        isHighlighted && 'bg-green-50/70 dark:bg-green-900/15',
        isSelected && 'bg-primary/5',
      )}
    >
      <td className="px-4 py-3 align-top">
        <SelectionCheckbox
          checked={isSelected}
          onChange={() => onToggleSelection(String(transaction.id))}
          ariaLabel={`Select transaction ${transaction.reference}`}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <div tabIndex={0} onKeyDown={handleKeyboardAction} className="rounded focus:outline-none focus:ring-2 focus:ring-ring">
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            {formatDateTime(transaction.dateTime)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={() => onRowClick(transaction)}
          aria-label={`Open transaction ${transaction.reference}`}
          className="font-mono text-xs text-primary hover:underline whitespace-nowrap"
        >
          {transaction.reference}
        </button>
      </td>
      <td className="px-4 py-3 align-top">
        {accountNumber ? (
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpenAccountWorkspace(accountNumber)}
              className="block font-mono text-xs text-primary hover:underline"
              aria-label={`Open accounts workspace for ${accountNumber}`}
            >
              {accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3')}
            </button>
            {accountName && (
              <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{accountName}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div
          tabIndex={0}
          onKeyDown={handleKeyboardAction}
          className="max-w-[260px] rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          title={transaction.description}
        >
          <span className="line-clamp-2 break-words">{transaction.description}</span>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div tabIndex={0} onKeyDown={handleKeyboardAction} className="rounded focus:outline-none focus:ring-2 focus:ring-ring">
          <ChannelBadge channel={transaction.channel} />
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div tabIndex={0} onKeyDown={handleKeyboardAction} className="rounded focus:outline-none focus:ring-2 focus:ring-ring">
          {safeAmount(transaction.debitAmount) ? (
            <span className="whitespace-nowrap font-mono text-sm text-red-600 dark:text-red-400">
              {formatMoney(safeAmount(transaction.debitAmount) ?? 0)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div tabIndex={0} onKeyDown={handleKeyboardAction} className="rounded focus:outline-none focus:ring-2 focus:ring-ring">
          {safeAmount(transaction.creditAmount) ? (
            <span className="whitespace-nowrap font-mono text-sm text-green-600 dark:text-green-400">
              {formatMoney(safeAmount(transaction.creditAmount) ?? 0)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div tabIndex={0} onKeyDown={handleKeyboardAction} className="rounded focus:outline-none focus:ring-2 focus:ring-ring">
          <StatusBadge status={transaction.status} />
          <span className="sr-only">Status {normalizedStatus}</span>
          {transactionAmount === null && <span className="sr-only">Amount unavailable</span>}
        </div>
      </td>
    </tr>
  );
});

export const TransactionResultsTable = memo(function TransactionResultsTable({
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
  sortBy,
  sortDirection,
  onSortChange,
}: TransactionResultsTableProps) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const pageCount = Math.max(Math.ceil(totalRows / pageSize), 1);
  const rangeStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = totalRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalRows);

  const onOpenAccountWorkspace = useCallback((accountNumber: string) => {
    navigate('/accounts', {
      state: { transactionAccountLookup: accountNumber },
    });
  }, [navigate]);

  const virtualState = useMemo(() => {
    const shouldVirtualize = transactions.length > 100;
    const rowHeight = 64;
    const containerHeight = rowHeight * 12;
    const bufferRows = 20;

    if (!shouldVirtualize) {
      return {
        shouldVirtualize,
        rowHeight,
        containerHeight,
        startIndex: 0,
        endIndex: transactions.length,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        visibleRows: transactions,
      };
    }

    const viewportStart = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
    const viewportEnd = Math.min(
      transactions.length,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + bufferRows,
    );

    return {
      shouldVirtualize,
      rowHeight,
      containerHeight,
      startIndex: viewportStart,
      endIndex: viewportEnd,
      topSpacerHeight: viewportStart * rowHeight,
      bottomSpacerHeight: Math.max(0, (transactions.length - viewportEnd) * rowHeight),
      visibleRows: transactions.slice(viewportStart, viewportEnd),
    };
  }, [scrollTop, transactions]);

  useEffect(() => {
    setScrollTop(0);
    setShowScrollTop(false);
    const container = scrollContainerRef.current;
    if (!container) return;

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: 0 });
    } else {
      container.scrollTop = 0;
    }
  }, [pageIndex, pageSize, transactions]);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const nextScrollTop = event.currentTarget.scrollTop;
    setScrollTop(nextScrollTop);
    setShowScrollTop(nextScrollTop > virtualState.rowHeight * 5);
  }, [virtualState.rowHeight]);

  const handleSort = useCallback((targetSortBy: TransactionSortField) => {
    onSortChange(targetSortBy, getNextSortDirection(sortBy, sortDirection, targetSortBy));
  }, [onSortChange, sortBy, sortDirection]);

  const renderSortIndicator = useCallback((targetSortBy: TransactionSortField) => {
    if (sortBy !== targetSortBy) return null;
    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }, [sortBy, sortDirection]);

  const ariaSort = useCallback((targetSortBy: TransactionSortField): AriaAttributes['aria-sort'] => {
    if (sortBy !== targetSortBy) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }, [sortBy, sortDirection]);

  const tableRows = useMemo(
    () => virtualState.visibleRows.map((transaction) => (
      <TransactionTableRow
        key={transaction.id}
        transaction={transaction}
        isSelected={selectedTransactionIds.includes(String(transaction.id))}
        isHighlighted={highlightedTransactionIds.includes(String(transaction.id))}
        onRowClick={onRowClick}
        onToggleSelection={onToggleTransactionSelection}
        onOpenAccountWorkspace={onOpenAccountWorkspace}
      />
    )),
    [
      highlightedTransactionIds,
      onOpenAccountWorkspace,
      onRowClick,
      onToggleTransactionSelection,
      selectedTransactionIds,
      virtualState.visibleRows,
    ],
  );

  if (isLoading) {
    return <TransactionTableSkeleton rows={10} />;
  }

  return (
    <div className="relative rounded-xl border bg-card overflow-hidden">
      <div
        ref={scrollContainerRef}
        className={cn('overflow-auto', virtualState.shouldVirtualize ? 'max-h-[768px]' : '')}
        onScroll={virtualState.shouldVirtualize ? handleScroll : undefined}
      >
        <table className="w-full table-fixed">
          <caption className="sr-only">Transaction search results</caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b bg-muted/30">
              <th scope="col" className="w-12 px-4 py-3 text-left">
                <SelectionCheckbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={onToggleSelectAllVisible}
                  ariaLabel="Select all visible transactions"
                />
              </th>
              <th scope="col" aria-sort={ariaSort('postingDate')} className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                  onClick={() => handleSort('postingDate')}
                >
                  Date / Time
                  {renderSortIndicator('postingDate')}
                </button>
              </th>
              <th scope="col" className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Reference</th>
              <th scope="col" className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Account</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Description</th>
              <th scope="col" className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Channel</th>
              <th scope="col" aria-sort={ariaSort('amount')} className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                  onClick={() => handleSort('amount')}
                >
                  Debit
                  {renderSortIndicator('amount')}
                </button>
              </th>
              <th scope="col" className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Credit</th>
              <th scope="col" className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              <>
                {virtualState.topSpacerHeight > 0 && (
                  <tr style={{ height: virtualState.topSpacerHeight }}>
                    <td colSpan={9} />
                  </tr>
                )}
                {tableRows}
                {virtualState.bottomSpacerHeight > 0 && (
                  <tr style={{ height: virtualState.bottomSpacerHeight }}>
                    <td colSpan={9} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && transactions.length > 0 && (
        <div className="no-print flex flex-col gap-3 border-t px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded border bg-background px-2 text-sm"
              aria-label="Rows per page"
            >
              {[20, 50, 100, 250].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>
              {rangeStart}–{rangeEnd} of {totalRows}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="First page"
              onClick={() => onPageChange(0)}
              disabled={pageIndex === 0}
              className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => onPageChange(Math.max(pageIndex - 1, 0))}
              disabled={pageIndex === 0}
              className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 font-medium">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              onClick={() => onPageChange(Math.min(pageIndex + 1, pageCount - 1))}
              disabled={pageIndex >= pageCount - 1}
              className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Last page"
              onClick={() => onPageChange(pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
              className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          aria-label="Scroll to top"
          onClick={() => {
            const container = scrollContainerRef.current;
            if (!container) return;

            if (typeof container.scrollTo === 'function') {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              container.scrollTop = 0;
            }
          }}
          className="absolute bottom-20 right-4 rounded-full border bg-card px-3 py-2 text-xs font-medium shadow-lg transition-colors hover:bg-muted"
        >
          Scroll to top
        </button>
      )}
    </div>
  );
});
