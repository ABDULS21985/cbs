import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { FormSection } from '@/components/shared';
import { branchOpsApi, type StaffSchedule } from '../../api/branchOpsApi';

interface ShiftSwapFormProps {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = z.object({
  staffId1: z.string().min(1, 'Staff 1 is required'),
  staffId2: z.string().min(1, 'Staff 2 is required'),
  date1: z.string().min(1, 'Date 1 is required'),
  date2: z.string().min(1, 'Date 2 is required'),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)'),
}).refine((data) => data.staffId1 !== data.staffId2, {
  message: 'Staff members must be different',
  path: ['staffId2'],
});

type FormValues = z.infer<typeof schema>;

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export function ShiftSwapForm({ branchId, open, onClose, onSuccess }: ShiftSwapFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const weekOf = getMondayOf(new Date());

  const { data: scheduleData = [] } = useQuery<StaffSchedule[]>({
    queryKey: ['branches', branchId, 'schedule', weekOf],
    queryFn: () => branchOpsApi.getStaffSchedule(branchId, weekOf),
    enabled: open,
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      staffId1: '',
      staffId2: '',
      date1: getTodayStr(),
      date2: getTodayStr(),
      reason: '',
    },
  });

  const watchStaffId1 = watch('staffId1');
  const watchDate1 = watch('date1');
  const watchStaffId2 = watch('staffId2');
  const watchDate2 = watch('date2');

  const getShiftLabel = (staffId: string, date: string): string => {
    const staff = scheduleData.find((s) => s.staffId === staffId);
    if (!staff) return '—';
    return staff.schedule[date] ?? 'OFF';
  };

  if (!open) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await branchOpsApi.swapShift(branchId, {
        staffId1: values.staffId1,
        staffId2: values.staffId2,
        date1: values.date1,
        date2: values.date2,
        reason: values.reason,
      });
      toast.success('Shift swap request submitted successfully');
      onSuccess();
      reset();
      onClose();
    } catch {
      toast.error('Failed to submit shift swap request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Shift Swap Request</h2>
              <p className="text-sm text-muted-foreground">Swap shifts between two staff members</p>
            </div>
            <button type="button" onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <FormSection title="Swap Details">
              <div className="pt-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Staff Member 1 <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('staffId1')}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select staff...</option>
                      {scheduleData.map((s) => (
                        <option key={s.staffId} value={s.staffId}>{s.staffName}</option>
                      ))}
                    </select>
                    {errors.staffId1 && <p className="text-xs text-red-500 mt-1">{errors.staffId1.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Staff Member 2 <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('staffId2')}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select staff...</option>
                      {scheduleData.map((s) => (
                        <option key={s.staffId} value={s.staffId}>{s.staffName}</option>
                      ))}
                    </select>
                    {errors.staffId2 && <p className="text-xs text-red-500 mt-1">{errors.staffId2.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Date 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('date1')}
                      type="date"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {watchStaffId1 && watchDate1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: <span className="font-medium">{getShiftLabel(watchStaffId1, watchDate1)}</span>
                      </p>
                    )}
                    {errors.date1 && <p className="text-xs text-red-500 mt-1">{errors.date1.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Date 2 <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('date2')}
                      type="date"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {watchStaffId2 && watchDate2 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: <span className="font-medium">{getShiftLabel(watchStaffId2, watchDate2)}</span>
                      </p>
                    )}
                    {errors.date2 && <p className="text-xs text-red-500 mt-1">{errors.date2.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    placeholder="Explain the reason for the shift swap..."
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none"
                  />
                  {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
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
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                Submit Swap Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
