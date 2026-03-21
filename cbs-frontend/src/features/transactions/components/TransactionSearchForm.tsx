import type { RefObject } from 'react';
import { Search, RotateCcw, Loader2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import { FormSection, MoneyInput, DateRangePicker } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { TransactionFilters } from '../hooks/useTransactionSearch';
import type { TransactionSearchParams } from '../api/transactionApi';

const TRANSACTION_TYPES: { label: string; value: TransactionSearchParams['type'] }[] = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Credit', value: 'CREDIT' },
  { label: 'Debit', value: 'DEBIT' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Payment', value: 'PAYMENT' },
  { label: 'Fee', value: 'FEE' },
  { label: 'Interest', value: 'INTEREST' },
  { label: 'Reversal', value: 'REVERSAL' },
];

const CHANNELS: { label: string; value: TransactionSearchParams['channel'] }[] = [
  { label: 'All Channels', value: 'ALL' },
  { label: 'Branch', value: 'BRANCH' },
  { label: 'Mobile Banking', value: 'MOBILE' },
  { label: 'Web / Internet', value: 'WEB' },
  { label: 'ATM', value: 'ATM' },
  { label: 'POS', value: 'POS' },
  { label: 'USSD', value: 'USSD' },
  { label: 'Agent', value: 'AGENT' },
];

const STATUSES: { label: string; value: TransactionSearchParams['status'] }[] = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Reversed', value: 'REVERSED' },
];

interface TransactionSearchFormProps {
  filters: TransactionFilters;
  onChange: (filters: Partial<TransactionFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
  isLoading: boolean;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

const inputClass = cn(
  'w-full px-3 py-2 rounded-lg border bg-background text-sm',
  'focus:outline-none focus:ring-2 focus:ring-ring',
  'placeholder:text-muted-foreground',
);

const selectClass = cn(
  'w-full px-3 py-2 rounded-lg border bg-background text-sm',
  'focus:outline-none focus:ring-2 focus:ring-ring',
);

export function getTransactionSearchValidationErrors(filters: TransactionFilters) {
  const dateError =
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
      ? 'Start date must be before end date'
      : '';
  const amountError =
    filters.amountFrom > 0 && filters.amountTo > 0 && filters.amountFrom > filters.amountTo
      ? 'Minimum amount must be less than maximum'
      : '';

  return {
    dateError,
    amountError,
    hasErrors: Boolean(dateError || amountError),
  };
}

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TransactionSearchForm({
  filters,
  onChange,
  onSearch,
  onReset,
  isLoading,
  searchInputRef,
}: TransactionSearchFormProps) {
  const { dateError, amountError, hasErrors } = getTransactionSearchValidationErrors(filters);
  const dateRangeValue = {
    from: filters.dateFrom ? parseISO(filters.dateFrom) : undefined,
    to: filters.dateTo ? parseISO(filters.dateTo) : undefined,
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    onChange({
      dateFrom: range.from ? toLocalDateInputValue(range.from) : '',
      dateTo: range.to ? toLocalDateInputValue(range.to) : '',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !hasErrors) onSearch();
  };

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Search by reference, narration, account name..."
            className={cn(inputClass, 'pl-9')}
          />
        </div>
        <button
          onClick={onSearch}
          disabled={isLoading || hasErrors}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
        <button
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Advanced filters */}
      <FormSection title="Advanced Filters" collapsible defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Account Number</label>
            <input
              type="text"
              value={filters.accountNumber}
              onChange={(e) => onChange({ accountNumber: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 0123456789"
              className={inputClass}
            />
          </div>

          {/* Customer Search */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Customer ID / Name</label>
            <input
              type="text"
              value={filters.customerId}
              onChange={(e) => onChange({ customerId: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Customer ID or name"
              className={inputClass}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Date Range</label>
            <DateRangePicker value={dateRangeValue} onChange={handleDateRangeChange} />
            {dateError && <p className="mt-1 text-xs text-red-500">{dateError}</p>}
          </div>

          {/* Amount From */}
          <div>
            <MoneyInput
              label="Amount From"
              value={filters.amountFrom}
              onChange={(v) => onChange({ amountFrom: v })}
              placeholder="Min amount"
              error={amountError}
            />
          </div>

          {/* Amount To */}
          <div>
            <MoneyInput
              label="Amount To"
              value={filters.amountTo}
              onChange={(v) => onChange({ amountTo: v })}
              placeholder="Max amount"
              error={amountError}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Transaction Type</label>
            <select
              value={filters.type ?? 'ALL'}
              onChange={(e) => onChange({ type: e.target.value as TransactionFilters['type'] })}
              className={selectClass}
            >
              {TRANSACTION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value ?? 'ALL'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Channel</label>
            <select
              value={filters.channel ?? 'ALL'}
              onChange={(e) => onChange({ channel: e.target.value as TransactionFilters['channel'] })}
              className={selectClass}
            >
              {CHANNELS.map((opt) => (
                <option key={opt.value} value={opt.value ?? 'ALL'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <select
              value={filters.status ?? 'ALL'}
              onChange={(e) => onChange({ status: e.target.value as TransactionFilters['status'] })}
              className={selectClass}
            >
              {STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value ?? 'ALL'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
