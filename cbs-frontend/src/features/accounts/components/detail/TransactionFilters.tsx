import { Search } from 'lucide-react';
import { DateRangePicker } from '@/components/shared';

interface DateRange { from?: Date; to?: Date; }

interface TransactionFiltersProps {
  dateRange: DateRange;
  setDateRange: (v: DateRange) => void;
  type: 'ALL' | 'CREDIT' | 'DEBIT';
  setType: (v: 'ALL' | 'CREDIT' | 'DEBIT') => void;
  minAmount: string;
  setMinAmount: (v: string) => void;
  maxAmount: string;
  setMaxAmount: (v: string) => void;
  searchText: string;
  setSearchText: (v: string) => void;
}

export function TransactionFilters({
  dateRange, setDateRange,
  type, setType,
  minAmount, setMinAmount,
  maxAmount, setMaxAmount,
  searchText, setSearchText,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-muted/20">
      {/* Date range */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {/* Type select */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value as 'ALL' | 'CREDIT' | 'DEBIT')}
        className="h-8 px-3 py-0 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="ALL">All Types</option>
        <option value="CREDIT">Credits Only</option>
        <option value="DEBIT">Debits Only</option>
      </select>

      {/* Amount range */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          placeholder="Min ₦"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          className="h-8 w-28 px-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-muted-foreground text-xs">—</span>
        <input
          type="number"
          placeholder="Max ₦"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          className="h-8 w-28 px-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search reference, description…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-8 w-full pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}
