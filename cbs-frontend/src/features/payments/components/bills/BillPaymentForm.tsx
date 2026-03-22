import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '@/components/shared/FormSection';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { formatMoney } from '@/lib/formatters';
import { billPaymentApi, type Biller, type BillValidationResult, type BillPaymentResponse } from '../../api/billPaymentApi';
import { useAccounts } from '../../hooks/useTransfer';

interface Props {
  biller: Biller;
  onSuccess: (result: BillPaymentResponse) => void;
  onBack: () => void;
}

export function BillPaymentForm({ biller, onSuccess, onBack }: Props) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState(biller.isFixedAmount ? biller.fixedAmount || 0 : 0);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [validation, setValidation] = useState<BillValidationResult | null>(null);
  const [saveFavorite, setSaveFavorite] = useState(false);
  const { data: accounts = [] } = useAccounts();

  const validateMutation = useMutation({
    mutationFn: () => billPaymentApi.validateReference(biller.code, fields),
    onSuccess: (result) => setValidation(result),
    onError: () => toast.error('Validation failed'),
  });

  const payMutation = useMutation({
    mutationFn: () => billPaymentApi.payBill({
      billerId: biller.id,
      billerCode: biller.code,
      sourceAccountId: Number(sourceAccountId),
      amount,
      fields,
      saveFavorite,
    }),
    onSuccess: (result) => {
      toast.success('Payment successful');
      onSuccess(result);
    },
    onError: () => toast.error('Payment failed'),
  });

  return (
    <div className="max-w-lg space-y-6">
      <FormSection title={biller.name}>
        <div className="space-y-4">
          {/* Dynamic fields */}
          {biller.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
              {field.type === 'SELECT' ? (
                <select
                  value={fields[field.name] || ''}
                  onChange={(e) => setFields({ ...fields, [field.name]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type={field.type === 'NUMBER' ? 'number' : 'text'}
                  value={fields[field.name] || ''}
                  onChange={(e) => setFields({ ...fields, [field.name]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required={field.required}
                />
              )}
            </div>
          ))}

          {/* Validate button */}
          <button
            type="button"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
          >
            {validateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Validate
          </button>

          {validation?.referenceValid && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">{validation.customerName}</span>
                {validation.outstandingBalance != null && (
                  <p className="text-xs text-green-600">Outstanding: {formatMoney(validation.outstandingBalance, 'NGN')}</p>
                )}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
            <MoneyInput value={amount} onChange={setAmount} currency="NGN" />
          </div>

          {/* Source account */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Source Account</label>
            <select value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.accountNumber} — {a.accountName} ({a.currency})</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saveFavorite} onChange={(e) => setSaveFavorite(e.target.checked)} className="rounded" />
            Save as favorite
          </label>
        </div>
      </FormSection>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="px-4 py-2.5 border rounded-md text-sm hover:bg-muted">&larr; Back</button>
        <button type="button" onClick={() => payMutation.mutate()} disabled={!amount || !sourceAccountId || payMutation.isPending} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {payMutation.isPending ? 'Processing...' : `Pay ${formatMoney(amount, 'NGN')}`}
        </button>
      </div>
    </div>
  );
}
