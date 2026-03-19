import { Search, RotateCcw, Loader2 } from 'lucide-react';
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

export function TransactionSearchForm({ filters, onChange, onSearch, onReset, isLoading }: TransactionSearchFormProps) {
  const dateRangeValue = {
    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    onChange({
      dateFrom: range.from ? range.from.toISOString().split('T')[0] : '',
      dateTo: range.to ? range.to.toISOString().split('T')[0] : '',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
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
          disabled={isLoading}
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
          </div>

          {/* Amount From */}
          <div>
            <MoneyInput
              label="Amount From"
              value={filters.amountFrom}
              onChange={(v) => onChange({ amountFrom: v })}
              placeholder="Min amount"
            />
          </div>

          {/* Amount To */}
          <div>
            <MoneyInput
              label="Amount To"
              value={filters.amountTo}
              onChange={(v) => onChange({ amountTo: v })}
              placeholder="Max amount"
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
