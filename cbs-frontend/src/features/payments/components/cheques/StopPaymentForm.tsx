import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Info, CheckCircle2 } from 'lucide-react';
import { chequeApi, type StopPayment } from '../../api/chequeApi';
import { ConfirmDialog } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';

const schema = z.object({
  accountNumber: z.string().min(10, 'Account number must be 10 digits').max(10, 'Account number must be 10 digits'),
  chequeFrom: z.coerce.number().min(1, 'Cheque number is required'),
  useRange: z.boolean(),
  chequeTo: z.coerce.number().optional(),
  reason: z.enum(['LOST', 'STOLEN', 'FRAUD', 'DISPUTE', 'CUSTOMER_REQUEST']),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.useRange && (!data.chequeTo || data.chequeTo < data.chequeFrom)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['chequeTo'],
      message: '"To" cheque number must be greater than or equal to "From"',
    });
  }
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess: () => void;
}

export function StopPaymentForm({ onSuccess }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [successResult, setSuccessResult] = useState<StopPayment | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { useRange: false, reason: 'LOST' },
  });

  const useRange = watch('useRange');

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      chequeApi.createStopPayment({
        accountId: `acc-${values.accountNumber}`,
        accountNumber: values.accountNumber,
        chequeFrom: values.chequeFrom,
        chequeTo: values.useRange ? values.chequeTo : undefined,
        reason: values.reason,
        notes: values.notes,
      }),
    onSuccess: (result) => {
      setSuccessResult(result);
      reset();
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to place stop payment');
    },
  });

  const onSubmit = (values: FormValues) => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingValues) return;
    setConfirmOpen(false);
    await mutation.mutateAsync(pendingValues);
  };

  if (successResult) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Stop Payment Placed</h3>
          <p className="text-sm text-muted-foreground mt-1">Your reference number is:</p>
          <p className="font-mono text-xl font-bold mt-1 text-primary">{successResult.reference}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 px-6 py-4 text-sm space-y-2 w-full max-w-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account</span>
            <span className="font-mono">{successResult.accountNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cheque</span>
            <span className="font-mono">
              {successResult.chequeFrom}
              {successResult.chequeTo ? ` – ${successResult.chequeTo}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee Charged</span>
            <span className="font-mono">{formatMoney(successResult.fee)}</span>
          </div>
        </div>
        <button
          onClick={() => setSuccessResult(null)}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Place Another Stop Payment
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
        <div>
          <label className="block text-sm font-medium mb-1.5">Account Number</label>
          <input
            {...register('accountNumber')}
            placeholder="Enter 10-digit account number"
            maxLength={10}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.accountNumber && (
            <p className="text-xs text-red-600 mt-1">{errors.accountNumber.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Cheque Number</label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                {...register('useRange')}
                className="rounded border accent-primary"
              />
              <span className="text-xs text-muted-foreground">Enable range</span>
            </label>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                {...register('chequeFrom')}
                type="number"
                placeholder="From"
                className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {errors.chequeFrom && (
                <p className="text-xs text-red-600 mt-1">{errors.chequeFrom.message}</p>
              )}
            </div>
            {useRange && (
              <div className="flex-1">
                <input
                  {...register('chequeTo')}
                  type="number"
                  placeholder="To"
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {errors.chequeTo && (
                  <p className="text-xs text-red-600 mt-1">{errors.chequeTo.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Reason</label>
          <select
            {...register('reason')}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="LOST">Lost</option>
            <option value="STOLEN">Stolen</option>
            <option value="FRAUD">Fraud</option>
            <option value="DISPUTE">Dispute</option>
            <option value="CUSTOMER_REQUEST">Customer Request</option>
          </select>
          {errors.reason && (
            <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notes <span className="text-muted-foreground">(optional)</span></label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Additional details about the stop payment request..."
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            A stop payment fee of <strong>₦1,000.00</strong> will be charged to the account upon submission.
          </p>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mutation.isPending ? 'Placing Stop Payment...' : 'Place Stop Payment'}
        </button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Stop Payment"
        description={`A fee of ₦1,000.00 will be charged to account ${pendingValues?.accountNumber}. This will stop cheque ${pendingValues?.chequeFrom}${pendingValues?.useRange && pendingValues?.chequeTo ? ` through ${pendingValues.chequeTo}` : ''}. Proceed?`}
        confirmLabel="Confirm & Place Stop"
        variant="destructive"
      />
    </>
  );
}
