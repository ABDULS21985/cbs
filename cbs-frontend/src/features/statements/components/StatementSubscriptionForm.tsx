import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Loader2, RefreshCw, CalendarClock, Mail, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type {
  StatementSubscription,
  SubscriptionFrequency,
  DeliveryMethod,
  StatementFormat,
} from '../api/statementApi';

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY'] as const),
    delivery: z.enum(['EMAIL', 'PORTAL'] as const),
    format: z.enum(['PDF', 'CSV', 'EXCEL'] as const),
    email: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.delivery === 'EMAIL') {
      if (!data.email || data.email.trim() === '') {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email is required for email delivery' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        ctx.addIssue({ code: 'custom', path: ['email'], message: 'Invalid email address' });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SubscriptionSavePayload extends FormValues {
  id?: string;
}

interface StatementSubscriptionFormProps {
  accountId: string;
  subscriptions: StatementSubscription[];
  onSave: (data: SubscriptionSavePayload) => void | Promise<void>;
  onCancel: (id: string) => void | Promise<void>;
  isSaving?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string; icon: string }[] = [
  { value: 'WEEKLY', label: 'Weekly', icon: '7d' },
  { value: 'MONTHLY', label: 'Monthly', icon: '30d' },
  { value: 'QUARTERLY', label: 'Quarterly', icon: '90d' },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string; description: string }[] = [
  { value: 'EMAIL', label: 'Email', description: 'Sent to registered email' },
  { value: 'PORTAL', label: 'Portal Download', description: 'Available in portal' },
];

const FORMAT_OPTIONS: { value: StatementFormat; label: string }[] = [
  { value: 'PDF', label: 'PDF' },
  { value: 'CSV', label: 'CSV' },
  { value: 'EXCEL', label: 'Excel' },
];

// ─── Subscription Card ────────────────────────────────────────────────────────

interface SubscriptionCardProps {
  sub: StatementSubscription;
  onEdit: () => void;
  onDelete: () => void;
}

function SubscriptionCard({ sub, onEdit, onDelete }: SubscriptionCardProps) {
  return (
    <div className="flex items-start justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <RefreshCw className="w-4 h-4 text-primary" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{sub.frequency.charAt(0) + sub.frequency.slice(1).toLowerCase()} Statement</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              sub.active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800',
            )}>
              {sub.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              {sub.delivery === 'EMAIL' ? <Mail className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
              {sub.delivery === 'EMAIL' ? sub.email || 'Email' : 'Portal'}
            </span>
            <span className="flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Next: {formatDate(sub.nextDelivery)}
            </span>
            <span className="uppercase font-mono">{sub.format}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Edit subscription"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          title="Cancel subscription"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StatementSubscriptionForm({
  accountId: _accountId,
  subscriptions,
  onSave,
  onCancel,
  isSaving = false,
}: StatementSubscriptionFormProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const editingSub = editingId ? subscriptions.find((s) => s.id === editingId) : null;

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editingSub
      ? {
          frequency: editingSub.frequency,
          delivery: editingSub.delivery,
          format: editingSub.format,
          email: editingSub.email ?? '',
        }
      : {
          frequency: 'MONTHLY',
          delivery: 'EMAIL',
          format: 'PDF',
          email: '',
        },
  });

  const watchDelivery = watch('delivery');

  const handleEdit = (sub: StatementSubscription) => {
    setEditingId(sub.id);
    reset({
      frequency: sub.frequency,
      delivery: sub.delivery,
      format: sub.format,
      email: sub.email ?? '',
    });
    setShowForm(true);
  };

  const handleNewClick = () => {
    setEditingId(null);
    reset({ frequency: 'MONTHLY', delivery: 'EMAIL', format: 'PDF', email: '' });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    reset();
  };

  const onSubmit = async (values: FormValues) => {
    await onSave({ ...values, id: editingId ?? undefined });
    handleCancel();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onCancel(deleteTarget);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Existing Subscriptions ──────────────────────────────────── */}
      {subscriptions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Subscriptions
          </div>
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              onEdit={() => handleEdit(sub)}
              onDelete={() => setDeleteTarget(sub.id)}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit Form ─────────────────────────────────────────── */}
      {showForm ? (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-card p-4 space-y-4">
          <div className="text-sm font-semibold">
            {editingId ? 'Edit Subscription' : 'New Statement Subscription'}
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Frequency</label>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        'py-2 text-sm rounded-md border font-medium transition-colors',
                        field.value === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Delivery */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Method</label>
            <Controller
              name="delivery"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {DELIVERY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
                        field.value === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        checked={field.value === opt.value}
                        onChange={() => field.onChange(opt.value)}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Email (conditional) */}
          {watchDelivery === 'EMAIL' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Email</label>
              <input
                type="email"
                {...register('email')}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          )}

          {/* Format */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File Format</label>
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => field.onChange(fmt.value)}
                      className={cn(
                        'flex-1 py-1.5 text-sm rounded-md border font-medium transition-colors',
                        field.value === fmt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? 'Update Subscription' : 'Save Subscription'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={handleNewClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-primary/50 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Statement Subscription
        </button>
      )}

      {/* ── Delete Confirm Dialog ────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Cancel Subscription"
        description="Are you sure you want to cancel this statement subscription? This action cannot be undone."
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep it"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
