import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Loader2, CheckCircle } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { escrowApi } from '../../api/escrowApi';
import type { CreateEscrowRequest, EscrowType } from '../../types/escrow';

const ESCROW_TYPES: { value: EscrowType; label: string; description: string }[] = [
  { value: 'ESCROW', label: 'Escrow', description: 'Standard escrow for conditional release' },
  { value: 'TRUST', label: 'Trust', description: 'Trust account for fiduciary management' },
  { value: 'RETENTION', label: 'Retention', description: 'Retention deposit for contractual obligations' },
  { value: 'COLLATERAL_CASH', label: 'Collateral Cash', description: 'Cash collateral for credit or trading facilities' },
];

export function NewEscrowPage() {
  useEffect(() => { document.title = 'New Escrow Mandate | CBS'; }, []);
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const [form, setForm] = useState<CreateEscrowRequest>({
    accountId: 0,
    escrowType: 'ESCROW',
    purpose: '',
    mandatedAmount: 0,
    currencyCode: 'NGN',
  });

  const [conditions, setConditions] = useState<string[]>(['']);

  const createMutation = useMutation({
    mutationFn: (data: CreateEscrowRequest) => escrowApi.create(data),
    onSuccess: (result) => {
      toast.success('Escrow mandate created');
      setCreatedId(result.id);
      setSuccess(true);
    },
    onError: () => toast.error('Failed to create escrow mandate'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const releaseConditions = conditions.filter((c) => c.trim());
    createMutation.mutate({ ...form, releaseConditions: releaseConditions.length > 0 ? releaseConditions : undefined });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value))
        : (type === 'checkbox' && e.target instanceof HTMLInputElement) ? e.target.checked
        : value,
    }));
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-bold">Escrow Mandate Created</h2>
        <p className="text-sm text-muted-foreground">Amount: {formatMoney(form.mandatedAmount, form.currencyCode)}</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate(`/accounts/escrow/${createdId}`)}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            View Mandate
          </button>
          <button onClick={() => navigate('/accounts/escrow')}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <>
      <PageHeader title="Create Escrow Mandate" subtitle="Set up a new escrow, trust, retention, or collateral mandate" backTo="/accounts/escrow" />

      <div className="px-6 pb-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Selection */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Escrow Type</label>
            <div className="grid grid-cols-2 gap-3">
              {ESCROW_TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, escrowType: t.value }))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    form.escrowType === t.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50'
                  }`}>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Account ID</label>
              <input name="accountId" type="number" min={1} required value={form.accountId || ''} onChange={handleChange} className={inputCls} placeholder="Source account ID" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
              <select name="currencyCode" value={form.currencyCode} onChange={handleChange} className={inputCls}>
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Mandated Amount</label>
            <input name="mandatedAmount" type="number" min={0.01} step={0.01} required value={form.mandatedAmount || ''} onChange={handleChange} className={inputCls} placeholder="0.00" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Purpose</label>
            <textarea name="purpose" required maxLength={500} value={form.purpose} onChange={handleChange}
              className={inputCls + ' min-h-[80px]'} placeholder="Describe the purpose of this escrow mandate" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Depositor Customer ID</label>
              <input name="depositorCustomerId" type="number" value={form.depositorCustomerId || ''} onChange={handleChange} className={inputCls} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Customer ID</label>
              <input name="beneficiaryCustomerId" type="number" value={form.beneficiaryCustomerId || ''} onChange={handleChange} className={inputCls} placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Expiry Date</label>
            <input name="expiryDate" type="date" value={form.expiryDate || ''} onChange={handleChange} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="requiresMultiSign" checked={form.requiresMultiSign || false}
                onChange={(e) => setForm((p) => ({ ...p, requiresMultiSign: e.target.checked }))}
                className="rounded border-border" />
              <span className="text-sm">Requires Multi-Sign</span>
            </label>
            {form.requiresMultiSign && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Required Signatories</label>
                <input name="requiredSignatories" type="number" min={2} value={form.requiredSignatories || ''} onChange={handleChange} className={inputCls} />
              </div>
            )}
          </div>

          {/* Release Conditions */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Release Conditions</label>
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i} className="flex gap-2">
                  <input value={cond} onChange={(e) => {
                    const updated = [...conditions];
                    updated[i] = e.target.value;
                    setConditions(updated);
                  }} className={inputCls} placeholder={`Condition ${i + 1}`} />
                  {conditions.length > 1 && (
                    <button type="button" onClick={() => setConditions((c) => c.filter((_, idx) => idx !== i))}
                      className="px-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setConditions((c) => [...c, ''])}
                className="text-xs text-primary hover:underline">+ Add Condition</button>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" onClick={() => navigate('/accounts/escrow')}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Mandate
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
