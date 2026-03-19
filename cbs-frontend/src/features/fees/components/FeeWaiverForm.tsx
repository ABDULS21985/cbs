import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeeCharge } from '../api/feeApi';

const waiverSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  reason: z.string().min(10, 'Please provide a detailed reason (min 10 characters)'),
  requestedBy: z.string().min(2, 'Requestor name is required'),
});

type WaiverFormValues = z.infer<typeof waiverSchema>;

interface FeeWaiverFormProps {
  charge: FeeCharge;
  onSubmit: (data: WaiverFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const labelCls = 'block text-sm font-medium mb-1';
const inputCls = (disabled?: boolean) =>
  cn(
    'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors',
    disabled && 'bg-muted cursor-not-allowed opacity-70',
  );
const errorCls = 'mt-1 text-xs text-destructive';

export function FeeWaiverForm({ charge, onSubmit, onCancel, isSubmitting }: FeeWaiverFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaiverFormValues>({
    resolver: zodResolver(waiverSchema),
    defaultValues: {
      amount: charge.amount + charge.vatAmount,
      reason: '',
      requestedBy: '',
    },
  });

  return (
    <div className="bg-card rounded-xl shadow-2xl border p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Request Fee Waiver</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Submit waiver request for review and approval
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Charge Reference */}
      <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Charge Reference</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Fee:</span>
          <span className="font-medium">{charge.feeName}</span>
          <span className="text-muted-foreground">Account:</span>
          <span className="font-mono">{charge.accountNumber}</span>
          <span className="text-muted-foreground">Customer:</span>
          <span>{charge.customerName}</span>
          <span className="text-muted-foreground">Charge Amount:</span>
          <span className="font-medium">
            ₦{charge.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-muted-foreground">VAT Amount:</span>
          <span>
            ₦{charge.vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold text-primary">
            ₦{(charge.amount + charge.vatAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
          {charge.transactionRef && (
            <>
              <span className="text-muted-foreground">Ref:</span>
              <span className="font-mono text-xs">{charge.transactionRef}</span>
            </>
          )}
        </div>
      </div>

      {/* Waiver Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelCls}>Amount to Waive (₦) *</label>
          <input
            type="number"
            min={0}
            step={0.01}
            max={charge.amount + charge.vatAmount}
            {...register('amount', { valueAsNumber: true })}
            className={inputCls()}
          />
          {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Maximum waivable: ₦{(charge.amount + charge.vatAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div>
          <label className={labelCls}>Requested By *</label>
          <input
            {...register('requestedBy')}
            placeholder="Full name of requesting officer"
            className={inputCls()}
          />
          {errors.requestedBy && <p className={errorCls}>{errors.requestedBy.message}</p>}
        </div>

        <div>
          <label className={labelCls}>Waiver Reason *</label>
          <textarea
            {...register('reason')}
            rows={4}
            placeholder="Provide detailed justification for this waiver request..."
            className={cn(inputCls(), 'resize-none')}
          />
          {errors.reason && <p className={errorCls}>{errors.reason.message}</p>}
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Waiver Request
          </button>
        </div>
      </form>
    </div>
  );
}
