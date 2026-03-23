import { useMemo, useState } from 'react';
import { BookmarkPlus, Clock3, Search, Trash2 } from 'lucide-react';
import type { RecentSearch, SavedSearch } from '../hooks/useTransactionSearch';

interface SavedSearchesProps {
  savedSearches: SavedSearch[];
  recentSearches: RecentSearch[];
  onSaveSearch: (name: string) => void;
  onApplySavedSearch: (id: string) => void;
  onDeleteSavedSearch: (id: string) => void;
  onApplyRecentSearch: (id: string) => void;
  canSave: boolean;
}

export function SavedSearches({
  savedSearches,
  recentSearches,
  onSaveSearch,
  onApplySavedSearch,
  onDeleteSavedSearch,
  onApplyRecentSearch,
  canSave,
}: SavedSearchesProps) {
  const [searchName, setSearchName] = useState('');
  const recentOptions = useMemo(
    () => recentSearches.map((search) => ({ value: search.id, label: search.label })),
    [recentSearches],
  );

  return (
    <div className="surface-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Saved Searches</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Save the current filter set and jump back into frequent investigations quickly.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={searchName}
              onChange={(event) => setSearchName(event.target.value)}
              placeholder="e.g. Failed web payments this week"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-72"
            />
            <button
              onClick={() => {
                onSaveSearch(searchName);
                setSearchName('');
              }}
              disabled={!canSave || !searchName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <BookmarkPlus className="h-4 w-4" />
              Save Current Search
            </button>
          </div>
        </div>

        <div className="min-w-[240px] rounded-xl border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">Recent Searches</h4>
          </div>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onApplyRecentSearch(event.target.value);
                event.target.value = '';
              }
            }}
          >
            <option value="">Select a recent search</option>
            {recentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {savedSearches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved searches yet.</p>
        ) : (
          savedSearches.map((search) => (
            <div
              key={search.id}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/20 px-2 py-1"
            >
              <button
                onClick={() => onApplySavedSearch(search.id)}
                className="rounded-full px-2 py-1 text-sm font-medium transition-colors hover:bg-muted"
              >
                {search.name}
              </button>
              <button
                onClick={() => onDeleteSavedSearch(search.id)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                aria-label={`Delete saved search ${search.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
