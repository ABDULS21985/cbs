import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Info, AlertTriangle, ArrowRight } from 'lucide-react';
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
    queryKey: ['parameter-history', parameter?.paramKey],
    queryFn: () => parameterApi.getParameterHistory(parameter!.paramKey),
    enabled: !!parameter?.paramKey && open,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      parameterApi.updateParameter(parameter!.paramKey, values),
    onSuccess: () => {
      toast.success('Parameter updated successfully');
      queryClient.invalidateQueries({ queryKey: ['parameters'] });
      queryClient.invalidateQueries({ queryKey: ['parameter-history', parameter?.paramKey] });
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
    defaultValues: { value: parameter?.paramValue ?? '', reason: '' },
  });

  useEffect(() => {
    if (parameter) {
      reset({ value: parameter.paramValue, reason: '' });
    }
  }, [parameter, reset]);

  if (!open || !parameter) return null;

  const requiresApproval = parameter.approvalStatus === 'PENDING_APPROVAL';

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
  const hasChanged = currentValue !== parameter.paramValue;

  const renderValueEditor = () => {
    switch (parameter.valueType) {
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

      case 'INTEGER':
      case 'DECIMAL':
        return (
          <input
            type="number"
            step={parameter.valueType === 'DECIMAL' ? '0.01' : '1'}
            {...register('value')}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
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

      default:
        return (
          <input
            type="text"
            {...register('value')}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
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
              <p className="text-xs text-muted-foreground mt-0.5">Changes are persisted to the database immediately</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key</label>
                  <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm font-mono text-muted-foreground">
                    {parameter.paramKey}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</label>
                  <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm font-mono text-muted-foreground">
                    {parameter.valueType}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                <div className="px-3 py-2 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                  {parameter.description ?? 'No description'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide">Current Value</label>
                {renderValueEditor()}
                {errors.value && <p className="text-xs text-red-500">{errors.value.message}</p>}
              </div>

              {/* Diff preview */}
              {hasChanged && (
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview Change</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded line-through max-w-[200px] truncate">
                      {parameter.paramValue}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-mono bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded max-w-[200px] truncate">
                      {currentValue}
                    </span>
                  </div>
                </div>
              )}

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
                {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
              </div>

              {requiresApproval && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Maker-Checker Required</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      This parameter requires a second approval before the change is applied.
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
                disabled={!hasChanged}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save Changes
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
        title="Confirm Parameter Update"
        description={`You are about to change "${parameter.paramKey}". This change will be persisted to the database.`}
        confirmLabel="Confirm Update"
        isLoading={mutation.isPending}
      />
    </>
  );
}
