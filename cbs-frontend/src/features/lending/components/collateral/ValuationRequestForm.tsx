import { useState } from 'react';
import { useAddValuation } from '../../hooks/useCollateral';

interface ValuationRequestFormProps {
  collateralId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const VALUATION_METHODS = [
  { value: 'MARKET', label: 'Market Value' },
  { value: 'INCOME', label: 'Income Approach' },
  { value: 'COST', label: 'Cost Approach' },
];

export function ValuationRequestForm({ collateralId, onSuccess, onCancel }: ValuationRequestFormProps) {
  const { mutate: addValuation, isPending } = useAddValuation();

  const [form, setForm] = useState({
    valuerName: '',
    method: '',
    requestedDate: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.valuerName.trim()) errs.valuerName = 'Valuer name is required';
    if (!form.method) errs.method = 'Method is required';
    if (!form.requestedDate) errs.requestedDate = 'Requested date is required';
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
    addValuation(
      {
        id: collateralId,
        data: {
          valuerName: form.valuerName,
          method: form.method,
          requestedDate: form.requestedDate,
          notes: form.notes,
        },
      },
      {
        onSuccess: () => {
          setForm({ valuerName: '', method: '', requestedDate: '', notes: '' });
          onSuccess?.();
        },
      }
    );
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors';
  const errorClass = 'text-xs text-red-500 mt-0.5';
  const labelClass = 'block text-sm font-medium mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>
          Valuer Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          placeholder="Name of valuation firm or appraiser"
          value={form.valuerName}
          onChange={(e) => setForm((f) => ({ ...f, valuerName: e.target.value }))}
        />
        {errors.valuerName && <p className={errorClass}>{errors.valuerName}</p>}
      </div>

      <div>
        <label className={labelClass}>
          Valuation Method <span className="text-red-500">*</span>
        </label>
        <select
          className={inputClass}
          value={form.method}
          onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
        >
          <option value="">Select method…</option>
          {VALUATION_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.method && <p className={errorClass}>{errors.method}</p>}
      </div>

      <div>
        <label className={labelClass}>
          Requested Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          className={inputClass}
          value={form.requestedDate}
          onChange={(e) => setForm((f) => ({ ...f, requestedDate: e.target.value }))}
        />
        {errors.requestedDate && <p className={errorClass}>{errors.requestedDate}</p>}
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          rows={3}
          className={inputClass}
          placeholder="Additional instructions or context…"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Submitting…' : 'Request Valuation'}
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
