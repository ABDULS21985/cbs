import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataSource, DataField, ReportColumn } from '../../api/reportBuilderApi';

interface FieldSelectorProps {
  sources: DataSource[];
  selectedColumns: ReportColumn[];
  onAdd: (field: DataField, sourceName: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  TEXT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  NUMBER: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  MONEY: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
  DATE: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  BOOLEAN: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

export function FieldSelector({ sources, selectedColumns, onAdd }: FieldSelectorProps) {
  const [search, setSearch] = useState('');

  const selectedIds = new Set(selectedColumns.map((c) => c.fieldId));

  const filteredSources = sources.map((source) => ({
    ...source,
    fields: source.fields.filter(
      (f) =>
        f.displayName.toLowerCase().includes(search.toLowerCase()) ||
        f.name.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((s) => s.fields.length > 0);

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {filteredSources.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No fields found</p>
        )}
        {filteredSources.map((source) => (
          <div key={source.id}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              {source.name}
            </div>
            <div className="space-y-1">
              {source.fields.map((field) => {
                const isAdded = selectedIds.has(field.id);
                return (
                  <button
                    key={field.id}
                    onClick={() => !isAdded && onAdd(field, source.name)}
                    disabled={isAdded}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors group',
                      isAdded
                        ? 'bg-primary/5 text-muted-foreground cursor-default opacity-60'
                        : 'hover:bg-muted cursor-pointer',
                    )}
                  >
                    <span className="font-medium truncate">{field.displayName}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono', TYPE_COLORS[field.type] ?? TYPE_COLORS.TEXT)}>
                        {field.type}
                      </span>
                      {!isAdded && (
                        <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
