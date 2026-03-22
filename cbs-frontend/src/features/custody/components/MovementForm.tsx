import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { useRecordSecuritiesMovement } from '../hooks/useCustodyExt';

const MOVEMENT_TYPES = ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'CORPORATE_ACTION', 'DIVIDEND', 'COUPON', 'MATURITY', 'MARGIN_CALL', 'REPO_IN', 'REPO_OUT', 'PLEDGE', 'RELEASE'];

interface MovementFormProps {
  positionId?: string;
  onClose: () => void;
}

export function MovementForm({ positionId: initialPositionId, onClose }: MovementFormProps) {
  const recordMut = useRecordSecuritiesMovement();
  const [form, setForm] = useState({
    positionId: initialPositionId ?? '',
    movementType: 'BUY',
    quantity: 0,
    price: 0,
    settlementAmount: 0,
    currency: 'NGN',
    counterpartyCode: '',
    tradeDate: new Date().toISOString().slice(0, 10),
    settlementDate: '',
  });

  const isBuySell = form.movementType === 'BUY' || form.movementType === 'SELL';
  const autoCalc = form.quantity * form.price;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.positionId || form.quantity <= 0 || !form.tradeDate) {
      toast.error('Position ID, quantity, and trade date are required');
      return;
    }
    if (isBuySell && form.price <= 0) {
      toast.error('Price is required for BUY/SELL movements');
      return;
    }
    if (form.settlementDate && form.settlementDate < form.tradeDate) {
      toast.error('Settlement date must be on or after trade date');
      return;
    }
    recordMut.mutate(
      {
        ...form,
        settlementAmount: form.settlementAmount || autoCalc,
      },
      {
        onSuccess: () => { toast.success('Movement recorded'); onClose(); },
        onError: () => toast.error('Failed to record movement'),
      },
    );
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Record Movement</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Position ID <span className="text-red-500">*</span></label>
              <input value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })}
                readOnly={!!initialPositionId} className={inputCls + (initialPositionId ? ' bg-muted font-mono' : ' font-mono')} placeholder="SP-XXXXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Movement Type <span className="text-red-500">*</span></label>
              <select value={form.movementType} onChange={(e) => setForm({ ...form, movementType: e.target.value })} className={inputCls}>
                {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="1" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className={inputCls + ' font-mono'} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price {isBuySell && <span className="text-red-500">*</span>}</label>
              <input type="number" min="0" step="0.01" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputCls + ' font-mono'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Settlement Amount</label>
              <input type="number" min="0" step="0.01" value={form.settlementAmount || autoCalc || ''} onChange={(e) => setForm({ ...form, settlementAmount: Number(e.target.value) })} className={inputCls + ' font-mono'} placeholder={autoCalc > 0 ? `Auto: ${autoCalc.toFixed(2)}` : ''} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputCls}>
                <option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Counterparty Code</label>
            <input value={form.counterpartyCode} onChange={(e) => setForm({ ...form, counterpartyCode: e.target.value })} className={inputCls} placeholder="e.g. STANBIC-NG" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trade Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.tradeDate} onChange={(e) => setForm({ ...form, tradeDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Settlement Date</label>
              <input type="date" value={form.settlementDate} onChange={(e) => setForm({ ...form, settlementDate: e.target.value })} min={form.tradeDate} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={recordMut.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {recordMut.isPending ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
