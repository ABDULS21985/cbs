import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { useAddInvestor } from '../../hooks/useCapitalMarkets';

interface InvestorBidFormProps {
  dealId: number;
  currency: string;
  onClose: () => void;
}

const INVESTOR_TYPES = [
  { value: 'PENSION_FUND', label: 'Pension Fund' },
  { value: 'ASSET_MANAGER', label: 'Asset Manager' },
  { value: 'BANK', label: 'Bank' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'OTHER', label: 'Other' },
];

export function InvestorBidForm({ dealId, currency, onClose }: InvestorBidFormProps) {
  const addInvestor = useAddInvestor(dealId);
  const [name, setName] = useState('');
  const [investorType, setInvestorType] = useState('ASSET_MANAGER');
  const [bidAmount, setBidAmount] = useState(0);
  const [bidPrice, setBidPrice] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || bidAmount <= 0) {
      toast.error('Investor name and bid amount are required');
      return;
    }
    addInvestor.mutate(
      { name, bidAmount, bidPrice: bidPrice > 0 ? bidPrice : undefined },
      {
        onSuccess: () => { toast.success(`${name} added to investor book`); onClose(); },
        onError: () => toast.error('Failed to add investor'),
      },
    );
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Add Investor</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Investor Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PensionFund Co" className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Investor Type</label>
            <select value={investorType} onChange={(e) => setInvestorType(e.target.value)} className={inputCls}>
              {INVESTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <MoneyInput label="Bid Amount" value={bidAmount} onChange={setBidAmount} currency={currency as 'NGN' | 'USD' | 'EUR' | 'GBP'} />
          <MoneyInput label="Bid Price (per unit)" value={bidPrice} onChange={setBidPrice} currency={currency as 'NGN' | 'USD' | 'EUR' | 'GBP'} />
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" className={inputCls + ' resize-none'} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={addInvestor.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {addInvestor.isPending ? 'Adding...' : 'Add Investor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
