import { memo, useCallback, useId, useState, type FormEvent, type KeyboardEvent, type Ref } from 'react';
import { ChevronDown, Loader2, RotateCcw, Search } from 'lucide-react';
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
  { label: 'Portal', value: 'PORTAL' },
  { label: 'System', value: 'SYSTEM' },
  { label: 'API', value: 'API' },
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
  searchInputRef?: Ref<HTMLInputElement>;
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

export const TransactionSearchForm = memo(function TransactionSearchForm({
  filters,
  onChange,
  onSearch,
  onReset,
  isLoading,
  searchInputRef,
}: TransactionSearchFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { dateError, amountError, hasErrors } = getTransactionSearchValidationErrors(filters);
  const searchId = useId();
  const accountId = useId();
  const customerId = useId();
  const dateFromId = useId();
  const dateToId = useId();
  const amountFromId = useId();
  const amountToId = useId();
  const typeId = useId();
  const channelId = useId();
  const statusId = useId();
  const flaggedId = useId();
  const advancedRegionId = useId();

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasErrors && !isLoading) {
      onSearch();
    }
  }, [hasErrors, isLoading, onSearch]);

  const handleEnterKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!hasErrors && !isLoading) {
        onSearch();
      }
    }
  }, [hasErrors, isLoading, onSearch]);

  const handleFieldChange = useCallback(<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => {
    onChange({ [key]: value } as Partial<TransactionFilters>);
  }, [onChange]);

  return (
    <form className="space-y-4 rounded-xl border bg-card p-5" role="search" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
        <div className="space-y-1.5">
          <label htmlFor={searchId} className="block text-sm font-medium">
            Search query
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              id={searchId}
              type="text"
              value={filters.search}
              onChange={(event) => handleFieldChange('search', event.target.value)}
              onKeyDown={handleEnterKey}
              placeholder="Reference, narration, account name, or beneficiary"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || hasErrors}
          aria-label="Search transactions"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <h3 className="text-sm font-semibold">Advanced filters</h3>
          <p className="text-sm text-muted-foreground">Refine by account, date range, amount, channel, and status.</p>
        </div>
        <button
          type="button"
          aria-expanded={showAdvanced}
          aria-controls={advancedRegionId}
          onClick={() => setShowAdvanced((current) => !current)}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {showAdvanced ? 'Hide filters' : 'Show filters'}
          <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')} />
        </button>
      </div>

      {showAdvanced && (
        <div id={advancedRegionId} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor={accountId} className="mb-1.5 block text-sm font-medium">Account Number</label>
            <input
              id={accountId}
              type="text"
              value={filters.accountNumber}
              onChange={(event) => handleFieldChange('accountNumber', event.target.value)}
              onKeyDown={handleEnterKey}
              placeholder="e.g. 0123456789"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={customerId} className="mb-1.5 block text-sm font-medium">Customer ID / Name</label>
            <input
              id={customerId}
              type="text"
              value={filters.customerId}
              onChange={(event) => handleFieldChange('customerId', event.target.value)}
              onKeyDown={handleEnterKey}
              placeholder="Customer ID or name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={dateFromId} className="mb-1.5 block text-sm font-medium">Date From</label>
            <input
              id={dateFromId}
              type="date"
              value={filters.dateFrom}
              onChange={(event) => handleFieldChange('dateFrom', event.target.value)}
              className={cn(inputClass, dateError && 'border-red-500 focus:ring-red-500')}
              aria-invalid={Boolean(dateError)}
              aria-describedby={dateError ? `${dateFromId}-error` : undefined}
            />
          </div>

          <div>
            <label htmlFor={dateToId} className="mb-1.5 block text-sm font-medium">Date To</label>
            <input
              id={dateToId}
              type="date"
              value={filters.dateTo}
              onChange={(event) => handleFieldChange('dateTo', event.target.value)}
              className={cn(inputClass, dateError && 'border-red-500 focus:ring-red-500')}
              aria-invalid={Boolean(dateError)}
              aria-describedby={dateError ? `${dateFromId}-error` : undefined}
            />
          </div>

          <div>
            <label htmlFor={amountFromId} className="mb-1.5 block text-sm font-medium">Amount From</label>
            <input
              id={amountFromId}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={filters.amountFrom || ''}
              onChange={(event) => handleFieldChange('amountFrom', Number(event.target.value) || 0)}
              className={cn(inputClass, amountError && 'border-red-500 focus:ring-red-500')}
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? `${amountFromId}-error` : undefined}
            />
          </div>

          <div>
            <label htmlFor={amountToId} className="mb-1.5 block text-sm font-medium">Amount To</label>
            <input
              id={amountToId}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={filters.amountTo || ''}
              onChange={(event) => handleFieldChange('amountTo', Number(event.target.value) || 0)}
              className={cn(inputClass, amountError && 'border-red-500 focus:ring-red-500')}
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? `${amountFromId}-error` : undefined}
            />
          </div>

          <div>
            <label htmlFor={typeId} className="mb-1.5 block text-sm font-medium">Transaction Type</label>
            <select
              id={typeId}
              value={filters.type ?? 'ALL'}
              onChange={(event) => handleFieldChange('type', event.target.value as TransactionFilters['type'])}
              className={selectClass}
              aria-label="Transaction type"
              role="combobox"
            >
              {TRANSACTION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value ?? 'ALL'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={channelId} className="mb-1.5 block text-sm font-medium">Channel</label>
            <select
              id={channelId}
              value={filters.channel ?? 'ALL'}
              onChange={(event) => handleFieldChange('channel', event.target.value as TransactionFilters['channel'])}
              className={selectClass}
              aria-label="Channel"
              role="combobox"
            >
              {CHANNELS.map((opt) => (
                <option key={opt.value} value={opt.value ?? 'ALL'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={statusId} className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              id={statusId}
              value={filters.status ?? 'ALL'}
              onChange={(event) => handleFieldChange('status', event.target.value as TransactionFilters['status'])}
              className={selectClass}
              aria-label="Status"
              role="combobox"
            >
              {STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value ?? 'ALL'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label htmlFor={flaggedId} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <input
                id={flaggedId}
                type="checkbox"
                checked={filters.flaggedOnly}
                onChange={(event) => handleFieldChange('flaggedOnly', event.target.checked)}
                className="h-4 w-4 rounded border"
              />
              Show Flagged Only
            </label>
          </div>

          {dateError && (
            <p id={`${dateFromId}-error`} className="text-xs text-red-500 sm:col-span-2 xl:col-span-4">
              {dateError}
            </p>
          )}
          {amountError && (
            <p id={`${amountFromId}-error`} className="text-xs text-red-500 sm:col-span-2 xl:col-span-4">
              {amountError}
            </p>
          )}
        </div>
      )}
    </form>
  );
});
