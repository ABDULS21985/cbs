import { useState } from 'react';
import { X } from 'lucide-react';
import type { SettlementType } from '../../api/settlementApi';

interface InstructionFormProps {
  onSubmit: (payload: {
    type: SettlementType;
    instrumentCode: string;
    quantity: number;
    amount: number;
    currency: string;
    counterpartyCode: string;
    depository: string;
    settlementDate: string;
  }) => void;
  isPending: boolean;
  onClose: () => void;
}

export function InstructionForm({ onSubmit, isPending, onClose }: InstructionFormProps) {
  const [form, setForm] = useState({
    type: 'DVP' as SettlementType,
    instrumentCode: '',
    quantity: 0,
    amount: 0,
    currency: 'NGN',
    counterpartyCode: '',
    depository: '',
    settlementDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">New Settlement Instruction</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full mt-1 input"
              >
                <option value="DVP">DVP (Delivery vs Payment)</option>
                <option value="FOP">FOP (Free of Payment)</option>
                <option value="RVP">RVP (Receive vs Payment)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full mt-1 input"
              >
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Instrument Code</label>
            <input
              className="w-full mt-1 input"
              placeholder="e.g., FGN-2030-12.5"
              value={form.instrumentCode}
              onChange={(e) => update('instrumentCode', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Quantity</label>
              <input
                type="number"
                className="w-full mt-1 input"
                value={form.quantity || ''}
                onChange={(e) => update('quantity', parseInt(e.target.value) || 0)}
                required
                min={1}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <input
                type="number"
                step="0.01"
                className="w-full mt-1 input"
                value={form.amount || ''}
                onChange={(e) => update('amount', parseFloat(e.target.value) || 0)}
                required
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Counterparty Code</label>
            <input
              className="w-full mt-1 input"
              placeholder="e.g., CPTY-001"
              value={form.counterpartyCode}
              onChange={(e) => update('counterpartyCode', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Depository</label>
              <input
                className="w-full mt-1 input"
                placeholder="e.g., CSCS, Euroclear"
                value={form.depository}
                onChange={(e) => update('depository', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Settlement Date</label>
              <input
                type="date"
                className="w-full mt-1 input"
                value={form.settlementDate}
                onChange={(e) => update('settlementDate', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating...' : 'Create Instruction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
