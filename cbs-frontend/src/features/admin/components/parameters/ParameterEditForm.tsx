import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog, FormSection } from '@/components/shared';
import { parameterApi } from '../../api/parameterApi';
import { ParameterAuditTrail } from './ParameterAuditTrail';
import type { SystemParameter } from '../../api/parameterApi';

interface ParameterEditFormProps {
  parameter: SystemParameter | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = z.object({
  value: z.string().min(1, 'Value is required'),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)'),
});

type FormValues = z.infer<typeof schema>;

export function ParameterEditForm({ parameter, open, onClose, onSuccess }: ParameterEditFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ['parameter-history', parameter?.code],
    queryFn: () => parameterApi.getParameterHistory(parameter!.code),
    enabled: !!parameter?.code && open,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      parameterApi.updateParameter(parameter!.code, values),
    onSuccess: () => {
      toast.success('Parameter updated successfully');
      queryClient.invalidateQueries({ queryKey: ['parameters'] });
      queryClient.invalidateQueries({ queryKey: ['parameter-history', parameter?.code] });
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to update parameter');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { value: parameter?.value ?? '', reason: '' },
  });

  useEffect(() => {
    if (parameter) {
      reset({ value: parameter.value, reason: '' });
    }
  }, [parameter, reset]);

  if (!open || !parameter) return null;

  const onSubmit = (values: FormValues) => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (pendingValues) {
      await mutation.mutateAsync(pendingValues);
    }
    setConfirmOpen(false);
    setPendingValues(null);
  };

  const currentValue = watch('value');

  const renderValueEditor = () => {
    switch (parameter.type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setValue('value', currentValue === 'true' ? 'false' : 'true')}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
                currentValue === 'true' ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  currentValue === 'true' ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
            <span className="text-sm font-medium">{currentValue === 'true' ? 'Enabled' : 'Disabled'}</span>
            <input type="hidden" {...register('value')} />
          </div>
        );

      case 'NUMBER':
        return (
          <div className="space-y-1">
            <input
              type="number"
              {...register('value')}
              min={parameter.minValue}
              max={parameter.maxValue}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {(parameter.minValue !== undefined || parameter.maxValue !== undefined) && (
              <p className="text-xs text-muted-foreground">
                Range:{' '}
                {parameter.minValue !== undefined ? parameter.minValue.toLocaleString() : '—'} to{' '}
                {parameter.maxValue !== undefined ? parameter.maxValue.toLocaleString() : 'unlimited'}
              </p>
            )}
          </div>
        );

      case 'JSON':
        return (
          <div className="space-y-1">
            <textarea
              {...register('value')}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground">Must be valid JSON.</p>
          </div>
        );

      case 'DATE':
        return (
          <input
            type="date"
            {...register('value')}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        );

      case 'TIME':
        return (
          <div className="space-y-1">
            <input
              type="time"
              {...register('value')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground">Format: HH:MM (24-hour)</p>
          </div>
        );

      default:
        return (
          <div className="space-y-1">
            <input
              type="text"
              {...register('value')}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {parameter.regexPattern && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Pattern: <code className="font-mono text-xs">{parameter.regexPattern}</code>
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-base font-semibold">Edit System Parameter</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Changes take effect immediately unless approval is required</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</label>
                  <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm font-mono text-muted-foreground">
                    {parameter.code}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                  <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm font-mono text-muted-foreground">
                    {parameter.type}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                  {parameter.name}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                  {parameter.description}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Current Value</label>
                {renderValueEditor()}
                {errors.value && (
                  <p className="text-xs text-red-500">{errors.value.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('reason')}
                  rows={3}
                  placeholder="Describe the reason for this change (required for audit trail)"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                {errors.reason && (
                  <p className="text-xs text-red-500">{errors.reason.message}</p>
                )}
              </div>

              {parameter.requiresApproval && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Maker-Checker Required</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      This parameter requires a second approval before the change is applied. Your submission will be queued for review.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 pb-4 flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {parameter.requiresApproval ? 'Submit for Approval' : 'Save Changes'}
              </button>
            </div>
          </form>

          {history.length > 0 && (
            <div className="px-6 pb-6 border-t pt-5">
              <FormSection title="Change History" collapsible defaultOpen={false}>
                <ParameterAuditTrail history={history} />
              </FormSection>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={parameter.requiresApproval ? 'Submit Parameter Change for Approval?' : 'Confirm Parameter Update'}
        description={
          parameter.requiresApproval
            ? `You are submitting a change to "${parameter.name}". This will be sent for approval before taking effect.`
            : `You are about to change "${parameter.name}". This change will take effect immediately.`
        }
        confirmLabel={parameter.requiresApproval ? 'Submit for Approval' : 'Confirm Update'}
        isLoading={mutation.isPending}
      />
    </>
  );
}
