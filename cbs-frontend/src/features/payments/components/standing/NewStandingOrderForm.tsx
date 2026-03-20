import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormSection } from '@/components/shared/FormSection';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { standingOrderApi } from '../../api/standingOrderApi';
import { useAccounts } from '../../hooks/useTransfer';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewStandingOrderForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const [form, setForm] = useState({
    sourceAccountId: '', beneficiaryName: '', beneficiaryAccount: '', beneficiaryBankCode: '',
    amount: 0, frequency: 'MONTHLY', dayOfMonth: '1', startDate: '', endDate: '', description: '',
  });

  const createMutation = useMutation({
    mutationFn: () => standingOrderApi.create({
      sourceAccountId: Number(form.sourceAccountId),
      beneficiaryName: form.beneficiaryName,
      beneficiaryAccount: form.beneficiaryAccount,
      beneficiaryBankCode: form.beneficiaryBankCode || undefined,
      amount: form.amount,
      currency: 'NGN',
      frequency: form.frequency as any,
      dayOfMonth: Number(form.dayOfMonth),
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      description: form.description,
    }),
    onSuccess: () => { toast.success('Standing order created'); queryClient.invalidateQueries({ queryKey: ['standing-orders'] }); onSuccess(); },
    onError: () => toast.error('Failed to create standing order'),
  });

  const update = (field: string, value: string | number) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-6">
      <FormSection title="Standing Order Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Source Account</label>
            <select value={form.sourceAccountId} onChange={(e) => update('sourceAccountId', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required>
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName} ({a.currency})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Name</label>
            <input value={form.beneficiaryName} onChange={(e) => update('beneficiaryName', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Account</label>
            <input value={form.beneficiaryAccount} onChange={(e) => update('beneficiaryAccount', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm font-mono" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
            <MoneyInput value={form.amount} onChange={(v) => update('amount', v)} currency="NGN" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency</label>
            <select value={form.frequency} onChange={(e) => update('frequency', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              {['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'].map((f) => (
                <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Day of Month</label>
            <select value={form.dayOfMonth} onChange={(e) => update('dayOfMonth', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">End Date (optional)</label>
            <input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
          <input value={form.description} onChange={(e) => update('description', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
      </FormSection>

      {form.amount > 0 && form.beneficiaryName && (
        <div className="p-3 bg-primary/5 border border-primary/10 rounded-md text-sm">
          <strong>{formatMoney(form.amount, 'NGN')}</strong> will be debited {form.frequency.toLowerCase().replace(/_/g, '-')} and sent to <strong>{form.beneficiaryName}</strong> ({form.beneficiaryAccount})
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md text-sm hover:bg-muted">Cancel</button>
        <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {createMutation.isPending ? 'Creating...' : 'Create Standing Order'}
        </button>
      </div>
    </form>
  );
}
