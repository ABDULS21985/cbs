import { useState } from 'react';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchingRule } from '../../api/virtualAccountApi';

interface MatchingRuleEditorProps {
  rules: MatchingRule[];
  onSave: (rules: MatchingRule[]) => void;
}

const RULE_TYPE_LABELS: Record<MatchingRule['ruleType'], string> = {
  REFERENCE_PREFIX: 'Reference Prefix',
  REGEX: 'Regex Pattern',
  EXACT: 'Exact Match',
};

export function MatchingRuleEditor({ rules: initialRules, onSave }: MatchingRuleEditorProps) {
  const [rules, setRules] = useState<MatchingRule[]>(
    [...initialRules].sort((a, b) => a.priority - b.priority),
  );
  const [isDirty, setIsDirty] = useState(false);

  const updateRule = (id: number, field: keyof MatchingRule, value: string | number) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    setIsDirty(true);
  };

  const addRule = () => {
    const newRule: MatchingRule = {
      id: 0,
      vaId: rules[0]?.vaId || 0,
      ruleType: 'REFERENCE_PREFIX',
      ruleValue: '',
      priority: rules.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((prev) => [...prev, newRule]);
    setIsDirty(true);
  };

  const deleteRule = (id: number) => {
    setRules((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      return updated.map((r, i) => ({ ...r, priority: i + 1 }));
    });
    setIsDirty(true);
  };

  const moveRule = (id: number, direction: 'up' | 'down') => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((r, i) => ({ ...r, priority: i + 1 }));
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(rules);
    setIsDirty(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
            No matching rules defined. Add a rule to start matching transactions.
          </div>
        ) : (
          rules.map((rule, idx) => (
            <div
              key={`${rule.id}-${idx}`}
              className="flex items-center gap-3 p-3 surface-card hover:bg-muted/30 transition-colors"
            >
              {/* Priority handle */}
              <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                <button
                  onClick={() => moveRule(rule.id, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <GripVertical className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono font-semibold w-4 text-center">
                  {rule.priority}
                </span>
              </div>

              {/* Type selector */}
              <select
                value={rule.ruleType}
                onChange={(e) => updateRule(rule.id, 'ruleType', e.target.value as MatchingRule['ruleType'])}
                className={cn(
                  'text-sm rounded-md border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50',
                  'w-44 flex-shrink-0',
                )}
              >
                {(Object.keys(RULE_TYPE_LABELS) as MatchingRule['ruleType'][]).map((t) => (
                  <option key={t} value={t}>
                    {RULE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>

              {/* Value input */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={rule.ruleValue}
                  onChange={(e) => updateRule(rule.id, 'ruleValue', e.target.value)}
                  placeholder={
                    rule.ruleType === 'REFERENCE_PREFIX'
                      ? 'e.g. INV-CUST-'
                      : rule.ruleType === 'REGEX'
                      ? 'e.g. ^INV-\\d{4}$'
                      : 'Exact reference value'
                  }
                  className="w-full text-sm font-mono rounded-md border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Type indicator */}
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                  rule.ruleType === 'REFERENCE_PREFIX' && 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  rule.ruleType === 'REGEX' && 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  rule.ruleType === 'EXACT' && 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                )}
              >
                {rule.ruleType === 'REFERENCE_PREFIX' ? 'PREFIX' : rule.ruleType === 'REGEX' ? 'REGEX' : 'EXACT'}
              </span>

              {/* Delete */}
              <button
                onClick={() => deleteRule(rule.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button
          onClick={addRule}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>

        <button
          onClick={handleSave}
          disabled={!isDirty}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isDirty
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          <Save className="w-4 h-4" />
          Save Rules
        </button>
      </div>
    </div>
  );
}
