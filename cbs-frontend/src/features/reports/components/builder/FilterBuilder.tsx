import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataField, ReportFilter, FilterOperator } from '../../api/reportBuilderApi';

interface FilterBuilderProps {
  filters: ReportFilter[];
  availableFields: DataField[];
  andOr: 'AND' | 'OR';
  onFiltersChange: (filters: ReportFilter[]) => void;
  onAndOrChange: (v: 'AND' | 'OR') => void;
}

const OPERATORS_BY_TYPE: Record<string, { value: FilterOperator; label: string }[]> = {
  TEXT: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'is one of' },
    { value: 'is_null', label: 'is empty' },
    { value: 'is_not_null', label: 'is not empty' },
  ],
  NUMBER: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'between', label: 'between' },
    { value: 'is_null', label: 'is empty' },
    { value: 'is_not_null', label: 'is not empty' },
  ],
  MONEY: [
    { value: 'equals', label: 'equals' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'between', label: 'between' },
  ],
  DATE: [
    { value: 'equals', label: 'on' },
    { value: 'greater_than', label: 'after' },
    { value: 'less_than', label: 'before' },
    { value: 'between', label: 'between' },
    { value: 'is_null', label: 'is empty' },
  ],
  BOOLEAN: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
};

function getOperators(fieldType: string) {
  return OPERATORS_BY_TYPE[fieldType] ?? OPERATORS_BY_TYPE.TEXT;
}

interface FilterRowProps {
  filter: ReportFilter;
  availableFields: DataField[];
  onChange: (updates: Partial<ReportFilter>) => void;
  onRemove: () => void;
  index: number;
  andOr: 'AND' | 'OR';
  isFirst: boolean;
}

function FilterRow({ filter, availableFields, onChange, onRemove, index, andOr, isFirst }: FilterRowProps) {
  const field = availableFields.find((f) => f.id === filter.fieldId);
  const fieldType = field?.type ?? 'TEXT';
  const operators = getOperators(fieldType);
  const noValue = filter.operator === 'is_null' || filter.operator === 'is_not_null';

  function handleFieldChange(fieldId: string) {
    const newField = availableFields.find((f) => f.id === fieldId);
    if (!newField) return;
    const newOps = getOperators(newField.type);
    onChange({
      fieldId,
      fieldName: newField.name,
      operator: newOps[0]?.value ?? 'equals',
      value: '',
    });
  }

  function renderValueInput() {
    if (noValue) return null;
    if (filter.operator === 'between') {
      const vals = Array.isArray(filter.value) ? filter.value : [filter.value, ''];
      return (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input
            type={fieldType === 'DATE' ? 'date' : 'text'}
            value={vals[0] ?? ''}
            onChange={(e) => onChange({ value: [e.target.value, vals[1] ?? ''] })}
            placeholder="From"
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-xs text-muted-foreground">and</span>
          <input
            type={fieldType === 'DATE' ? 'date' : 'text'}
            value={vals[1] ?? ''}
            onChange={(e) => onChange({ value: [vals[0] ?? '', e.target.value] })}
            placeholder="To"
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      );
    }
    if (filter.operator === 'in') {
      const vals = Array.isArray(filter.value) ? filter.value : filter.value ? [filter.value] : [];
      return (
        <input
          type="text"
          value={vals.join(', ')}
          onChange={(e) => onChange({ value: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
          placeholder="value1, value2, ..."
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      );
    }
    if (fieldType === 'DATE') {
      return (
        <input
          type="date"
          value={Array.isArray(filter.value) ? '' : filter.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      );
    }
    if (fieldType === 'BOOLEAN') {
      return (
        <select
          value={Array.isArray(filter.value) ? '' : filter.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select...</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
    return (
      <input
        type={fieldType === 'NUMBER' || fieldType === 'MONEY' ? 'number' : 'text'}
        value={Array.isArray(filter.value) ? '' : filter.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="Value..."
        className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-10 flex-shrink-0 text-center">
        {isFirst ? (
          <span className="text-xs text-muted-foreground font-medium">WHERE</span>
        ) : (
          <span className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded',
            andOr === 'AND'
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
          )}>
            {andOr}
          </span>
        )}
      </div>

      <select
        value={filter.fieldId}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="w-40 flex-shrink-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {availableFields.map((f) => (
          <option key={f.id} value={f.id}>{f.displayName}</option>
        ))}
      </select>

      <select
        value={filter.operator}
        onChange={(e) => onChange({ operator: e.target.value as FilterOperator, value: '' })}
        className="w-36 flex-shrink-0 px-2.5 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {!noValue && renderValueInput()}
      {noValue && <div className="flex-1" />}

      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
        title="Remove filter"
      >
        <X className="w-4 h-4" />
      </button>
      <span className="sr-only">{index}</span>
    </div>
  );
}

export function FilterBuilder({ filters, availableFields, andOr, onFiltersChange, onAndOrChange }: FilterBuilderProps) {
  function addFilter() {
    const firstField = availableFields[0];
    if (!firstField) return;
    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}`,
      fieldId: firstField.id,
      fieldName: firstField.name,
      operator: 'equals',
      value: '',
    };
    onFiltersChange([...filters, newFilter]);
  }

  function removeFilter(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id));
  }

  function updateFilter(id: string, updates: Partial<ReportFilter>) {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Filters</h4>
        <div className="flex items-center gap-2">
          {filters.length > 1 && (
            <div className="flex items-center rounded-lg border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => onAndOrChange('AND')}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  andOr === 'AND' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                AND
              </button>
              <button
                onClick={() => onAndOrChange('OR')}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  andOr === 'OR' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted',
                )}
              >
                OR
              </button>
            </div>
          )}
          <button
            onClick={addFilter}
            disabled={availableFields.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Filter
          </button>
        </div>
      </div>

      {filters.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No filters applied. All data will be included.
        </p>
      )}

      <div className="space-y-2">
        {filters.map((filter, idx) => (
          <FilterRow
            key={filter.id}
            filter={filter}
            availableFields={availableFields}
            onChange={(updates) => updateFilter(filter.id, updates)}
            onRemove={() => removeFilter(filter.id)}
            index={idx}
            andOr={andOr}
            isFirst={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}
