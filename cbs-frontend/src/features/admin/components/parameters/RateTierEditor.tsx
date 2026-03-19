import { useState } from 'react';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RateTier } from '../../api/parameterApi';

interface RateTierEditorProps {
  tiers: RateTier[];
  onChange: (tiers: RateTier[]) => void;
  onSave: () => void;
  isSaving?: boolean;
}

function generateId() {
  return `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Validate tier contiguity: max of tier N must equal min of tier N+1, no gaps, no overlaps */
function validateTiers(tiers: RateTier[]): string[] {
  const errors: string[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (t.minValue < 0) errors.push(`Tier ${i + 1}: min amount must be non-negative`);
    if (t.rate < 0 || t.rate > 100) errors.push(`Tier ${i + 1}: rate must be between 0% and 100%`);
    if (t.maxValue !== undefined && t.maxValue <= t.minValue) {
      errors.push(`Tier ${i + 1}: max must be greater than min`);
    }
    if (i > 0) {
      const prev = tiers[i - 1];
      if (prev.maxValue !== undefined && t.minValue !== prev.maxValue) {
        errors.push(`Gap between tier ${i} and ${i + 1}: max (${prev.maxValue}) should equal next min (${t.minValue})`);
      }
    }
  }
  return errors;
}

export function RateTierEditor({ tiers, onChange, onSave, isSaving }: RateTierEditorProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const newMin = last?.maxValue ?? (last ? last.minValue + 1000000 : 0);
    onChange([...tiers, { id: generateId(), minValue: newMin, rate: 0 }]);
  };

  const removeTier = (id: string) => onChange(tiers.filter((t) => t.id !== id));

  const update = (id: string, field: keyof RateTier, value: string) => {
    onChange(
      tiers.map((t) =>
        t.id === id
          ? { ...t, [field]: field === 'maxValue' && value === '' ? undefined : Number(value) }
          : t,
      ),
    );
  };

  const handleSave = () => {
    const validationErrors = validateTiers(tiers);
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      onSave();
    }
  };

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Tier Validation Errors</p>
          </div>
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600 dark:text-red-400 ml-6">{err}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 pb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min Amount</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Amount</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate (%)</span>
        <span />
      </div>
      {tiers.map((tier, idx) => {
        const hasGap = idx > 0 && tiers[idx - 1].maxValue !== undefined && tier.minValue !== tiers[idx - 1].maxValue;
        return (
          <div
            key={tier.id}
            className={cn(
              'grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center',
              hasGap && 'ring-1 ring-red-300 rounded-lg p-1',
            )}
          >
            <input
              type="number"
              value={tier.minValue}
              onChange={(e) => update(tier.id, 'minValue', e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0"
              min="0"
            />
            <input
              type="number"
              value={tier.maxValue ?? ''}
              onChange={(e) => update(tier.id, 'maxValue', e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="No limit"
            />
            <input
              type="number"
              step="0.01"
              value={tier.rate}
              onChange={(e) => update(tier.id, 'rate', e.target.value)}
              min="0"
              max="100"
              className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={() => removeTier(tier.id)}
              disabled={tiers.length === 1}
              className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addTier}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Tier
      </button>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Rate Table
        </button>
      </div>
    </div>
  );
}
