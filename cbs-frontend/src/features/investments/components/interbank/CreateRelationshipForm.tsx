import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateInterbankRelationship } from '../../hooks/useInvestments';

interface Props { open: boolean; onClose: () => void }

export function CreateRelationshipForm({ open, onClose }: Props) {
  const create = useCreateInterbankRelationship();
  const [form, setForm] = useState({
    bankName: '',
    bicCode: '',
    relationshipType: 'CORRESPONDENT',
    creditLineAmount: 0,
    agreementDate: '',
    reviewDate: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(form as any, {
      onSuccess: () => { toast.success('Relationship created'); onClose(); },
      onError: () => toast.error('Failed to create relationship'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-background w-full max-w-md h-full shadow-xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">New Interbank Relationship</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Counterparty Bank Name</label>
            <input className="w-full mt-1 input" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">BIC / SWIFT Code</label>
            <input className="w-full mt-1 input font-mono" placeholder="e.g. GTBINGLA" value={form.bicCode} onChange={(e) => setForm((f) => ({ ...f, bicCode: e.target.value.toUpperCase() }))} required maxLength={11} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Relationship Type</label>
            <select value={form.relationshipType} onChange={(e) => setForm((f) => ({ ...f, relationshipType: e.target.value }))} className="w-full mt-1 input">
              <option value="CORRESPONDENT">Correspondent</option>
              <option value="CREDIT_LINE">Credit Line</option>
              <option value="NOSTRO_VOSTRO">Nostro/Vostro</option>
              <option value="SWAP">Swap</option>
              <option value="SETTLEMENT">Settlement</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Credit Line Amount</label>
            <input type="number" className="w-full mt-1 input" value={form.creditLineAmount || ''} onChange={(e) => setForm((f) => ({ ...f, creditLineAmount: parseFloat(e.target.value) || 0 }))} min={0} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Agreement Date</label>
              <input type="date" className="w-full mt-1 input" value={form.agreementDate} onChange={(e) => setForm((f) => ({ ...f, agreementDate: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Review Date</label>
              <input type="date" className="w-full mt-1 input" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} required />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Creating...' : 'Create Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
