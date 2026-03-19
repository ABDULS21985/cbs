import { Search, RotateCcw } from 'lucide-react';
import { DateRangePicker } from '@/components/shared';
import type { JournalFilters } from '../../api/glApi';
import { format } from 'date-fns';

interface JournalEntrySearchProps {
  filters: JournalFilters;
  onChange: (f: Partial<JournalFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function JournalEntrySearch({ filters, onChange, onSearch, onReset }: JournalEntrySearchProps) {
  const dateRange = {
    from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    to: filters.dateTo ? new Date(filters.dateTo) : undefined,
  };

  const handleDateChange = (range: { from?: Date; to?: Date }) => {
    onChange({
      dateFrom: range.from ? format(range.from, 'yyyy-MM-dd') : '',
      dateTo: range.to ? format(range.to, 'yyyy-MM-dd') : '',
    });
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">GL Account Code</label>
          <input
            type="text"
            value={filters.glCode}
            onChange={(e) => onChange({ glCode: e.target.value })}
            placeholder="e.g. 1101"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date Range</label>
          <DateRangePicker value={dateRange} onChange={handleDateChange} />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Journal Number</label>
          <input
            type="text"
            value={filters.journalNumber}
            onChange={(e) => onChange({ journalNumber: e.target.value })}
            placeholder="e.g. JNL-2026-00001"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Source</label>
          <select
            value={filters.source}
            onChange={(e) => onChange({ source: e.target.value as JournalFilters['source'] })}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Sources</option>
            <option value="SYSTEM">System</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as JournalFilters['status'] })}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="POSTED">Posted</option>
            <option value="REVERSED">Reversed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Min Amount</label>
          <input
            type="number"
            value={filters.minAmount}
            onChange={(e) => onChange({ minAmount: e.target.value })}
            placeholder="0.00"
            min={0}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Amount</label>
          <input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => onChange({ maxAmount: e.target.value })}
            placeholder="No limit"
            min={0}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end border-t pt-3">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={onSearch}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>
    </div>
  );
}
