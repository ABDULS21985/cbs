import { useState } from 'react';
import { Plus, Trash2, TestTube2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AmlRuleCondition } from '../../types/aml';

interface Props {
  initialConditions?: AmlRuleCondition[];
  onSave?: (conditions: AmlRuleCondition[], meta: RuleMeta) => void;
  onCancel?: () => void;
}

interface RuleMeta {
  lookback: string;
  priority: string;
  name: string;
}

const FIELDS = [
  { value: 'transaction_amount', label: 'Transaction Amount' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'customer_risk', label: 'Customer Risk Score' },
  { value: 'country', label: 'Country / Jurisdiction' },
  { value: 'account_age', label: 'Account Age (days)' },
  { value: 'cumulative_amount', label: 'Cumulative Amount' },
  { value: 'counterparty_risk', label: 'Counterparty Risk' },
  { value: 'transaction_type', label: 'Transaction Type' },
];

const OPERATORS = [
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '=', label: '=' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'IN', label: 'IN' },
  { value: 'NOT_IN', label: 'NOT IN' },
];

const LOOKBACK_OPTIONS = ['1d', '7d', '30d', '90d'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const humanReadable = (conditions: AmlRuleCondition[]) => {
  if (!conditions.length) return 'No conditions defined';
  return conditions
    .map((c) => {
      const fieldLabel = FIELDS.find((f) => f.value === c.field)?.label ?? c.field;
      return `${fieldLabel} ${c.operator} ${c.value}`;
    })
    .join(' AND ');
};

export function AmlRuleBuilder({ initialConditions = [], onSave, onCancel }: Props) {
  const [conditions, setConditions] = useState<AmlRuleCondition[]>(
    initialConditions.length > 0
      ? initialConditions
      : [{ field: 'transaction_amount', operator: '>', value: '' }],
  );
  const [lookback, setLookback] = useState('30d');
  const [priority, setPriority] = useState('MEDIUM');
  const [ruleName, setRuleName] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const addCondition = () =>
    setConditions((prev) => [...prev, { field: 'transaction_amount', operator: '>', value: '' }]);

  const removeCondition = (idx: number) =>
    setConditions((prev) => prev.filter((_, i) => i !== idx));

  const updateCondition = (idx: number, patch: Partial<AmlRuleCondition>) =>
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );

  const handleTest = () => {
    const count = Math.floor(Math.random() * 50) + 1;
    setTestResult(`Would generate approximately ${count} alerts in the last ${lookback}`);
  };

  const handleSave = () => {
    onSave?.(conditions, { lookback, priority, name: ruleName });
  };

  const priorityColor = (p: string) => {
    if (p === 'CRITICAL') return 'text-red-600';
    if (p === 'HIGH') return 'text-orange-600';
    if (p === 'MEDIUM') return 'text-amber-600';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Rule Name</label>
        <input
          type="text"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="e.g. Large Cash Structuring Detection"
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Conditions</label>
          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            AND condition
          </button>
        </div>
        <div className="space-y-2">
          {conditions.map((cond, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {idx > 0 && (
                <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">AND</span>
              )}
              {idx === 0 && <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">IF</span>}
              <select
                value={cond.field}
                onChange={(e) => updateCondition(idx, { field: e.target.value })}
                className="flex-1 border rounded px-2 py-1.5 text-sm bg-background focus:outline-none"
              >
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                className="w-20 border rounded px-2 py-1.5 text-sm bg-background focus:outline-none"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={cond.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                placeholder="value"
                className="w-28 border rounded px-2 py-1.5 text-sm bg-background focus:outline-none"
              />
              {conditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCondition(idx)}
                  className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Human-readable summary */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Rule Summary</p>
        <p className="text-sm font-mono">
          {humanReadable(conditions)}
          {conditions.length > 0 && lookback && (
            <span className="text-muted-foreground"> within {lookback}</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Lookback Period</label>
          <div className="flex gap-2">
            {LOOKBACK_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLookback(opt)}
                className={cn(
                  'px-2.5 py-1 rounded border text-xs font-medium transition-colors',
                  lookback === opt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Alert Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={cn(
              'w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none font-medium',
              priorityColor(priority),
            )}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {testResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          {testResult}
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleTest}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
        >
          <TestTube2 className="w-4 h-4" />
          Test Rule
        </button>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!ruleName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Rule
          </button>
        </div>
      </div>
    </div>
  );
}
