import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useAddHolding } from '../../hooks/useInvestments';

interface Props {
  portfolioCode: string;
  currency: string;
  open: boolean;
  onClose: () => void;
}

export function AddHoldingSheet({ portfolioCode, currency, open, onClose }: Props) {
  const addHolding = useAddHolding(portfolioCode);
  const [form, setForm] = useState({
    instrumentCode: '', instrumentName: '', holdingType: 'EQUITY',
    quantity: 0, costPrice: 0, currency,
  });

  const handleSubmit = () => {
    addHolding.mutate(form, {
      onSuccess: () => { toast.success('Holding added'); onClose(); setForm({ instrumentCode: '', instrumentName: '', holdingType: 'EQUITY', quantity: 0, costPrice: 0, currency }); },
      onError: () => toast.error('Failed to add holding'),
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Add Holding</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Instrument Code</label><input value={form.instrumentCode} onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="e.g. DANGCEM" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Type</label><select value={form.holdingType} onChange={(e) => setForm((f) => ({ ...f, holdingType: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm">
              {['EQUITY', 'FIXED_INCOME', 'CASH', 'ALTERNATIVE', 'COMMODITY'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Instrument Name</label><input value={form.instrumentName} onChange={(e) => setForm((f) => ({ ...f, instrumentName: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Dangote Cement Plc" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Quantity</label><input type="number" value={form.quantity || ''} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Cost Price</label><input type="number" step="0.01" value={form.costPrice || ''} onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))} className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={addHolding.isPending || !form.instrumentCode || !form.instrumentName || !form.quantity}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {addHolding.isPending ? 'Adding...' : 'Add Holding'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
