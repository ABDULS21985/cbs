import { useState } from 'react';
import { FormSection } from '@/components/shared/FormSection';
import { MoneyInput } from '@/components/shared/MoneyInput';

interface MandateFormData {
  mandateType: 'STANDING_MANDATE' | 'DIRECT_DEBIT_MANDATE';
  linkedAccountId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  amount: number;
  frequency: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Props {
  onSubmit: (data: MandateFormData) => void;
  isSubmitting?: boolean;
}

export function MandateForm({ onSubmit, isSubmitting }: Props) {
  const [form, setForm] = useState<MandateFormData>({
    mandateType: 'STANDING_MANDATE',
    linkedAccountId: '',
    beneficiaryName: '',
    beneficiaryAccount: '',
    amount: 0,
    frequency: 'MONTHLY',
    startDate: '',
    endDate: '',
    description: '',
  });

  const handleChange = (field: keyof MandateFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <FormSection title="Mandate Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Mandate Type</label>
            <select value={form.mandateType} onChange={(e) => handleChange('mandateType', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="STANDING_MANDATE">Standing Mandate</option>
              <option value="DIRECT_DEBIT_MANDATE">Direct Debit Mandate</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Source Account</label>
            <input value={form.linkedAccountId} onChange={(e) => handleChange('linkedAccountId', e.target.value)} placeholder="Account number" className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Name</label>
            <input value={form.beneficiaryName} onChange={(e) => handleChange('beneficiaryName', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Beneficiary Account</label>
            <input value={form.beneficiaryAccount} onChange={(e) => handleChange('beneficiaryAccount', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Amount Limit</label>
            <MoneyInput value={form.amount} onChange={(v) => handleChange('amount', v)} currency="NGN" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency</label>
            <select value={form.frequency} onChange={(e) => handleChange('frequency', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUALLY">Annually</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={(e) => handleChange('endDate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
      </FormSection>
      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {isSubmitting ? 'Creating...' : 'Create Mandate'}
        </button>
      </div>
    </form>
  );
}
