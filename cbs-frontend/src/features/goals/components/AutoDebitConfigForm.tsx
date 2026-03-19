import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AutoDebitConfig } from '../api/goalApi';

const schema = z.object({
  amount: z.coerce.number().min(100, 'Minimum amount is ₦100'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  startDate: z.string().min(1, 'Start date is required'),
  status: z.enum(['ACTIVE', 'PAUSED']),
});

type FormValues = z.infer<typeof schema>;

interface AutoDebitConfigFormProps {
  config?: AutoDebitConfig;
  onSave: (config: AutoDebitConfig) => void | Promise<void>;
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
      amount: config?.amount ?? 0,
      frequency: config?.frequency ?? 'MONTHLY',
      startDate: config?.startDate ?? new Date().toISOString().split('T')[0],
      status: config?.status ?? 'ACTIVE',
    },
  });

  const status = watch('status');

  async function onSubmit(values: FormValues) {
    await onSave(values as AutoDebitConfig);
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₦</span>
            <input
              type="number"
              {...register('amount')}
              placeholder="50,000"
              className={cn(
                'w-full rounded-lg border bg-background pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                errors.amount && 'border-red-500',
              )}
            />
          </div>
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select
            {...register('frequency')}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
              errors.frequency && 'border-red-500',
            )}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          {errors.frequency && <p className="text-xs text-red-500 mt-0.5">{errors.frequency.message}</p>}
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('startDate')}
            min={new Date().toISOString().split('T')[0]}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
              errors.startDate && 'border-red-500',
            )}
          />
          {errors.startDate && <p className="text-xs text-red-500 mt-0.5">{errors.startDate.message}</p>}
        </div>

        {/* Status toggle */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <div className="flex items-center gap-3 pt-1.5">
            <button
              type="button"
              onClick={() => setValue('status', 'ACTIVE')}
              className={cn(
                'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                status === 'ACTIVE'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setValue('status', 'PAUSED')}
              className={cn(
                'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                status === 'PAUSED'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              Paused
            </button>
          </div>
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
