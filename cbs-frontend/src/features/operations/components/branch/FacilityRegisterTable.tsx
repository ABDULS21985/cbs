import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Wrench, Calendar, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge, FormSection } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { branchOpsApi, type Facility } from '../../api/branchOpsApi';

interface FacilityRegisterTableProps {
  branchId: string;
}

const conditionStyles: Record<Facility['condition'], string> = {
  GOOD: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAIR: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  POOR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function isOverdue(date: string): boolean {
  return new Date(date) < new Date();
}

function isInsuranceExpiringSoon(date: string): boolean {
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

const addFacilitySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  condition: z.enum(['GOOD', 'FAIR', 'POOR']),
  lastInspection: z.string().min(1, 'Last inspection date is required'),
  nextInspectionDue: z.string().min(1, 'Next inspection date is required'),
  insuranceExpiry: z.string().min(1, 'Insurance expiry date is required'),
});

type AddFacilityValues = z.infer<typeof addFacilitySchema>;

const FACILITY_TYPES = [
  'Power Equipment', 'Banking Equipment', 'Security Equipment', 'HVAC', 'Safety Equipment',
  'IT Infrastructure', 'Furniture & Fixtures', 'Vehicle', 'Other',
];

interface AddFacilityDialogProps {
  branchId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddFacilityDialog({ branchId, open, onClose, onSuccess }: AddFacilityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddFacilityValues>({
    resolver: zodResolver(addFacilitySchema),
    defaultValues: { condition: 'GOOD' },
  });

  if (!open) return null;

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (values: AddFacilityValues) => {
    setIsSubmitting(true);
    try {
      await branchOpsApi.addFacility(branchId, values);
      toast.success(`${values.name} registered successfully`);
      onSuccess();
      reset();
      onClose();
    } catch {
      toast.error('Failed to register facility');
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
            <h2 className="text-lg font-semibold">Register Facility</h2>
            <button type="button" onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <FormSection title="Facility Details">
              <div className="pt-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="e.g. ATM Machine #3"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('type')}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select type...</option>
                      {FACILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Condition
                    </label>
                    <select
                      {...register('condition')}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Last Inspection
                    </label>
                    <input {...register('lastInspection')} type="date" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    {errors.lastInspection && <p className="text-xs text-red-500 mt-1">{errors.lastInspection.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                      Next Inspection
                    </label>
                    <input {...register('nextInspectionDue')} type="date" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    {errors.nextInspectionDue && <p className="text-xs text-red-500 mt-1">{errors.nextInspectionDue.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    Insurance Expiry
                  </label>
                  <input {...register('insuranceExpiry')} type="date" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  {errors.insuranceExpiry && <p className="text-xs text-red-500 mt-1">{errors.insuranceExpiry.message}</p>}
                </div>
              </div>
            </FormSection>
            <div className="flex gap-3">
              <button type="button" onClick={handleClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Register
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export function FacilityRegisterTable({ branchId }: FacilityRegisterTableProps) {
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: ['branches', branchId, 'facilities'],
    queryFn: () => branchOpsApi.getFacilities(branchId),
    staleTime: 60_000,
  });

  const handleScheduleInspection = (facility: Facility) => {
    toast.info(`Inspection scheduled for ${facility.name}`);
  };

  const handleRaiseMaintenance = (facility: Facility) => {
    toast.info(`Maintenance ticket raised for ${facility.name}`);
  };

  const columns: ColumnDef<Facility, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Facility',
      cell: ({ row }) => {
        const f = row.original;
        const overdue = isOverdue(f.nextInspectionDue);
        const expiring = isInsuranceExpiringSoon(f.insuranceExpiry);
        return (
          <div>
            <div className={cn('font-medium text-sm', overdue && 'text-red-600 dark:text-red-400')}>{f.name}</div>
            {overdue && <div className="text-[10px] text-red-500 font-medium">Inspection overdue</div>}
            {expiring && !overdue && <div className="text-[10px] text-amber-500 font-medium">Insurance expiring soon</div>}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.type}</span>,
    },
    {
      accessorKey: 'condition',
      header: 'Condition',
      cell: ({ row }) => (
        <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', conditionStyles[row.original.condition])}>
          {row.original.condition}
        </span>
      ),
    },
    {
      accessorKey: 'lastInspection',
      header: 'Last Inspection',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastInspection)}</span>,
    },
    {
      accessorKey: 'nextInspectionDue',
      header: 'Next Due',
      cell: ({ row }) => {
        const overdue = isOverdue(row.original.nextInspectionDue);
        return (
          <span className={cn('text-xs font-medium', overdue && 'text-red-600 dark:text-red-400')}>
            {formatDate(row.original.nextInspectionDue)}
            {overdue && ' ⚠'}
          </span>
        );
      },
    },
    {
      accessorKey: 'insuranceExpiry',
      header: 'Insurance Expiry',
      cell: ({ row }) => {
        const expiring = isInsuranceExpiringSoon(row.original.insuranceExpiry);
        return (
          <span className={cn('text-xs', expiring && 'text-amber-600 dark:text-amber-400 font-medium')}>
            {formatDate(row.original.insuranceExpiry)}
            {expiring && ' ⚠'}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScheduleInspection(row.original)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted transition-colors"
          >
            <Calendar className="w-3 h-3" />
            Inspect
          </button>
          <button
            type="button"
            onClick={() => handleRaiseMaintenance(row.original)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-muted transition-colors"
          >
            <Wrench className="w-3 h-3" />
            Maintain
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Facility
        </button>
      </div>

      <DataTable
        columns={columns}
        data={facilities}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No facilities registered"
        pageSize={10}
      />

      <AddFacilityDialog
        branchId={branchId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['branches', branchId, 'facilities'] });
        }}
      />
    </div>
  );
}
