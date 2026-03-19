import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RateTable, RateTier } from '../../api/parameterApi';

interface RateTierEditorProps {
  rateTable: RateTable;
  onChange: (updated: RateTable) => void;
  onSave: () => void;
  isSaving?: boolean;
}

function generateId() {
  return `tier-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function SavingsTierEditor({
  tiers,
  onTiersChange,
}: {
  tiers: RateTier[];
  onTiersChange: (t: RateTier[]) => void;
}) {
  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const newMin = last ? (last.maxValue ?? 0) + 1 : 0;
    onTiersChange([...tiers, { id: generateId(), minValue: newMin, rate: 0 }]);
  };

  const removeTier = (id: string) => onTiersChange(tiers.filter((t) => t.id !== id));

  const update = (id: string, field: keyof RateTier, value: string) => {
    onTiersChange(
      tiers.map((t) =>
        t.id === id
          ? { ...t, [field]: field === 'maxValue' && value === '' ? undefined : Number(value) }
          : t,
      ),
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 pb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Min Balance (₦)</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Balance (₦)</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate (%)</span>
        <span />
      </div>
      {tiers.map((tier, i) => (
        <div key={tier.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
          <input
            type="number"
            value={tier.minValue}
            onChange={(e) => update(tier.id, 'minValue', e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="0"
          />
          <input
            type="number"
            value={tier.maxValue ?? ''}
            onChange={(e) => update(tier.id, 'maxValue', e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="∞ (no limit)"
          />
          <input
            type="number"
            step="0.01"
            value={tier.rate}
            onChange={(e) => update(tier.id, 'rate', e.target.value)}
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
      ))}
      <button
        type="button"
        onClick={addTier}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Tier
      </button>
    </div>
  );
}

function FDTierEditor({
  tiers,
  onTiersChange,
}: {
  tiers: RateTier[];
  onTiersChange: (t: RateTier[]) => void;
}) {
  const addRow = () => {
    onTiersChange([...tiers, { id: generateId(), minValue: 0, row: 'New Tenor', rate: 0 }]);
  };

  const removeRow = (id: string) => onTiersChange(tiers.filter((t) => t.id !== id));

  const update = (id: string, field: string, value: string) => {
    onTiersChange(
      tiers.map((t) => (t.id === id ? { ...t, [field]: field === 'rate' ? Number(value) : value } : t)),
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2fr_1fr_auto] gap-2 px-1 pb-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tenor Label</span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate (%)</span>
        <span />
      </div>
      {tiers.map((tier) => (
        <div key={tier.id} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
          <input
            type="text"
            value={tier.row ?? ''}
            onChange={(e) => update(tier.id, 'row', e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="e.g. 90 Days"
          />
          <input
            type="number"
            step="0.01"
            value={tier.rate}
            onChange={(e) => update(tier.id, 'rate', e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="0.00"
          />
          <button
            type="button"
            onClick={() => removeRow(tier.id)}
            disabled={tiers.length === 1}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" />
        Add Tenor
      </button>
    </div>
  );
}

function LendingMatrixEditor({
  tiers,
  onTiersChange,
}: {
  tiers: RateTier[];
  onTiersChange: (t: RateTier[]) => void;
}) {
  const rows = [...new Set(tiers.map((t) => t.row ?? ''))].filter(Boolean);
  const cols = [...new Set(tiers.map((t) => t.col ?? ''))].filter(Boolean);

  const getRate = (row: string, col: string) =>
    tiers.find((t) => t.row === row && t.col === col)?.rate ?? 0;

  const updateRate = (row: string, col: string, rate: string) => {
    const existing = tiers.find((t) => t.row === row && t.col === col);
    if (existing) {
      onTiersChange(tiers.map((t) => (t.id === existing.id ? { ...t, rate: Number(rate) } : t)));
    } else {
      onTiersChange([...tiers, { id: generateId(), minValue: 0, row, col, rate: Number(rate) }]);
    }
  };

  if (rows.length === 0 || cols.length === 0) {
    return <p className="text-sm text-muted-foreground">No matrix data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide border bg-muted/30">
              Risk Grade \ Amount Band
            </th>
            {cols.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide border bg-muted/30 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td className="px-3 py-2 text-xs font-medium border bg-muted/10 whitespace-nowrap">{row}</td>
              {cols.map((col) => (
                <td key={col} className="px-2 py-1 border">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      value={getRate(row, col)}
                      onChange={(e) => updateRate(row, col, e.target.value)}
                      className="w-20 px-2 py-1 rounded border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RateTierEditor({ rateTable, onChange, onSave, isSaving }: RateTierEditorProps) {
  const updateTiers = (tiers: RateTier[]) => onChange({ ...rateTable, tiers });

  const renderEditor = () => {
    switch (rateTable.type) {
      case 'SAVINGS':
      case 'PENALTY':
        return <SavingsTierEditor tiers={rateTable.tiers} onTiersChange={updateTiers} />;
      case 'FD':
        return <FDTierEditor tiers={rateTable.tiers} onTiersChange={updateTiers} />;
      case 'LENDING':
        return <LendingMatrixEditor tiers={rateTable.tiers} onTiersChange={updateTiers} />;
      default:
        return <SavingsTierEditor tiers={rateTable.tiers} onTiersChange={updateTiers} />;
    }
  };

  return (
    <div className="space-y-4">
      {renderEditor()}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
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
