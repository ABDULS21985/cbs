import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCounterparty } from '../hooks/useCustodyExt';

const TYPES = ['BANK', 'BROKER_DEALER', 'INSURANCE', 'FUND_MANAGER', 'CORPORATE', 'SOVEREIGN', 'CENTRAL_BANK', 'CLEARING_HOUSE', 'EXCHANGE', 'SPV'];
const AGENCIES = ['MOODY', 'S&P', 'FITCH'];
const COUNTRIES = ['NG', 'US', 'GB', 'DE', 'FR', 'CH', 'JP', 'CN', 'SG', 'ZA', 'AE', 'KE', 'GH'];

interface CounterpartyFormProps {
  onClose: () => void;
  onSuccess?: (code: string) => void;
}

export function CounterpartyForm({ onClose, onSuccess }: CounterpartyFormProps) {
  const create = useCreateCounterparty();
  const [form, setForm] = useState({
    counterpartyName: '',
    counterpartyType: 'BANK',
    lei: '',
    bicCode: '',
    country: 'NG',
    creditRating: '',
    ratingAgency: 'S&P',
    totalExposureLimit: 0,
    riskCategory: 'LOW',
    nettingAgreement: false,
    isdaAgreement: false,
    csaAgreement: false,
  });

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.counterpartyName || !form.counterpartyType || form.totalExposureLimit <= 0) {
      toast.error('Please fill all required fields');
      return;
    }
    create.mutate(
      form,
      {
        onSuccess: (data) => {
          toast.success('Counterparty created');
          onSuccess?.(data.counterpartyCode);
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">New Counterparty</h2>

        <p className="text-xs text-muted-foreground mb-4">A unique counterparty code (CP-...) will be generated automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name *</label>
            <input className="w-full mt-1 input" placeholder="Counterparty name" value={form.counterpartyName} onChange={(e) => update('counterpartyName', e.target.value)} required />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Type *</label>
            <select className="w-full mt-1 input" value={form.counterpartyType} onChange={(e) => update('counterpartyType', e.target.value)} required>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">LEI</label>
              <input className="w-full mt-1 input" placeholder="20-character LEI" maxLength={20} value={form.lei} onChange={(e) => update('lei', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">BIC/SWIFT</label>
              <input className="w-full mt-1 input" placeholder="SWIFT code" maxLength={11} value={form.bicCode} onChange={(e) => update('bicCode', e.target.value.toUpperCase())} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Country</label>
              <select className="w-full mt-1 input" value={form.country} onChange={(e) => update('country', e.target.value)}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Credit Rating</label>
              <input className="w-full mt-1 input" placeholder="e.g., AA+" value={form.creditRating} onChange={(e) => update('creditRating', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Agency</label>
              <select className="w-full mt-1 input" value={form.ratingAgency} onChange={(e) => update('ratingAgency', e.target.value)}>
                {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Exposure Limit *</label>
              <input type="number" step="0.01" min={0} className="w-full mt-1 input" value={form.totalExposureLimit || ''} onChange={(e) => update('totalExposureLimit', parseFloat(e.target.value) || 0)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Risk Category</label>
              <select className="w-full mt-1 input" value={form.riskCategory} onChange={(e) => update('riskCategory', e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Agreements</p>
            <div className="flex gap-6">
              {(['nettingAgreement', 'isdaAgreement', 'csaAgreement'] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form[key]} onChange={(e) => update(key, e.target.checked)} className="rounded" />
                  {key === 'nettingAgreement' ? 'Netting' : key === 'isdaAgreement' ? 'ISDA' : 'CSA'}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Creating...' : 'Create Counterparty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
