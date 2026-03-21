import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared';
import { accountMaintenanceApi, type OfficerChangeRequest } from '../../api/accountMaintenanceApi';

const schema = z.object({
  officerId: z.string().min(1, 'Officer ID is required'),
  officerName: z.string().min(2, 'Officer name is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
});

type FormValues = z.infer<typeof schema>;

interface OfficerChangeFormProps {
  accountId: string;
  currentOfficer: string;
  onSuccess: () => void;
}

export function OfficerChangeForm({ accountId, currentOfficer, onSuccess }: OfficerChangeFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingData, setPendingData] = useState<OfficerChangeRequest | null>(null);

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

  const newOfficerName = watch('officerName');

  const onSubmit = (values: FormValues) => {
    setPendingData(values as OfficerChangeRequest);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingData) return;
    setSubmitting(true);
    try {
      await accountMaintenanceApi.changeAccountOfficer(accountId, pendingData);
      toast.success('Account officer updated successfully');
      setConfirmOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update account officer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Current officer */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
          <UserCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Current Account Officer</p>
            <p className="text-sm font-semibold">{currentOfficer || 'Not assigned'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              New Officer ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('officerId')}
              placeholder="e.g. EMP-00234"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.officerId && <p className="text-xs text-red-500 mt-1">{errors.officerId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              New Officer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('officerName')}
              placeholder="Full name of new officer"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.officerName && <p className="text-xs text-red-500 mt-1">{errors.officerName.message}</p>}
          </div>
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
            placeholder="Reason for changing the account officer…"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Change Account Officer
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Officer Change"
        description={`You are reassigning this account from ${currentOfficer} to ${newOfficerName || 'the new officer'}. This will take effect on the specified date.`}
        confirmLabel="Confirm Reassignment"
        variant="default"
        isLoading={submitting}
      />
    </>
  );
}
