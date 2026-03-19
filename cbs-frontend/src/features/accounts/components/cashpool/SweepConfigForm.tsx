import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import type { CashPoolParticipant } from '../../api/cashPoolApi';

const sweepConfigSchema = z.discriminatedUnion('sweepType', [
  z.object({
    sweepType: z.literal('ZBA'),
    frequency: z.enum(['REAL_TIME', 'EOD']),
    sweepThreshold: z.undefined().optional(),
    targetBalance: z.undefined().optional(),
  }),
  z.object({
    sweepType: z.literal('THRESHOLD'),
    frequency: z.enum(['REAL_TIME', 'EOD']),
    sweepThreshold: z.number({ required_error: 'Threshold amount is required' }).positive('Must be positive'),
    targetBalance: z.undefined().optional(),
  }),
  z.object({
    sweepType: z.literal('TARGET_BALANCE'),
    frequency: z.enum(['REAL_TIME', 'EOD']),
    sweepThreshold: z.undefined().optional(),
    targetBalance: z.number({ required_error: 'Target balance is required' }).nonnegative('Must be 0 or positive'),
  }),
]);

type SweepConfigFormData = z.infer<typeof sweepConfigSchema>;

interface SweepConfigFormProps {
  participant: CashPoolParticipant;
  onSave: (data: SweepConfigFormData) => void;
  onCancel: () => void;
}

const SWEEP_TYPE_INFO: Record<CashPoolParticipant['sweepType'], { label: string; description: string }> = {
  ZBA: {
    label: 'Zero Balance Arrangement (ZBA)',
    description: 'Sweeps the entire account balance to the header account, leaving a zero balance.',
  },
  THRESHOLD: {
    label: 'Threshold Sweep',
    description: 'Sweeps funds above a set threshold to the header account.',
  },
  TARGET_BALANCE: {
    label: 'Target Balance',
    description: 'Maintains a specified target balance; sweeps the excess to the header account.',
  },
};

export function SweepConfigForm({ participant, onSave, onCancel }: SweepConfigFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SweepConfigFormData>({
    resolver: zodResolver(sweepConfigSchema) as any,
    defaultValues: {
      sweepType: participant.sweepType,
      frequency: 'EOD',
      sweepThreshold: participant.sweepThreshold,
      targetBalance: participant.targetBalance,
    } as any,
  });

  const sweepType = watch('sweepType');

  const onSubmit = (data: SweepConfigFormData) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
      {/* Account info */}
      <div className="rounded-lg bg-muted/50 px-4 py-3">
        <div className="text-xs text-muted-foreground mb-0.5">Configuring</div>
        <div className="text-sm font-semibold">{participant.accountName}</div>
        <div className="font-mono text-xs text-muted-foreground">{participant.accountNumber}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Current Balance:{' '}
          <span className="font-semibold text-foreground">{formatMoney(participant.balance)}</span>
        </div>
      </div>

      {/* Sweep type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Sweep Type</label>
        <div className="space-y-2">
          {(['ZBA', 'THRESHOLD', 'TARGET_BALANCE'] as const).map((type) => {
            const info = SWEEP_TYPE_INFO[type];
            const isSelected = sweepType === type;
            return (
              <label
                key={type}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  value={type}
                  {...register('sweepType')}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{info.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{info.description}</div>
                </div>
              </label>
            );
          })}
        </div>
        {(errors as any).sweepType && (
          <p className="text-xs text-red-600">{(errors as any).sweepType.message}</p>
        )}
      </div>

      {/* Threshold amount — only for THRESHOLD */}
      {sweepType === 'THRESHOLD' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Threshold Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
              ₦
            </span>
            <input
              type="number"
              step="1000"
              min="0"
              {...register('sweepThreshold', { valueAsNumber: true })}
              placeholder="0.00"
              className={cn(
                'w-full pl-7 pr-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                (errors as any).sweepThreshold && 'border-red-500',
              )}
            />
          </div>
          {(errors as any).sweepThreshold && (
            <p className="text-xs text-red-600">{(errors as any).sweepThreshold.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Funds above this amount will be swept to the header account.
          </p>
        </div>
      )}

      {/* Target balance — only for TARGET_BALANCE */}
      {sweepType === 'TARGET_BALANCE' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Target Balance <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
              ₦
            </span>
            <input
              type="number"
              step="1000"
              min="0"
              {...register('targetBalance', { valueAsNumber: true })}
              placeholder="0.00"
              className={cn(
                'w-full pl-7 pr-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                (errors as any).targetBalance && 'border-red-500',
              )}
            />
          </div>
          {(errors as any).targetBalance && (
            <p className="text-xs text-red-600">{(errors as any).targetBalance.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This balance will be maintained; excess funds are swept to the header account.
          </p>
        </div>
      )}

      {/* Frequency */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Sweep Frequency</label>
        <div className="flex gap-2">
          {(['REAL_TIME', 'EOD'] as const).map((freq) => {
            const label = freq === 'REAL_TIME' ? 'Real-time' : 'End of Day (EOD)';
            return (
              <label
                key={freq}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors flex-1 justify-center',
                  watch('frequency') === freq
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  value={freq}
                  {...register('frequency')}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
        {(errors as any).frequency && (
          <p className="text-xs text-red-600">{(errors as any).frequency.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          <Settings2 className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </form>
  );
}
