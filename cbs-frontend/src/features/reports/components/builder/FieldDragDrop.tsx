import { useState } from 'react';
import { Search, Plus, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataSource, DataField, ReportColumn } from '../../api/reportBuilderApi';

interface FieldDragDropProps {
  sources: DataSource[];
  selectedColumns: ReportColumn[];
  onAdd: (field: DataField, sourceName: string) => void;
  onRemove: (fieldId: string) => void;
  onUpdate: (fieldId: string, updates: Partial<ReportColumn>) => void;
  onMove: (fieldId: string, direction: 'up' | 'down') => void;
}

const TYPE_BADGE: Record<string, string> = {
  TEXT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  NUMBER: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  MONEY: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
  DATE: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
  BOOLEAN: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

export function FieldDragDrop({ sources, selectedColumns, onAdd, onRemove, onUpdate, onMove }: FieldDragDropProps) {
  const [search, setSearch] = useState('');
  const selectedIds = new Set(selectedColumns.map((c) => c.fieldId));

  const filteredSources = sources
    .map((source) => ({
      ...source,
      fields: source.fields.filter(
        (f) =>
          f.displayName.toLowerCase().includes(search.toLowerCase()) ||
          f.name.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((s) => s.fields.length > 0);

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left panel: available fields */}
      <div className="col-span-12 lg:col-span-4">
        <div className="rounded-xl border bg-card p-4 h-full" style={{ minHeight: '420px' }}>
          <h3 className="text-sm font-semibold mb-3">Available Fields</h3>

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

          <div className="overflow-y-auto space-y-4" style={{ maxHeight: '340px' }}>
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
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono', TYPE_BADGE[field.type] ?? TYPE_BADGE.TEXT)}>
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
      </div>

      {/* Right panel: selected fields (ordered) */}
      <div className="col-span-12 lg:col-span-8">
        <div className="rounded-xl border bg-card p-4 h-full" style={{ minHeight: '420px' }}>
          <h3 className="text-sm font-semibold mb-3">
            Selected Fields
            {selectedColumns.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''})
              </span>
            )}
          </h3>

          {selectedColumns.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-muted-foreground border border-dashed rounded-lg">
              Click fields on the left to add columns to your report
            </div>
          ) : (
            <div className="space-y-2">
              {selectedColumns.map((col, idx) => (
                <div key={col.fieldId} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20 group">
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />

                  {/* Up/Down buttons */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => onMove(col.fieldId, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onMove(col.fieldId, 'down')}
                      disabled={idx === selectedColumns.length - 1}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Editable display name */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={col.displayName}
                      onChange={(e) => onUpdate(col.fieldId, { displayName: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>

                  {/* Type badge + aggregation + format dropdowns */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded font-mono', TYPE_BADGE[col.type] ?? TYPE_BADGE.TEXT)}>
                      {col.type}
                    </span>

                    {col.aggregation !== undefined && (
                      <select
                        value={col.aggregation ?? 'NONE'}
                        onChange={(e) => onUpdate(col.fieldId, { aggregation: e.target.value as ReportColumn['aggregation'] })}
                        className="px-2 py-1 text-xs border rounded bg-background focus:outline-none"
                      >
                        <option value="NONE">No Agg.</option>
                        <option value="SUM">SUM</option>
                        <option value="COUNT">COUNT</option>
                        <option value="AVG">AVG</option>
                        <option value="MIN">MIN</option>
                        <option value="MAX">MAX</option>
                      </select>
                    )}

                    <select
                      value={col.format ?? 'TEXT'}
                      onChange={(e) => onUpdate(col.fieldId, { format: e.target.value as ReportColumn['format'] })}
                      className="px-2 py-1 text-xs border rounded bg-background focus:outline-none"
                    >
                      <option value="TEXT">Text</option>
                      <option value="NUMBER">Number</option>
                      <option value="MONEY">Money</option>
                      <option value="PERCENT">Percent</option>
                      <option value="DATE">Date</option>
                    </select>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemove(col.fieldId)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
