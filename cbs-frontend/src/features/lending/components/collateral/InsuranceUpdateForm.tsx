import { useState } from 'react';
import { toast } from 'sonner';
import { useAddValuation } from '../../hooks/useCollateral';

interface InsuranceUpdateFormProps {
  collateralId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InsuranceUpdateForm({ collateralId, onSuccess, onCancel }: InsuranceUpdateFormProps) {
  // The backend CollateralDto has insurance fields (isInsured, insurancePolicyNumber,
  // insuranceExpiryDate, insuranceValue) but there's no dedicated PATCH endpoint for insurance.
  // The valuation endpoint can record a valuation that includes updated insurance context.
  // For a full insurance update, the collateral must be re-registered via POST /collaterals.
  const addValuation = useAddValuation();
  const isPending = addValuation.isPending;

  const [form, setForm] = useState({
    provider: '',
    policyNumber: '',
    sumInsured: '',
    expiryDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.policyNumber || !form.expiryDate) {
      toast.error('Policy number and expiry date are required');
      return;
    }

    // Record a valuation that captures insurance details as a note
    addValuation.mutate(
      {
        id: collateralId,
        data: {
          valuationDate: new Date().toISOString().split('T')[0],
          marketValue: parseFloat(form.sumInsured) || 0,
          valuationMethod: 'DESKTOP',
          notes: `Insurance update: Policy ${form.policyNumber}, Provider: ${form.provider}, Sum Insured: ${form.sumInsured}, Expiry: ${form.expiryDate}`,
          status: 'COMPLETED',
        },
      },
      {
        onSuccess: () => {
          toast.success('Insurance details recorded via valuation note');
          onSuccess?.();
        },
        onError: () => toast.error('Failed to update insurance details'),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">Insurance details are recorded as a valuation note. A dedicated insurance endpoint is not yet available.</p>

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Insurance Provider</label>
        <input type="text" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
          placeholder="e.g. Leadway Assurance" className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Policy Number *</label>
          <input type="text" value={form.policyNumber} onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Sum Insured</label>
          <input type="number" value={form.sumInsured} onChange={(e) => setForm((f) => ({ ...f, sumInsured: e.target.value }))}
            step="0.01" min="0" className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Expiry Date *</label>
        <input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" required />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors">Cancel</button>}
        <button type="submit" disabled={isPending || !form.policyNumber || !form.expiryDate}
          className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isPending ? 'Saving...' : 'Record Insurance'}
        </button>
      </div>
    </form>
  );
}
