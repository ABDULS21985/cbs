import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { chequeApi } from '../../api/chequeApi';
import { FormSection } from '@/components/shared';

const schema = z.object({
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits').max(10, 'Account number must be 10 digits'),
  accountId: z.string().min(1, 'Account ID is required'),
  leaves: z.coerce.number().refine((v) => [25, 50, 100].includes(v), 'Select a valid leaf count'),
  collectionBranch: z.string().min(2, 'Collection branch is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChequeBookRequestForm({ open, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leaves: 50 },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      chequeApi.requestChequeBook({
        accountId: values.accountId,
        accountNumber: values.accountNumber,
        leaves: values.leaves,
        collectionBranch: values.collectionBranch,
      }),
    onSuccess: () => {
      toast.success('Cheque book request submitted successfully');
      reset();
      onSuccess();
      onClose();
    },
    onError: () => {
      toast.error('Failed to submit cheque book request');
    },
  });

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Request Cheque Book</h2>
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="p-6 space-y-5">
            <FormSection title="Account Details">
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Account Number</label>
                  <input
                    {...register('accountNumber')}
                    placeholder="Enter 10-digit account number"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {errors.accountNumber && (
                    <p className="text-xs text-red-600 mt-1">{errors.accountNumber.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Account ID</label>
                  <input
                    {...register('accountId')}
                    placeholder="Enter account ID"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {errors.accountId && (
                    <p className="text-xs text-red-600 mt-1">{errors.accountId.message}</p>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection title="Cheque Book Details">
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Number of Leaves</label>
                  <select
                    {...register('leaves')}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value={25}>25 leaves</option>
                    <option value={50}>50 leaves</option>
                    <option value={100}>100 leaves</option>
                  </select>
                  {errors.leaves && (
                    <p className="text-xs text-red-600 mt-1">{errors.leaves.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Collection Branch</label>
                  <input
                    {...register('collectionBranch')}
                    placeholder="Enter branch name for collection"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {errors.collectionBranch && (
                    <p className="text-xs text-red-600 mt-1">{errors.collectionBranch.message}</p>
                  )}
                </div>
              </div>
            </FormSection>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
