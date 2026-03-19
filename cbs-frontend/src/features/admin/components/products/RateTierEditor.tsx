import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RateTier } from '../../api/productApi';

interface RateTierEditorProps {
  tiers: RateTier[];
  onChange: (tiers: RateTier[]) => void;
  readOnly?: boolean;
}

function detectOverlaps(tiers: RateTier[]): Set<number> {
  const overlapping = new Set<number>();
  for (let i = 0; i < tiers.length; i++) {
    for (let j = i + 1; j < tiers.length; j++) {
      const a = tiers[i];
      const b = tiers[j];
      if (a.fromBalance <= b.toBalance && b.fromBalance <= a.toBalance) {
        overlapping.add(i);
        overlapping.add(j);
      }
    }
  }
  return overlapping;
}

const LAST_TIER_SENTINEL = 999_999_999_999;

function displayUpperBound(value: number): string {
  return value >= LAST_TIER_SENTINEL ? 'No limit' : value.toLocaleString();
}

export function RateTierEditor({ tiers, onChange, readOnly }: RateTierEditorProps) {
  const overlaps = detectOverlaps(tiers);

  const addRow = () => {
    const last = tiers[tiers.length - 1];
    const newFrom = last ? last.toBalance + 1 : 0;
    onChange([...tiers, { fromBalance: newFrom, toBalance: LAST_TIER_SENTINEL, rate: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof RateTier, rawValue: string) => {
    const value =
      field === 'toBalance' && rawValue.toLowerCase() === 'no limit'
        ? LAST_TIER_SENTINEL
        : Number(rawValue);
    const updated = tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier));
    onChange(updated);
  };

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full px-2 py-1.5 text-sm rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-colors',
      hasError ? 'border-destructive focus:ring-destructive' : 'border-input',
      readOnly && 'bg-muted cursor-not-allowed',
    );

  const hasOverlaps = overlaps.size > 0;

  return (
    <div className="space-y-3">
      {hasOverlaps && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Some balance ranges overlap. Please fix before continuing.</span>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">From Balance (₦)</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">To Balance (₦)</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Rate (%)</th>
              {!readOnly && <th className="px-3 py-2.5 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tiers.length === 0 && (
              <tr>
                <td
                  colSpan={readOnly ? 3 : 4}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  No tiers defined.{!readOnly && ' Click "Add Tier" to get started.'}
                </td>
              </tr>
            )}
            {tiers.map((tier, idx) => {
              const hasError = overlaps.has(idx);
              return (
                <tr key={idx} className={cn('', hasError && 'bg-destructive/5')}>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span>₦{tier.fromBalance.toLocaleString()}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        className={inputCls(hasError)}
                        value={tier.fromBalance}
                        onChange={(e) => updateRow(idx, 'fromBalance', e.target.value)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className={tier.toBalance >= LAST_TIER_SENTINEL ? 'text-muted-foreground italic' : ''}>
                        {displayUpperBound(tier.toBalance)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        className={inputCls(hasError)}
                        value={tier.toBalance >= LAST_TIER_SENTINEL ? '' : tier.toBalance}
                        placeholder="No limit"
                        onChange={(e) =>
                          updateRow(
                            idx,
                            'toBalance',
                            e.target.value === '' ? String(LAST_TIER_SENTINEL) : e.target.value,
                          )
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span>{tier.rate}%</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        className={inputCls(false)}
                        value={tier.rate}
                        onChange={(e) => updateRow(idx, 'rate', e.target.value)}
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tier
        </button>
      )}

      {tiers.length > 0 && readOnly && (
        <p className="text-xs text-muted-foreground">
          {tiers.length} tier{tiers.length !== 1 ? 's' : ''} defined. Last tier upper bound treated as unlimited.
        </p>
      )}
    </div>
  );
}
