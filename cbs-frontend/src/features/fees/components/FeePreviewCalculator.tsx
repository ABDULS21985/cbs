import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { previewCharge, type PreviewChargeResult } from '../api/feeApi';

const schema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  amount: z.number().min(0, 'Amount must be 0 or greater'),
});

type FormValues = z.infer<typeof schema>;

const EVENT_TYPES = [
  { value: 'ATM_WITHDRAWAL', label: 'ATM Withdrawal' },
  { value: 'TRANSFER', label: 'Interbank Transfer' },
  { value: 'ACCOUNT_MAINTENANCE', label: 'Account Maintenance' },
  { value: 'CARD_ISSUANCE', label: 'Card Issuance' },
  { value: 'LOAN_DISBURSEMENT', label: 'Loan Disbursement' },
  { value: 'LC_ISSUANCE', label: 'Letter of Credit Issuance' },
];

const MOCK_CUSTOMER_OPTIONS = [
  { value: 'cust-001', label: 'Amara Okonkwo' },
  { value: 'cust-002', label: 'TechVentures Nigeria Ltd' },
  { value: 'cust-003', label: 'Ibrahim Musa' },
  { value: 'cust-004', label: 'Chidi Enterprises' },
  { value: 'cust-005', label: 'Fatima Al-Hassan' },
];

const inputCls = cn(
  'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
);
const labelCls = 'block text-sm font-medium mb-1';
const errorCls = 'mt-1 text-xs text-destructive';

interface FeePreviewCalculatorProps {
  accountId?: string;
}

export function FeePreviewCalculator({ accountId }: FeePreviewCalculatorProps) {
  const [result, setResult] = useState<PreviewChargeResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: accountId ? 'cust-001' : '',
      eventType: '',
      amount: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await previewCharge(values.customerId, values.eventType, values.amount);
      setResult(res);
    } catch (err) {
      setError('Failed to calculate fees. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Fee Preview Calculator</h3>
          <p className="text-xs text-muted-foreground">Calculate applicable fees before transaction</p>
        </div>
      </div>

      <div className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer */}
            <div>
              <label className={labelCls}>Customer</label>
              <select {...register('customerId')} className={inputCls}>
                <option value="">Select customer...</option>
                {MOCK_CUSTOMER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.customerId && <p className={errorCls}>{errors.customerId.message}</p>}
            </div>

            {/* Event Type */}
            <div>
              <label className={labelCls}>Event Type</label>
              <select {...register('eventType')} className={inputCls}>
                <option value="">Select event...</option>
                {EVENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.eventType && <p className={errorCls}>{errors.eventType.message}</p>}
            </div>

            {/* Amount */}
            <div>
              <label className={labelCls}>Transaction Amount (₦)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
                className={inputCls}
              />
              {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCalculating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
              Calculate
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </form>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            <div className="h-px bg-border" />
            <div>
              <p className="text-sm font-semibold mb-3">Calculation Results</p>
              <div className="space-y-2">
                {result.applicableFees.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No applicable fees for this event type
                  </p>
                ) : (
                  result.applicableFees.map((fee) => (
                    <div key={fee.feeId} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{fee.feeName}</p>
                        <span className="text-sm font-semibold tabular-nums">
                          ₦{fee.calculatedAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        <span>{fee.breakdown}</span>
                      </div>
                      {fee.vatAmount > 0 && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>VAT</span>
                          <span>+ ₦{fee.vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {result.applicableFees.length > 0 && (
              <div className="rounded-xl border bg-primary/5 p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Fees</span>
                    <span className="tabular-nums">
                      ₦{result.totalFees.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total VAT</span>
                    <span className="tabular-nums">
                      ₦{result.totalVat.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total Charge</span>
                    <span className="text-base font-bold text-primary tabular-nums">
                      ₦{result.totalCharge.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
