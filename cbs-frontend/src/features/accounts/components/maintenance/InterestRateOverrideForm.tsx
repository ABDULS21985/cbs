import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared';
import { accountMaintenanceApi, type InterestRateOverrideRequest } from '../../api/accountMaintenanceApi';

const schema = z.object({
  overrideRate: z
    .string()
    .min(1, 'Override rate is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 100, 'Rate must be between 0 and 100'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
}).refine((d) => d.expiryDate > d.effectiveDate, {
  message: 'Expiry date must be after effective date',
  path: ['expiryDate'],
});

type FormValues = z.infer<typeof schema>;

interface InterestRateOverrideFormProps {
  accountId: string;
  currentRate: number;
  onSuccess: () => void;
}

export function InterestRateOverrideForm({ accountId, currentRate, onSuccess }: InterestRateOverrideFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingData, setPendingData] = useState<InterestRateOverrideRequest | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      effectiveDate: today,
      expiryDate: sixMonthsLater,
    },
  });

  const overrideRateValue = watch('overrideRate');

  const onSubmit = (values: FormValues) => {
    setPendingData({
      overrideRate: parseFloat(values.overrideRate),
      reason: values.reason,
      effectiveDate: values.effectiveDate,
      expiryDate: values.expiryDate,
    });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingData) return;
    setSubmitting(true);
    try {
      await accountMaintenanceApi.overrideInterestRate(accountId, pendingData);
      toast.success('Interest rate override submitted for approval');
      setConfirmOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit interest rate override');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Manager approval notice */}
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Interest rate overrides require manager approval before taking effect.
          </p>
        </div>

        {/* Current rate display */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">Current Rate</span>
          <span className="text-lg font-semibold tabular-nums">{currentRate.toFixed(2)}%</span>
        </div>

        {/* Override rate */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Override Rate (%) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('overrideRate')}
              placeholder="e.g. 8.50"
              className="w-full pr-10 px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          {errors.overrideRate && <p className="text-xs text-red-500 mt-1">{errors.overrideRate.message}</p>}
          {overrideRateValue && !errors.overrideRate && (
            <p className="text-xs text-muted-foreground mt-1">
              Change: {currentRate.toFixed(2)}% → {parseFloat(overrideRateValue).toFixed(2)}%
              {parseFloat(overrideRateValue) > currentRate
                ? <span className="text-green-600"> (+{(parseFloat(overrideRateValue) - currentRate).toFixed(2)}%)</span>
                : <span className="text-red-500"> ({(parseFloat(overrideRateValue) - currentRate).toFixed(2)}%)</span>}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('effectiveDate')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('expiryDate')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder="Provide business justification for the rate override…"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Submit Override Request
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Interest Rate Override"
        description={`You are requesting an interest rate change from ${currentRate.toFixed(2)}% to ${pendingData?.overrideRate.toFixed(2)}%. This will be sent to a manager for approval.`}
        confirmLabel="Submit for Approval"
        variant="default"
        isLoading={submitting}
      />
    </>
  );
}
