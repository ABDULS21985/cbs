import { useState } from 'react';
import { Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataField, ReportFilter, FilterOperator } from '../../api/reportBuilderApi';

interface FilterRuleBuilderProps {
  filters: ReportFilter[];
  availableFields: DataField[];
  andOr: 'AND' | 'OR';
  onFiltersChange: (filters: ReportFilter[]) => void;
  onAndOrChange: (v: 'AND' | 'OR') => void;
}

const OPERATORS: Record<string, { value: FilterOperator; label: string }[]> = {
  TEXT: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '!=' },
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'IN' },
    { value: 'is_null', label: 'is empty' },
    { value: 'is_not_null', label: 'is not empty' },
  ],
  NUMBER: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '!=' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'between', label: 'BETWEEN' },
    { value: 'is_null', label: 'is empty' },
  ],
  MONEY: [
    { value: 'equals', label: '=' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'between', label: 'BETWEEN' },
  ],
  DATE: [
    { value: 'equals', label: 'on' },
    { value: 'greater_than', label: 'after' },
    { value: 'less_than', label: 'before' },
    { value: 'between', label: 'BETWEEN' },
  ],
  BOOLEAN: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
};

function getOps(type: string) {
  return OPERATORS[type] ?? OPERATORS.TEXT;
}

interface FilterRuleWithParam extends ReportFilter {
  isParameter?: boolean;
}

export function FilterRuleBuilder({ filters, availableFields, andOr, onFiltersChange, onAndOrChange }: FilterRuleBuilderProps) {
  const [paramToggles, setParamToggles] = useState<Record<string, boolean>>({});

  function addCondition() {
    const first = availableFields[0];
    if (!first) return;
    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}`,
      fieldId: first.id,
      fieldName: first.name,
      operator: 'equals',
      value: '',
    };
    onFiltersChange([...filters, newFilter]);
  }

  function removeCondition(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id));
    setParamToggles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateCondition(id: string, updates: Partial<ReportFilter>) {
    onFiltersChange(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function toggleParam(id: string) {
    setParamToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-3">
      {/* Header with AND/OR toggle and Add button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Conditions</h4>
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
            onClick={addCondition}
            disabled={availableFields.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Condition
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filters.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No conditions applied. All data will be included.
        </p>
      )}

      {/* Condition rows */}
      <div className="space-y-2">
        {filters.map((filter, idx) => {
          const field = availableFields.find((f) => f.id === filter.fieldId);
          const fieldType = field?.type ?? 'TEXT';
          const ops = getOps(fieldType);
          const noValue = filter.operator === 'is_null' || filter.operator === 'is_not_null';
          const isParam = paramToggles[filter.id] ?? false;

          return (
            <div key={filter.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/10">
              {/* AND/OR / WHERE label */}
              <div className="w-12 flex-shrink-0 text-center">
                {idx === 0 ? (
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

              {/* Field selector */}
              <select
                value={filter.fieldId}
                onChange={(e) => {
                  const nf = availableFields.find((f) => f.id === e.target.value);
                  if (!nf) return;
                  const newOps = getOps(nf.type);
                  updateCondition(filter.id, {
                    fieldId: nf.id,
                    fieldName: nf.name,
                    operator: newOps[0]?.value ?? 'equals',
                    value: '',
                  });
                }}
                className="w-36 flex-shrink-0 px-2 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.displayName}</option>
                ))}
              </select>

              {/* Operator selector */}
              <select
                value={filter.operator}
                onChange={(e) => updateCondition(filter.id, { operator: e.target.value as FilterOperator, value: '' })}
                className="w-28 flex-shrink-0 px-2 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {ops.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value input */}
              {!noValue && (
                <>
                  {filter.operator === 'between' ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type={fieldType === 'DATE' ? 'date' : 'text'}
                        value={Array.isArray(filter.value) ? filter.value[0] ?? '' : filter.value}
                        onChange={(e) => {
                          const vals = Array.isArray(filter.value) ? filter.value : [filter.value, ''];
                          updateCondition(filter.id, { value: [e.target.value, vals[1] ?? ''] });
                        }}
                        placeholder={isParam ? '{{param_from}}' : 'From'}
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                      <span className="text-xs text-muted-foreground">and</span>
                      <input
                        type={fieldType === 'DATE' ? 'date' : 'text'}
                        value={Array.isArray(filter.value) ? filter.value[1] ?? '' : ''}
                        onChange={(e) => {
                          const vals = Array.isArray(filter.value) ? filter.value : [filter.value, ''];
                          updateCondition(filter.id, { value: [vals[0] ?? '', e.target.value] });
                        }}
                        placeholder={isParam ? '{{param_to}}' : 'To'}
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ) : filter.operator === 'in' ? (
                    <input
                      type="text"
                      value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                      onChange={(e) => updateCondition(filter.id, { value: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
                      placeholder="value1, value2, ..."
                      className="flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  ) : (
                    <input
                      type={fieldType === 'DATE' ? 'date' : fieldType === 'NUMBER' || fieldType === 'MONEY' ? 'number' : 'text'}
                      value={Array.isArray(filter.value) ? '' : filter.value}
                      onChange={(e) => updateCondition(filter.id, { value: e.target.value })}
                      placeholder={isParam ? '{{parameter}}' : 'Value...'}
                      className="flex-1 min-w-0 px-2 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  )}
                </>
              )}
              {noValue && <div className="flex-1" />}

              {/* Parameter toggle */}
              <button
                onClick={() => toggleParam(filter.id)}
                title={isParam ? 'Remove runtime parameter' : 'Make runtime parameter'}
                className={cn(
                  'p-1 rounded-lg transition-colors flex-shrink-0',
                  isParam
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {isParam ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>

              {/* Remove */}
              <button
                onClick={() => removeCondition(filter.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
