import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashPoolParticipant } from '../../api/cashPoolApi';

const sweepConfigSchema = z.object({
  sweepDirection: z.enum(['BIDIRECTIONAL', 'INWARD', 'OUTWARD']),
  targetBalance: z.number({ required_error: 'Target balance is required' }).nonnegative('Must be 0 or positive'),
  priority: z.number().int().min(1, 'Must be at least 1').max(999, 'Must be at most 999'),
});

type SweepConfigFormData = z.infer<typeof sweepConfigSchema>;

interface SweepConfigFormProps {
  participant: CashPoolParticipant;
  onSave: (data: Partial<CashPoolParticipant>) => void;
  onCancel: () => void;
}

const SWEEP_DIR_INFO: Record<string, { label: string; description: string }> = {
  BIDIRECTIONAL: {
    label: 'Bidirectional',
    description: 'Funds sweep in both directions between the participant and header account.',
  },
  INWARD: {
    label: 'Inward (Concentrate)',
    description: 'Funds sweep from participant to the header account only.',
  },
  OUTWARD: {
    label: 'Outward (Distribute)',
    description: 'Funds sweep from header account to the participant only.',
  },
};

export function SweepConfigForm({ participant, onSave, onCancel }: SweepConfigFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SweepConfigFormData>({
    resolver: zodResolver(sweepConfigSchema),
    defaultValues: {
      sweepDirection: (participant.sweepDirection as 'BIDIRECTIONAL' | 'INWARD' | 'OUTWARD') || 'BIDIRECTIONAL',
      targetBalance: participant.targetBalance || 0,
      priority: participant.priority || 100,
    },
  });

  const sweepDirection = watch('sweepDirection');

  const onSubmit = (data: SweepConfigFormData) => {
    onSave({
      sweepDirection: data.sweepDirection,
      targetBalance: data.targetBalance,
      priority: data.priority,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Account info */}
      <div className="rounded-lg bg-muted/50 px-4 py-3">
        <div className="text-xs text-muted-foreground mb-0.5">Configuring</div>
        <div className="text-sm font-semibold">{participant.participantName}</div>
        <div className="font-mono text-xs text-muted-foreground">Account ID: {participant.accountId}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Role: <span className="font-semibold text-foreground">{participant.participantRole}</span>
        </div>
      </div>

      {/* Sweep direction */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Sweep Direction</label>
        <div className="space-y-2">
          {(['BIDIRECTIONAL', 'INWARD', 'OUTWARD'] as const).map((dir) => {
            const info = SWEEP_DIR_INFO[dir];
            const isSelected = sweepDirection === dir;
            return (
              <label
                key={dir}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  value={dir}
                  {...register('sweepDirection')}
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
      </div>

      {/* Target balance */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Target Balance <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
            &#8358;
          </span>
          <input
            type="number"
            step="1000"
            min="0"
            {...register('targetBalance', { valueAsNumber: true })}
            placeholder="0.00"
            className={cn(
              'w-full pl-7 pr-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.targetBalance && 'border-red-500',
            )}
          />
        </div>
        {errors.targetBalance && (
          <p className="text-xs text-red-600">{errors.targetBalance.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Target balance to maintain in this participant account after sweeping.
        </p>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Priority</label>
        <input
          type="number"
          min="1"
          max="999"
          {...register('priority', { valueAsNumber: true })}
          className={cn(
            'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
            errors.priority && 'border-red-500',
          )}
        />
        {errors.priority && (
          <p className="text-xs text-red-600">{errors.priority.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Lower number = higher priority in sweep execution order.
        </p>
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
