import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import type { ApprovalType } from '../../api/approvalApi';

interface Approver {
  name: string;
  role: string;
}

interface DelegationFormProps {
  onSubmit: (data: {
    delegatedBy: string;
    delegatedTo: string;
    delegatedToRole: string;
    fromDate: string;
    toDate: string;
    scope: 'ALL' | 'SPECIFIC';
    types?: ApprovalType[];
    reason: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const APPROVAL_TYPES: { value: ApprovalType; label: string }[] = [
  { value: 'ACCOUNT_OPENING', label: 'Account Opening' },
  { value: 'LOAN_APPROVAL', label: 'Loan Approval' },
  { value: 'PAYMENT_APPROVAL', label: 'Payment Approval' },
  { value: 'FEE_WAIVER', label: 'Fee Waiver' },
  { value: 'RATE_OVERRIDE', label: 'Rate Override' },
  { value: 'PARAMETER_CHANGE', label: 'Parameter Change' },
  { value: 'USER_CREATION', label: 'User Creation' },
  { value: 'CARD_REQUEST', label: 'Card Request' },
  { value: 'WRITE_OFF', label: 'Write-Off' },
  { value: 'RESTRUCTURE', label: 'Restructure' },
  { value: 'LIMIT_CHANGE', label: 'Limit Change' },
  { value: 'KYC_OVERRIDE', label: 'KYC Override' },
];

const REASONS = [
  'Annual Leave',
  'Training',
  'Business Travel',
  'Medical Leave',
  'Other',
];

const today = new Date().toISOString().split('T')[0];

export function DelegationForm({ onSubmit, onCancel, loading = false }: DelegationFormProps) {
  const { data: approvers = [] } = useQuery({
    queryKey: ['approvers-list'],
    queryFn: () => apiGet<Approver[]>('/api/v1/approvals/approvers').catch(() => []),
  });

  const [delegateTo, setDelegateTo] = useState('');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState('');
  const [scope, setScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedTypes, setSelectedTypes] = useState<ApprovalType[]>([]);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedApprover = approvers.find((a) => a.name === delegateTo);

  const toggleType = (type: ApprovalType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!delegateTo) errs.delegateTo = 'Please select a delegate.';
    if (!fromDate) errs.fromDate = 'Start date is required.';
    if (!toDate) errs.toDate = 'End date is required.';
    if (fromDate && toDate && toDate < fromDate) errs.toDate = 'End date must be after start date.';
    if (fromDate && fromDate < today) errs.fromDate = 'Start date must be today or in the future.';
    if (scope === 'SPECIFIC' && selectedTypes.length === 0) errs.types = 'Select at least one approval type.';
    if (!reason) errs.reason = 'Please select a reason.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      delegatedBy: 'Ngozi Adeyemi',
      delegatedTo: delegateTo,
      delegatedToRole: selectedApprover?.role ?? '',
      fromDate,
      toDate,
      scope,
      types: scope === 'SPECIFIC' ? selectedTypes : undefined,
      reason,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Delegate To */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Delegate To <span className="text-red-500">*</span>
        </label>
        <select
          value={delegateTo}
          onChange={(e) => setDelegateTo(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
            errors.delegateTo ? 'border-red-400' : 'border-border',
          )}
        >
          <option value="">Select an approver...</option>
          {approvers.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name} — {a.role}
            </option>
          ))}
        </select>
        {errors.delegateTo && <p className="text-xs text-red-500 mt-1">{errors.delegateTo}</p>}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            From Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={fromDate}
            min={today}
            onChange={(e) => setFromDate(e.target.value)}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.fromDate ? 'border-red-400' : 'border-border',
            )}
          />
          {errors.fromDate && <p className="text-xs text-red-500 mt-1">{errors.fromDate}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            To Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={toDate}
            min={fromDate || today}
            onChange={(e) => setToDate(e.target.value)}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
              errors.toDate ? 'border-red-400' : 'border-border',
            )}
          />
          {errors.toDate && <p className="text-xs text-red-500 mt-1">{errors.toDate}</p>}
        </div>
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm font-medium mb-2">Delegation Scope</label>
        <div className="flex gap-4">
          {(['ALL', 'SPECIFIC'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={s}
                checked={scope === s}
                onChange={() => setScope(s)}
                className="text-primary"
              />
              <span className="text-sm">
                {s === 'ALL' ? 'All Approval Types' : 'Specific Types Only'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Type multi-select (when SPECIFIC) */}
      {scope === 'SPECIFIC' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Approval Types <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {APPROVAL_TYPES.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm transition-colors',
                  selectedTypes.includes(value)
                    ? 'bg-primary/10 border-primary/40 text-foreground'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(value)}
                  onChange={() => toggleType(value)}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
          {errors.types && <p className="text-xs text-red-500 mt-1">{errors.types}</p>}
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Reason <span className="text-red-500">*</span>
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
            errors.reason ? 'border-red-400' : 'border-border',
          )}
        >
          <option value="">Select reason...</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <UserCheck className="w-4 h-4" />
          )}
          {loading ? 'Activating...' : 'Activate Delegation'}
        </button>
      </div>
    </form>
  );
}
