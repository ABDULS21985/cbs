import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeeTier } from '../api/feeApi';

interface TierTableEditorProps {
  tiers: FeeTier[];
  onChange: (tiers: FeeTier[]) => void;
  type: 'TIERED' | 'SLAB';
  readOnly?: boolean;
}

export function TierTableEditor({ tiers, onChange, type, readOnly }: TierTableEditorProps) {
  const addRow = () => {
    const last = tiers[tiers.length - 1];
    const newFrom = last ? last.toAmount + 1 : 0;
    onChange([...tiers, { fromAmount: newFrom, toAmount: newFrom + 9999, rate: 0, flatFee: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof FeeTier, value: number) => {
    const updated = tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier));
    onChange(updated);
  };

  const inputCls = cn(
    'w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring',
    readOnly && 'bg-muted cursor-not-allowed',
  );

  return (
    <div className="space-y-2">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">From Amount (₦)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">To Amount (₦)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {type === 'TIERED' ? 'Rate (%)' : 'Flat Fee (₦)'}
              </th>
              {!readOnly && <th className="px-3 py-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {tiers.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 3 : 4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tiers defined. {!readOnly && 'Click "Add Tier" to begin.'}
                </td>
              </tr>
            )}
            {tiers.map((tier, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span>₦{tier.fromAmount.toLocaleString()}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={tier.fromAmount}
                      onChange={(e) => updateRow(idx, 'fromAmount', Number(e.target.value))}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span>₦{tier.toAmount.toLocaleString()}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={tier.toAmount}
                      onChange={(e) => updateRow(idx, 'toAmount', Number(e.target.value))}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span>
                      {type === 'TIERED' ? `${tier.rate}%` : `₦${tier.flatFee.toLocaleString()}`}
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step={type === 'TIERED' ? 0.01 : 1}
                      className={inputCls}
                      value={type === 'TIERED' ? tier.rate : tier.flatFee}
                      onChange={(e) =>
                        updateRow(idx, type === 'TIERED' ? 'rate' : 'flatFee', Number(e.target.value))
                      }
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
            ))}
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
          Add {type === 'TIERED' ? 'Tier' : 'Slab'}
        </button>
      )}
    </div>
  );
}
