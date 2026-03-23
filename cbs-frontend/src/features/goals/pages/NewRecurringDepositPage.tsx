import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatMoney } from '@/lib/formatters';
import { recurringDepositApi, type CreateRecurringDepositInput, type DepositFrequency } from '../api/goalApi';
import { apiGet } from '@/lib/api';

const FREQUENCIES: { value: DepositFrequency; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BI_WEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

interface Account { id: number; accountNumber: string; accountName: string; availableBalance: number; currencyCode: string; status: string; }

export function NewRecurringDepositPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateRecurringDepositInput>({
    accountId: 0,
    productCode: 'RD_STANDARD',
    installmentAmount: 0,
    frequency: 'MONTHLY',
    totalInstallments: 12,
    interestRate: 0,
    autoDebit: true,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-for-rd'],
    queryFn: () => apiGet<Account[]>('/api/v1/accounts', { status: 'ACTIVE', size: 100 }),
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
    if (!form.accountId || form.installmentAmount <= 0) {
      toast.error('Please fill all required fields');
      return;
    }
    createMut.mutate(form);
  };

  const totalValue = form.installmentAmount * form.totalInstallments;
  const freqLabel = FREQUENCIES.find((f) => f.value === form.frequency)?.label ?? form.frequency;

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader title="New Recurring Deposit" subtitle="Create a scheduled deposit plan" backTo="/accounts/recurring-deposits" />

      <div className="page-container max-w-xl">
        <form onSubmit={handleSubmit} className="surface-card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Account <span className="text-red-500">*</span></label>
            <select value={form.accountId || ''} onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })} className={inputCls} required>
              <option value="">Select account...</option>
              {accounts.filter(a => a.status === 'ACTIVE').map((a) => (
                <option key={a.id} value={a.id}>{a.accountName} — {a.accountNumber} ({formatMoney(a.availableBalance)} {a.currencyCode})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Installment Amount <span className="text-red-500">*</span></label>
            <input type="number" value={form.installmentAmount || ''} onChange={(e) => setForm({ ...form, installmentAmount: Number(e.target.value) })}
              placeholder="e.g. 50000" min={0.01} step="0.01" className={inputCls} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as DepositFrequency })} className={inputCls}>
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
            <label className="block text-sm font-medium mb-1">Interest Rate (% p.a.)</label>
            <input type="number" value={form.interestRate || ''} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) })}
              placeholder="e.g. 5.5" min={0} step="0.01" className={inputCls} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.autoDebit ?? true} onChange={(e) => setForm({ ...form, autoDebit: e.target.checked })}
              className="rounded border-gray-300" />
            <div>
              <span className="text-sm font-medium">Auto-Debit</span>
              <p className="text-xs text-muted-foreground">Automatically deduct installments when due</p>
            </div>
          </label>

          {/* Preview */}
          {form.installmentAmount > 0 && form.totalInstallments > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1.5">
              <p className="text-sm font-medium">{formatMoney(form.installmentAmount)} x {form.totalInstallments} {freqLabel.toLowerCase()} installments = <strong>{formatMoney(totalValue)}</strong> total</p>
              {form.interestRate > 0 && (
                <p className="text-xs text-muted-foreground">Interest rate: {form.interestRate}% p.a.</p>
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
