import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  autoDebitEnabled: z.boolean(),
  autoDebitAmount: z.coerce.number().min(100, 'Minimum amount is 100'),
  autoDebitFrequency: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
  autoDebitAccountId: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AutoDebitConfigFormProps {
  config?: {
    autoDebitEnabled: boolean;
    autoDebitAmount: number | null;
    autoDebitFrequency: string | null;
    accountId: number;
  };
  onSave: (config: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AutoDebitConfigForm({ config, onSave, onCancel, isLoading }: AutoDebitConfigFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      autoDebitEnabled: config?.autoDebitEnabled ?? true,
      autoDebitAmount: config?.autoDebitAmount ?? 0,
      autoDebitFrequency: (config?.autoDebitFrequency as FormValues['autoDebitFrequency']) ?? 'MONTHLY',
      autoDebitAccountId: config?.accountId,
    },
  });

  const enabled = watch('autoDebitEnabled');

  async function onSubmit(values: FormValues) {
    await onSave(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold mb-1">
        <Zap className="w-4 h-4 text-primary" />
        Auto-Debit Configuration
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Debit Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              {...register('autoDebitAmount')}
              placeholder="50,000"
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                errors.autoDebitAmount && 'border-red-500',
              )}
            />
          </div>
          {errors.autoDebitAmount && <p className="text-xs text-red-500 mt-0.5">{errors.autoDebitAmount.message}</p>}
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select
            {...register('autoDebitFrequency')}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
              errors.autoDebitFrequency && 'border-red-500',
            )}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BI_WEEKLY">Bi-Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          {errors.autoDebitFrequency && <p className="text-xs text-red-500 mt-0.5">{errors.autoDebitFrequency.message}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Configuration
        </button>
      </div>
    </form>
  );
}
