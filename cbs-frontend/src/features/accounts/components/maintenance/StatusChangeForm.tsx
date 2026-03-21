import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { StatusBadge, ConfirmDialog } from '@/components/shared';
import { accountMaintenanceApi, type StatusChangeRequest } from '../../api/accountMaintenanceApi';

const STATUS_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  PENDING_ACTIVATION: [
    { value: 'ACTIVE', label: 'Activate' },
  ],
  ACTIVE: [
    { value: 'DORMANT', label: 'Dormant' },
    { value: 'FROZEN', label: 'Frozen' },
    { value: 'PND_DEBIT', label: 'Post No Debit' },
    { value: 'PND_CREDIT', label: 'Post No Credit' },
    { value: 'CLOSED', label: 'Closed' },
  ],
  DORMANT: [
    { value: 'ACTIVE', label: 'Reactivate' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'ESCHEAT', label: 'Escheat' },
  ],
  FROZEN: [
    { value: 'ACTIVE', label: 'Unfreeze' },
    { value: 'CLOSED', label: 'Closed' },
  ],
  PND_DEBIT: [
    { value: 'ACTIVE', label: 'Remove Restriction' },
  ],
  PND_CREDIT: [
    { value: 'ACTIVE', label: 'Remove Restriction' },
  ],
};

const schema = z.object({
  newStatus: z.string().min(1, 'Please select a new status'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  authorizerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface StatusChangeFormProps {
  accountId: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function StatusChangeForm({ accountId, currentStatus, onSuccess }: StatusChangeFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingData, setPendingData] = useState<StatusChangeRequest | null>(null);

  const availableTransitions = STATUS_TRANSITIONS[currentStatus] ?? [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      effectiveDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedStatus = watch('newStatus');

  const onSubmit = (values: FormValues) => {
    setPendingData(values as StatusChangeRequest);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingData) return;
    setSubmitting(true);
    try {
      await accountMaintenanceApi.changeStatus(accountId, pendingData);
      toast.success('Account status updated successfully');
      setConfirmOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update account status');
    } finally {
      setSubmitting(false);
    }
  };

  const isDestructive = selectedStatus === 'CLOSED' || selectedStatus === 'FROZEN';

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">Current Status:</span>
          <StatusBadge status={currentStatus} dot />
        </div>

        {availableTransitions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No status transitions are available for accounts in <strong>{currentStatus}</strong> state.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                {...register('newStatus')}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select new status…</option>
                {availableTransitions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {errors.newStatus && <p className="text-xs text-red-500 mt-1">{errors.newStatus.message}</p>}
            </div>

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
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason')}
                rows={3}
                placeholder="Provide a detailed reason for this status change…"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Authorizer ID <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                {...register('authorizerId')}
                placeholder="Enter authorizer employee ID"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Apply Status Change
              </button>
            </div>
          </>
        )}
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Status Change"
        description={`You are about to change this account's status from ${currentStatus} to ${selectedStatus}. This action will take effect immediately. Are you sure?`}
        confirmLabel="Yes, Change Status"
        variant={isDestructive ? 'destructive' : 'default'}
        isLoading={submitting}
      />
    </>
  );
}
