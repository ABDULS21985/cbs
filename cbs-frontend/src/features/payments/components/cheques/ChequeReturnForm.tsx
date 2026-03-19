import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { chequeApi, type ClearingCheque, RETURN_REASON_CODES } from '../../api/chequeApi';
import { formatMoney } from '@/lib/formatters';

const schema = z.object({
  reasonCode: z.string().min(1, 'Please select a return reason'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  cheque: ClearingCheque | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChequeReturnForm({ cheque, open, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      chequeApi.returnCheque(cheque!.id, {
        reasonCode: values.reasonCode,
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.success(`Cheque #${cheque?.chequeNumber} has been returned`);
      reset();
      onSuccess();
      onClose();
    },
    onError: () => {
      toast.error('Failed to return cheque');
    },
  });

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  if (!open || !cheque) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Return Cheque</h2>
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="p-6 space-y-5">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cheque Number</span>
                <span className="font-mono font-medium">#{cheque.chequeNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drawer</span>
                <span className="font-medium">{cheque.drawerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono">{cheque.drawerAccount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-semibold text-red-700 dark:text-red-400">{formatMoney(cheque.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Presenting Bank</span>
                <span>{cheque.presentingBank}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Return Reason Code</label>
              <select
                {...register('reasonCode')}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select reason code...</option>
                {RETURN_REASON_CODES.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
              {errors.reasonCode && (
                <p className="text-xs text-red-600 mt-1">{errors.reasonCode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Notes <span className="text-muted-foreground">(optional)</span></label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Additional notes for the return..."
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="flex gap-3">
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {mutation.isPending ? 'Processing...' : 'Return Cheque'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
