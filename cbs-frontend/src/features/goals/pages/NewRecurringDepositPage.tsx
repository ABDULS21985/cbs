import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { recurringDepositApi, type CreateRecurringDepositInput } from '../api/goalApi';

const FREQUENCIES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

export function NewRecurringDepositPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateRecurringDepositInput>({
    customerId: 0,
    amount: 0,
    frequency: 'MONTHLY',
    totalInstallments: 12,
    startDate: '',
    sourceAccountId: undefined,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateRecurringDepositInput) => recurringDepositApi.create(data),
    onSuccess: (result) => {
      toast.success('Recurring deposit plan created');
      navigate(`/accounts/recurring-deposits/${result.id}`);
    },
    onError: () => toast.error('Failed to create plan'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || form.amount <= 0 || !form.startDate) {
      toast.error('Please fill all required fields');
      return;
    }
    createMut.mutate(form);
  };

  const totalValue = form.amount * form.totalInstallments;
  const freqLabel = FREQUENCIES.find((f) => f.value === form.frequency)?.label ?? form.frequency;

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader title="New Recurring Deposit" subtitle="Create a scheduled deposit plan" backTo="/accounts/recurring-deposits" />

      <div className="page-container max-w-xl">
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Customer ID <span className="text-red-500">*</span></label>
            <input type="number" value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })}
              placeholder="e.g. 1" className={inputCls} required />
          </div>

          <MoneyInput label="Amount per Installment" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} currency="NGN" />

          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inputCls}>
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Number of Installments</label>
            <div className="flex items-center gap-3">
              <input type="range" min={6} max={60} value={form.totalInstallments} onChange={(e) => setForm({ ...form, totalInstallments: Number(e.target.value) })}
                className="flex-1 accent-primary" />
              <input type="number" min={1} max={120} value={form.totalInstallments} onChange={(e) => setForm({ ...form, totalInstallments: Number(e.target.value) })}
                className="w-20 px-2 py-1 text-sm rounded border bg-background font-mono text-center" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source Account ID</label>
            <input type="number" value={form.sourceAccountId || ''} onChange={(e) => setForm({ ...form, sourceAccountId: Number(e.target.value) || undefined })}
              placeholder="Optional — for auto-debit" className={inputCls} />
          </div>

          {/* Preview */}
          {form.amount > 0 && form.totalInstallments > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1.5">
              <p className="text-sm font-medium">{formatMoney(form.amount)} x {form.totalInstallments} {freqLabel.toLowerCase()} installments = <strong>{formatMoney(totalValue)}</strong> total</p>
              {form.startDate && (
                <p className="text-xs text-muted-foreground">First installment: {form.startDate}</p>
              )}
            </div>
          )}

          <button type="submit" disabled={createMut.isPending}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {createMut.isPending ? 'Creating...' : 'Create Plan'}
          </button>
        </form>
      </div>
    </>
  );
}
