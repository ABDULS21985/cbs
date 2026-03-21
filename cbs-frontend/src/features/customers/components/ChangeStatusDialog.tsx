import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useChangeCustomerStatus } from '../hooks/useCustomers';
import type { CustomerStatus } from '../types/customer';

/** Valid status transitions as defined by the backend CustomerValidator */
const STATUS_TRANSITIONS: Record<CustomerStatus, CustomerStatus[]> = {
  PROSPECT: ['ACTIVE'],
  ACTIVE: ['DORMANT', 'SUSPENDED', 'CLOSED', 'DECEASED'],
  DORMANT: ['ACTIVE', 'CLOSED'],
  SUSPENDED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
  DECEASED: [],
};

const STATUS_LABELS: Record<CustomerStatus, string> = {
  PROSPECT: 'Prospect',
  ACTIVE: 'Active',
  DORMANT: 'Dormant',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
  DECEASED: 'Deceased',
};

const DESTRUCTIVE_STATUSES: CustomerStatus[] = ['CLOSED', 'DECEASED', 'SUSPENDED'];

interface ChangeStatusDialogProps {
  customerId: number;
  currentStatus: CustomerStatus;
  customerName: string;
  onClose: () => void;
}

export function ChangeStatusDialog({ customerId, currentStatus, customerName, onClose }: ChangeStatusDialogProps) {
  const changeStatus = useChangeCustomerStatus();
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] ?? [];

  const [newStatus, setNewStatus] = useState<CustomerStatus | ''>(allowedTransitions[0] ?? '');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDestructive = DESTRUCTIVE_STATUSES.includes(newStatus as CustomerStatus);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!newStatus) errs.newStatus = 'Please select a new status';
    if (!reason.trim()) errs.reason = 'Reason is required';
    else if (reason.trim().length < 5) errs.reason = 'Reason must be at least 5 characters';
    else if (reason.trim().length > 500) errs.reason = 'Reason must be 500 characters or less';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !newStatus) return;
    try {
      await changeStatus.mutateAsync({
        customerId,
        data: { newStatus: newStatus as CustomerStatus, reason: reason.trim() },
      });
      toast.success(`Customer status changed to ${STATUS_LABELS[newStatus as CustomerStatus]}`);
      onClose();
    } catch {
      toast.error('Failed to change customer status');
    }
  };

  if (allowedTransitions.length === 0) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Change Status</h3>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm">
                Customer is currently <strong>{STATUS_LABELS[currentStatus]}</strong>. No further status transitions are available.
              </p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Close</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Change Customer Status</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <p className="text-sm text-muted-foreground">
            Changing status for <strong>{customerName}</strong> from{' '}
            <span className="font-medium">{STATUS_LABELS[currentStatus]}</span>.
          </p>

          {isDestructive && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">
                This action may restrict the customer's access to banking services. Ensure all regulatory requirements are met.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">New Status *</label>
              <select className="w-full input text-sm" value={newStatus} onChange={(e) => {
                setNewStatus(e.target.value as CustomerStatus);
                if (errors.newStatus) setErrors((prev) => { const next = { ...prev }; delete next.newStatus; return next; });
              }}>
                {allowedTransitions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              {errors.newStatus && <p className="text-xs text-red-600 mt-0.5">{errors.newStatus}</p>}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Reason * <span className="text-muted-foreground">(5-500 chars)</span></label>
              <textarea
                className="w-full input text-sm min-h-[100px] resize-y"
                value={reason}
                onChange={(e) => { setReason(e.target.value); if (errors.reason) setErrors((prev) => { const next = { ...prev }; delete next.reason; return next; }); }}
                placeholder="Provide a detailed reason for the status change..."
                maxLength={500}
              />
              <div className="flex justify-between mt-0.5">
                {errors.reason ? <p className="text-xs text-red-600">{errors.reason}</p> : <span />}
                <span className="text-xs text-muted-foreground">{reason.length}/500</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={changeStatus.isPending} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={changeStatus.isPending}
              className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                isDestructive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}>
              {changeStatus.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Change Status
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
