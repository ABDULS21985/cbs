import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator } from 'lucide-react';
import { differenceInMonths, parseISO } from 'date-fns';
import { formatMoney } from '@/lib/formatters';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const schema = z.object({
  targetAmount: z.coerce.number().min(1, 'Enter a target amount'),
  targetDate: z.string().min(1, 'Pick a target date'),
});

type FormValues = z.infer<typeof schema>;

interface SavingsCalculatorProps {
  targetAmount?: number;
  targetDate?: string;
  onCalculated?: (monthlyAmount: number) => void;
  readOnly?: boolean;
}

export function SavingsCalculator({ targetAmount, targetDate, onCalculated, readOnly = false }: SavingsCalculatorProps) {
  const [result, setResult] = useState<{ monthly: number; months: number; targetDate: string; targetAmount: number } | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetAmount: targetAmount ?? undefined,
      targetDate: targetDate ?? '',
    },
  });

  const watchedAmount = watch('targetAmount');
  const watchedDate = watch('targetDate');

  // Auto-calculate when in readOnly mode (values passed from parent)
  useEffect(() => {
    if (readOnly && targetAmount && targetDate) {
      calculate(targetAmount, targetDate);
    }
  }, [targetAmount, targetDate, readOnly]);

  function calculate(amount: number, date: string) {
    const today = new Date();
    const target = parseISO(date);
    const months = Math.max(differenceInMonths(target, today), 1);
    const monthly = Math.ceil(amount / months);
    const res = { monthly, months, targetDate: date, targetAmount: amount };
    setResult(res);
    onCalculated?.(monthly);
  }

  function onSubmit(values: FormValues) {
    calculate(values.targetAmount, values.targetDate);
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="w-4 h-4 text-primary" />
        Savings Calculator
      </div>

      {!readOnly && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target Amount (₦)</label>
              <input
                type="number"
                {...register('targetAmount')}
                placeholder="e.g. 5000000"
                className={cn(
                  'mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                  errors.targetAmount && 'border-red-500',
                )}
              />
              {errors.targetAmount && <p className="text-xs text-red-500 mt-0.5">{errors.targetAmount.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target Date</label>
              <input
                type="date"
                {...register('targetDate')}
                min={new Date().toISOString().split('T')[0]}
                className={cn(
                  'mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                  errors.targetDate && 'border-red-500',
                )}
              />
              {errors.targetDate && <p className="text-xs text-red-500 mt-0.5">{errors.targetDate.message}</p>}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Calculate
          </button>
        </form>
      )}

      {result && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">To reach</p>
          <p className="text-xl font-bold text-primary">{formatMoney(result.targetAmount)}</p>
          <p className="text-xs text-muted-foreground">by {formatDate(result.targetDate)}, you need to save</p>
          <p className="text-2xl font-extrabold">{formatMoney(result.monthly)}</p>
          <p className="text-xs text-muted-foreground font-medium">per month for {result.months} month{result.months !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}
