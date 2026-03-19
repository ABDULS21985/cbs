import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collateralApi } from '../../api/collateralApi';
import type { CollateralType } from '../../types/collateral';

interface CollateralRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const COLLATERAL_TYPES: { value: CollateralType; label: string }[] = [
  { value: 'PROPERTY', label: 'Property' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'CASH', label: 'Cash / Deposit' },
  { value: 'SHARES', label: 'Shares' },
  { value: 'DEBENTURE', label: 'Debenture' },
  { value: 'GUARANTEE', label: 'Guarantee' },
];

export function CollateralRegistrationForm({ onSuccess, onCancel }: CollateralRegistrationFormProps) {
  const queryClient = useQueryClient();
  const { mutate: register, isPending } = useMutation({
    mutationFn: collateralApi.registerCollateral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collateral'] });
      onSuccess?.();
    },
  });

  const [form, setForm] = useState({
    type: '' as CollateralType | '',
    description: '',
    owner: '',
    currentValue: '',
    valuationDate: '',
    valuer: '',
    location: '',
    registrationRef: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiry: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.type) errs.type = 'Type is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.owner.trim()) errs.owner = 'Owner is required';
    if (!form.currentValue || Number(form.currentValue) <= 0) errs.currentValue = 'Value must be greater than 0';
    if (!form.valuationDate) errs.valuationDate = 'Valuation date is required';
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
    register({
      type: form.type as CollateralType,
      description: form.description,
      owner: form.owner,
      currentValue: Number(form.currentValue),
      valuationDate: form.valuationDate,
      valuer: form.valuer || undefined,
      location: form.location || undefined,
      registrationRef: form.registrationRef || undefined,
      insuranceProvider: form.insuranceProvider || undefined,
      insurancePolicyNumber: form.insurancePolicyNumber || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
    });
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors';
  const errorClass = 'text-xs text-red-500 mt-0.5';
  const labelClass = 'block text-sm font-medium mb-1';

  const field = (
    key: keyof typeof form,
    label: string,
    required = false,
    type = 'text',
    placeholder = ''
  ) => (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        className={inputClass}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
      {errors[key] && <p className={errorClass}>{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core details */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Collateral Details
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Type <span className="text-red-500">*</span>
            </label>
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CollateralType }))}
            >
              <option value="">Select type…</option>
              {COLLATERAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.type && <p className={errorClass}>{errors.type}</p>}
          </div>
          {field('owner', 'Owner', true, 'text', 'Full name of owner')}
          <div className="sm:col-span-2">
            {field('description', 'Description', true, 'text', 'Brief description of the collateral')}
          </div>
          {field('location', 'Location', false, 'text', 'Physical address or location')}
          {field('registrationRef', 'Registration Ref', false, 'text', 'Title deed, plate number, etc.')}
        </div>
      </div>

      {/* Valuation */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Valuation
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('currentValue', 'Current Value (₦)', true, 'number', 'e.g. 50000000')}
          {field('valuationDate', 'Valuation Date', true, 'date')}
          {field('valuer', 'Valuer', false, 'text', 'Name of valuation firm or individual')}
        </div>
      </div>

      {/* Insurance */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Insurance (Optional)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('insuranceProvider', 'Provider', false, 'text', 'Insurance company')}
          {field('insurancePolicyNumber', 'Policy Number', false, 'text', 'e.g. POL-2024-001')}
          {field('insuranceExpiry', 'Expiry Date', false, 'date')}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Registering…' : 'Register Collateral'}
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
