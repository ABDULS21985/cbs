import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalFilterBarProps {
  status: string;
  onStatusChange: (status: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const STATUSES = [
  { value: '', label: 'All', emoji: '' },
  { value: 'ACTIVE', label: 'Active', emoji: '🟢' },
  { value: 'COMPLETED', label: 'Completed', emoji: '✅' },
  { value: 'CANCELLED', label: 'Cancelled', emoji: '🚫' },
  { value: 'EXPIRED', label: 'Expired', emoji: '⏰' },
  { value: 'WITHDRAWN', label: 'Withdrawn', emoji: '💸' },
];

const SORTS = [
  { value: 'progress', label: 'Progress' },
  { value: 'amount', label: 'Amount Saved' },
  { value: 'target', label: 'Target' },
  { value: 'date', label: 'Target Date' },
  { value: 'name', label: 'Name' },
];

export function GoalFilterBar({ status, onStatusChange, sort, onSortChange, search, onSearchChange }: GoalFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 surface-card p-3">
      {/* Status tabs */}
      <div className="flex items-center gap-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              status === s.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted/40',
            )}
          >
            {s.emoji && <span className="mr-1">{s.emoji}</span>}
            {s.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Sort:</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="h-7 px-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Search */}
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by goal name..."
          className="h-7 pl-7 pr-3 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
        />
      </div>
    </div>
  );
}
