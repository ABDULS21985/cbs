import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collateralApi } from '../../api/collateralApi';

interface InsuranceUpdateFormProps {
  collateralId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InsuranceUpdateForm({ collateralId, onSuccess, onCancel }: InsuranceUpdateFormProps) {
  const queryClient = useQueryClient();

  const { mutate: updateInsurance, isPending } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      collateralApi.updateInsurance(collateralId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collateral', collateralId] });
      onSuccess?.();
    },
  });

  const [form, setForm] = useState({
    provider: '',
    policyNumber: '',
    sumInsured: '',
    expiryDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.provider.trim()) errs.provider = 'Provider is required';
    if (!form.policyNumber.trim()) errs.policyNumber = 'Policy number is required';
    if (!form.sumInsured || Number(form.sumInsured) <= 0)
      errs.sumInsured = 'Sum insured must be greater than 0';
    if (!form.expiryDate) errs.expiryDate = 'Expiry date is required';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    updateInsurance({
      provider: form.provider,
      policyNumber: form.policyNumber,
      sumInsured: Number(form.sumInsured),
      expiryDate: form.expiryDate,
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors';
  const errorClass = 'text-xs text-red-500 mt-0.5';
  const labelClass = 'block text-sm font-medium mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Provider <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="Insurance company name"
            value={form.provider}
            onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
          />
          {errors.provider && <p className={errorClass}>{errors.provider}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Policy Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. POL-2024-001"
            value={form.policyNumber}
            onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))}
          />
          {errors.policyNumber && <p className={errorClass}>{errors.policyNumber}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Sum Insured (₦) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            className={inputClass}
            placeholder="e.g. 50000000"
            value={form.sumInsured}
            onChange={(e) => setForm((f) => ({ ...f, sumInsured: e.target.value }))}
          />
          {errors.sumInsured && <p className={errorClass}>{errors.sumInsured}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={form.expiryDate}
            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
          />
          {errors.expiryDate && <p className={errorClass}>{errors.expiryDate}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Updating…' : 'Update Insurance'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
