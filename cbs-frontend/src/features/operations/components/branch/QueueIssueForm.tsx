import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '@/components/shared';
import { branchOpsApi, type QueueTicket } from '../../api/branchOpsApi';

interface QueueIssueFormProps {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (ticket: QueueTicket) => void;
}

const SERVICE_TYPES = [
  'Cash Deposit',
  'Cash Withdrawal',
  'Account Opening',
  'Enquiry',
  'Account Maintenance',
  'Loan',
  'FX',
  'Other',
];

const schema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  priority: z.enum(['NORMAL', 'PRIORITY', 'VIP']),
  customerName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function QueueIssueForm({ branchId, open, onClose, onSuccess }: QueueIssueFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: '', priority: 'NORMAL', customerName: '' },
  });

  const watchedPriority = useWatch({ control, name: 'priority' });

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const ticket = await branchOpsApi.issueTicket(
        branchId,
        values.serviceType,
        values.priority,
        values.customerName || undefined,
      );
      toast.success(
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Ticket Issued: {ticket.ticketNumber}</div>
            <div className="text-sm opacity-80">{ticket.serviceType} · {ticket.priority}</div>
          </div>
        </div>,
        { duration: 5000 },
      );
      onSuccess(ticket);
      reset();
      onClose();
    } catch {
      toast.error('Failed to issue ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Issue Queue Ticket</h2>
              <p className="text-sm text-muted-foreground">Add a customer to the queue</p>
            </div>
            <button type="button" onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <FormSection title="Service Details">
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('serviceType')}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select service type...</option>
                    {SERVICE_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.serviceType && (
                    <p className="text-xs text-red-500 mt-1">{errors.serviceType.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {(['NORMAL', 'PRIORITY', 'VIP'] as const).map((p) => {
                      const isSelected = watchedPriority === p;
                      const activeStyle = p === 'NORMAL'
                        ? 'bg-gray-100 border-gray-400 text-gray-700'
                        : p === 'PRIORITY'
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-amber-50 border-amber-400 text-amber-700';
                      return (
                        <label key={p} className="flex-1 cursor-pointer">
                          <input {...register('priority')} type="radio" value={p} className="sr-only" />
                          <span className={cn(
                            'block text-center py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-muted',
                            isSelected ? activeStyle : 'border-border',
                          )}>
                            {p}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Customer Name <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    {...register('customerName')}
                    type="text"
                    placeholder="e.g. Chukwuemeka Obi"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </FormSection>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Issue Ticket
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
