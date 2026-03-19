import { useState } from 'react';
import { useSubmitDrawdown } from '../../hooks/useFacilities';

interface DrawdownRequestFormProps {
  facilityId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DRAWDOWN_TYPES = [
  { value: 'OVERDRAFT', label: 'Overdraft' },
  { value: 'TERM_LOAN', label: 'Term Loan' },
  { value: 'BANK_GUARANTEE', label: 'Bank Guarantee' },
  { value: 'LETTER_OF_CREDIT', label: 'Letter of Credit' },
  { value: 'IMPORT_FINANCE', label: 'Import Finance' },
];

export function DrawdownRequestForm({ facilityId, onSuccess, onCancel }: DrawdownRequestFormProps) {
  const { mutate: submitDrawdown, isPending } = useSubmitDrawdown();

  const [form, setForm] = useState({
    amount: '',
    type: '',
    rate: '',
    maturityDate: '',
    purpose: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Amount must be greater than 0';
    if (!form.type) errs.type = 'Type is required';
    if (!form.rate || Number(form.rate) <= 0) errs.rate = 'Rate must be greater than 0';
    if (!form.maturityDate) errs.maturityDate = 'Maturity date is required';
    if (!form.purpose.trim()) errs.purpose = 'Purpose is required';
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
    submitDrawdown(
      {
        facilityId,
        amount: Number(form.amount),
        type: form.type,
        rate: Number(form.rate),
        maturityDate: form.maturityDate,
        purpose: form.purpose,
      },
      {
        onSuccess: () => {
          setForm({ amount: '', type: '', rate: '', maturityDate: '', purpose: '' });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Amount (₦) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="any"
            className={inputClass}
            placeholder="e.g. 5000000"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          {errors.amount && <p className={errorClass}>{errors.amount}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Type <span className="text-red-500">*</span>
          </label>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">Select type…</option>
            {DRAWDOWN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.type && <p className={errorClass}>{errors.type}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Rate (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            placeholder="e.g. 14.5"
            value={form.rate}
            onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
          />
          {errors.rate && <p className={errorClass}>{errors.rate}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Maturity Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            className={inputClass}
            value={form.maturityDate}
            onChange={(e) => setForm((f) => ({ ...f, maturityDate: e.target.value }))}
          />
          {errors.maturityDate && <p className={errorClass}>{errors.maturityDate}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Purpose <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          className={inputClass}
          placeholder="Describe the purpose of this drawdown…"
          value={form.purpose}
          onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
        />
        {errors.purpose && <p className={errorClass}>{errors.purpose}</p>}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Submitting…' : 'Submit Drawdown Request'}
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
