import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { Plus, Trash2, Shield, AlertTriangle, Check } from 'lucide-react';
import type { LoanApplicationState } from '../../hooks/useLoanApplication';
import type { CollateralItem } from '../../types/loan';

interface CollateralStepProps {
  state: LoanApplicationState;
  updateField: <K extends keyof LoanApplicationState>(field: K, value: LoanApplicationState[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

const COLLATERAL_TYPES: CollateralItem['type'][] = ['PROPERTY', 'VEHICLE', 'EQUIPMENT', 'CASH_DEPOSIT', 'SHARES', 'INSURANCE_POLICY'];

export function CollateralStep({ state, updateField, onNext, onBack }: CollateralStepProps) {
  const requiresCollateral = state.product?.requiresCollateral ?? false;
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CollateralItem>>({ type: 'PROPERTY', description: '', estimatedValue: 0, location: '' });

  const items = state.collateralItems;
  const totalAllocated = items.reduce((s, c) => s + (c.estimatedValue || 0), 0);
  const coverageRatio = state.amount > 0 ? (totalAllocated / state.amount) * 100 : 0;
  const isAdequate = !requiresCollateral || coverageRatio >= 100;

  const addItem = () => {
    if (!newItem.description || !newItem.estimatedValue) return;
    const item: CollateralItem = {
      id: Date.now(),
      type: (newItem.type as CollateralItem['type']) || 'PROPERTY',
      description: newItem.description || '',
      estimatedValue: newItem.estimatedValue || 0,
      location: newItem.location,
    };
    updateField('collateralItems', [...items, item]);
    setNewItem({ type: 'PROPERTY', description: '', estimatedValue: 0, location: '' });
    setShowForm(false);
  };

  const removeItem = (id: number) => {
    updateField('collateralItems', items.filter((c) => c.id !== id));
  };

  const canProceed = !requiresCollateral || items.length > 0;

  return (
    <div className="surface-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Collateral</h3>
        <p className="text-sm text-muted-foreground">
          {requiresCollateral ? 'This product requires collateral security' : 'Collateral is optional for this product'}
        </p>
      </div>

      {/* Coverage Analysis */}
      <div className={cn('rounded-lg border p-4', isAdequate ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800')}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className={cn('w-4 h-4', isAdequate ? 'text-green-600' : 'text-red-600')} />
          <p className="text-sm font-semibold">Coverage Analysis</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-muted-foreground">Loan Amount</p><p className="font-bold tabular-nums">{formatMoney(state.amount)}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Collateral</p><p className="font-bold tabular-nums">{formatMoney(totalAllocated)}</p></div>
          <div><p className="text-xs text-muted-foreground">Coverage Ratio</p><p className={cn('font-bold tabular-nums', isAdequate ? 'text-green-600' : 'text-red-600')}>{coverageRatio.toFixed(1)}%</p></div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
          <div className={cn('h-full rounded-full', isAdequate ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${Math.min(coverageRatio, 100)}%` }} />
        </div>
        <p className={cn('text-xs mt-1', isAdequate ? 'text-green-600' : 'text-red-600')}>
          {isAdequate ? <><Check className="w-3 h-3 inline" /> Adequate coverage</> : <><AlertTriangle className="w-3 h-3 inline" /> Insufficient coverage — minimum 100% required</>}
        </p>
      </div>

      {/* Collateral Items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{item.type}</span>
                  <span className="text-sm font-medium">{item.description}</span>
                </div>
                {item.location && <p className="text-xs text-muted-foreground mt-0.5">{item.location}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold tabular-nums">{formatMoney(item.estimatedValue)}</span>
                <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Collateral Form */}
      {showForm ? (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-semibold">Register New Collateral</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select className="w-full mt-1 input" value={newItem.type} onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value as CollateralItem['type'] }))}>
                {COLLATERAL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Estimated Value *</label>
              <input type="number" className="w-full mt-1 input" value={newItem.estimatedValue || ''} onChange={(e) => setNewItem((p) => ({ ...p, estimatedValue: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description *</label>
            <input className="w-full mt-1 input" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} placeholder="e.g., 3-bedroom house at Lekki Phase 1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Location</label>
            <input className="w-full mt-1 input" value={newItem.location || ''} onChange={(e) => setNewItem((p) => ({ ...p, location: e.target.value }))} placeholder="Address or registration number" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={addItem} disabled={!newItem.description || !newItem.estimatedValue} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">Add Collateral</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm text-primary hover:underline">
          <Plus className="w-4 h-4" /> Add Collateral
        </button>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Back</button>
        <button onClick={onNext} disabled={!canProceed} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {requiresCollateral ? 'Continue' : 'Skip & Continue'}
        </button>
      </div>
    </div>
  );
}
