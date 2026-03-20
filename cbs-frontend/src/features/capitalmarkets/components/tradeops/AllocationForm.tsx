import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { toast } from 'sonner';

interface AllocationRow {
  subAccount: string;
  quantity: number;
  price: number;
}

interface AllocationFormProps {
  onSubmit: (parentOrderRef: string, allocations: AllocationRow[]) => void;
  isPending: boolean;
  onClose: () => void;
}

export function AllocationForm({ onSubmit, isPending, onClose }: AllocationFormProps) {
  const [parentOrderRef, setParentOrderRef] = useState('');
  const [rows, setRows] = useState<AllocationRow[]>([{ subAccount: '', quantity: 0, price: 0 }]);

  const addRow = () => setRows([...rows, { subAccount: '', quantity: 0, price: 0 }]);

  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, field: keyof AllocationRow, value: string | number) => {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalAmount = rows.reduce((s, r) => s + r.quantity * r.price, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentOrderRef) {
      toast.error('Parent order ref is required');
      return;
    }
    if (rows.some((r) => !r.subAccount || !r.quantity || !r.price)) {
      toast.error('All allocation fields are required');
      return;
    }
    onSubmit(parentOrderRef, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Allocate Trade Block</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Parent Order Ref</label>
            <input
              className="w-full mt-1 input"
              placeholder="ORD-2024-001"
              value={parentOrderRef}
              onChange={(e) => setParentOrderRef(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Allocations</p>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-end">
                <div>
                  {i === 0 && <label className="text-xs text-muted-foreground block mb-1">Sub-Account</label>}
                  <input
                    className="w-full input"
                    placeholder="Sub-account"
                    value={row.subAccount}
                    onChange={(e) => updateRow(i, 'subAccount', e.target.value)}
                    required
                  />
                </div>
                <div>
                  {i === 0 && <label className="text-xs text-muted-foreground block mb-1">Quantity</label>}
                  <input
                    type="number"
                    className="w-full input"
                    placeholder="0"
                    value={row.quantity || ''}
                    onChange={(e) => updateRow(i, 'quantity', parseInt(e.target.value) || 0)}
                    required
                    min={1}
                  />
                </div>
                <div>
                  {i === 0 && <label className="text-xs text-muted-foreground block mb-1">Price</label>}
                  <input
                    type="number"
                    step="0.01"
                    className="w-full input"
                    placeholder="0.00"
                    value={row.price || ''}
                    onChange={(e) => updateRow(i, 'price', parseFloat(e.target.value) || 0)}
                    required
                    min={0}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  className="p-2 rounded-md hover:bg-muted disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" /> Add Sub-Account
            </button>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between text-sm">
            <span>Total: {totalQty.toLocaleString()} units</span>
            <span className="font-medium tabular-nums">{formatMoney(totalAmount)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Allocating...' : 'Allocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
