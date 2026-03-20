import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePortfolio } from '../../hooks/useInvestments';

interface Props { open: boolean; onClose: () => void }

export function CreatePortfolioSheet({ open, onClose }: Props) {
  const createPortfolio = useCreatePortfolio();
  const [form, setForm] = useState({ customerId: 0, type: 'DISCRETIONARY', name: '', currency: 'NGN', benchmark: '', manager: '' });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPortfolio.mutate(
      { ...form, benchmark: form.benchmark || undefined, manager: form.manager || undefined },
      {
        onSuccess: () => { toast.success('Portfolio created'); onClose(); },
        onError: () => toast.error('Failed to create portfolio'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-background w-full max-w-md h-full shadow-xl overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create Investment Portfolio</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
            <input type="number" className="w-full mt-1 input" placeholder="Customer ID" value={form.customerId || ''} onChange={(e) => setForm((f) => ({ ...f, customerId: parseInt(e.target.value, 10) || 0 }))} required min={1} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Portfolio Name</label>
            <input className="w-full mt-1 input" placeholder="Portfolio name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full mt-1 input">
                <option value="DISCRETIONARY">Discretionary</option>
                <option value="ADVISORY">Advisory</option>
                <option value="EXECUTION_ONLY">Execution Only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full mt-1 input">
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Benchmark <span className="text-muted-foreground/60">(optional)</span></label>
            <input className="w-full mt-1 input" placeholder="e.g. NSE All-Share Index" value={form.benchmark} onChange={(e) => setForm((f) => ({ ...f, benchmark: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Manager <span className="text-muted-foreground/60">(optional)</span></label>
            <input className="w-full mt-1 input" placeholder="Portfolio manager name" value={form.manager} onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={createPortfolio.isPending} className="btn-primary">
              {createPortfolio.isPending ? 'Creating...' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
