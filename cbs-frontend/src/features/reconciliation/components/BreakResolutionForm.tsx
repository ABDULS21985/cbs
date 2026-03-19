import { useState } from 'react';
import { Loader2, BookOpen, ArrowUpCircle, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry } from '../api/reconciliationApi';

export type ResolutionType = 'WRITE_OFF' | 'JOURNAL_ENTRY' | 'ESCALATE';

export interface BreakResolutionData {
  resolutionType: ResolutionType;
  reason: string;
  glAccount?: string;
  authorizer?: string;
}

interface BreakResolutionFormProps {
  entry: ReconciliationEntry;
  onSubmit: (data: BreakResolutionData) => void | Promise<void>;
  onCancel: () => void;
}

const RESOLUTION_OPTIONS: Array<{ value: ResolutionType; label: string; icon: typeof BookOpen; description: string; color: string }> = [
  {
    value: 'WRITE_OFF',
    label: 'Write Off',
    icon: BookOpen,
    description: 'Write off the break as an accepted difference',
    color: 'text-red-600',
  },
  {
    value: 'JOURNAL_ENTRY',
    label: 'Journal Entry',
    icon: FileText,
    description: 'Post a correcting journal entry to the general ledger',
    color: 'text-blue-600',
  },
  {
    value: 'ESCALATE',
    label: 'Escalate',
    icon: ArrowUpCircle,
    description: 'Escalate to a senior officer for investigation',
    color: 'text-amber-600',
  },
];

const GL_ACCOUNTS = [
  { code: '100-010', name: 'Suspense Account – Nostro' },
  { code: '100-020', name: 'FX Difference Account' },
  { code: '100-030', name: 'Bank Charges Account' },
  { code: '200-010', name: 'Unallocated Credits' },
  { code: '200-020', name: 'Correspondent Charges' },
  { code: '300-010', name: 'Interest Suspense' },
  { code: '400-010', name: 'Write-Off – Trading' },
];

export function BreakResolutionForm({ entry, onSubmit, onCancel }: BreakResolutionFormProps) {
  const [resolutionType, setResolutionType] = useState<ResolutionType>('WRITE_OFF');
  const [reason, setReason] = useState('');
  const [glAccount, setGlAccount] = useState('');
  const [authorizer, setAuthorizer] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!reason.trim()) newErrors.reason = 'Reason is required';
    if (resolutionType === 'JOURNAL_ENTRY' && !glAccount) newErrors.glAccount = 'GL account is required';
    if ((resolutionType === 'JOURNAL_ENTRY' || resolutionType === 'ESCALATE') && !authorizer.trim()) {
      newErrors.authorizer = 'Authorizer is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({ resolutionType, reason, glAccount: glAccount || undefined, authorizer: authorizer || undefined });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Entry Details */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Break Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium mt-0.5">{formatDate(entry.date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Reference</p>
            <p className="font-mono font-medium mt-0.5 break-all">{entry.reference}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className={cn(
              'font-mono font-semibold mt-0.5',
              entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
            )}>
              {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium mt-0.5">{entry.type}</p>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-muted-foreground">Description</p>
            <p className="font-medium mt-0.5">{entry.description}</p>
          </div>
        </div>
      </div>

      {/* Resolution Type */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resolution Type</p>
        <div className="grid grid-cols-3 gap-2">
          {RESOLUTION_OPTIONS.map(({ value, label, icon: Icon, description, color }) => (
            <label
              key={value}
              className={cn(
                'relative flex flex-col items-start gap-1.5 rounded-lg border px-3.5 py-3 cursor-pointer transition-colors text-xs',
                resolutionType === value
                  ? 'bg-primary/5 border-primary ring-1 ring-primary'
                  : 'hover:bg-muted/50',
              )}
            >
              <input
                type="radio"
                name="resolutionType"
                value={value}
                checked={resolutionType === value}
                onChange={() => setResolutionType(value)}
                className="sr-only"
              />
              <Icon className={cn('w-4 h-4', color)} />
              <span className="font-semibold">{label}</span>
              <span className="text-muted-foreground leading-relaxed">{description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Write-Off Warning */}
      {resolutionType === 'WRITE_OFF' && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-3.5 py-3 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Writing off this entry is irreversible. Ensure proper authorization has been obtained before proceeding.</p>
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-xs font-medium mb-1.5">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Provide a detailed reason for this resolution..."
          className={cn(
            'w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40',
            errors.reason ? 'border-red-400' : 'border-input',
          )}
        />
        {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
      </div>

      {/* GL Account — only for JOURNAL_ENTRY */}
      {resolutionType === 'JOURNAL_ENTRY' && (
        <div>
          <label className="block text-xs font-medium mb-1.5">
            GL Account <span className="text-red-500">*</span>
          </label>
          <select
            value={glAccount}
            onChange={(e) => setGlAccount(e.target.value)}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
              errors.glAccount ? 'border-red-400' : 'border-input',
            )}
          >
            <option value="">Select GL Account…</option>
            {GL_ACCOUNTS.map((acct) => (
              <option key={acct.code} value={acct.code}>
                {acct.code} — {acct.name}
              </option>
            ))}
          </select>
          {errors.glAccount && <p className="mt-1 text-xs text-red-600">{errors.glAccount}</p>}
        </div>
      )}

      {/* Authorizer */}
      {(resolutionType === 'JOURNAL_ENTRY' || resolutionType === 'ESCALATE') && (
        <div>
          <label className="block text-xs font-medium mb-1.5">
            Authorizer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={authorizer}
            onChange={(e) => setAuthorizer(e.target.value)}
            placeholder="e.g. Head of Treasury Operations"
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
              errors.authorizer ? 'border-red-400' : 'border-input',
            )}
          />
          {errors.authorizer && <p className="mt-1 text-xs text-red-600">{errors.authorizer}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50',
            resolutionType === 'WRITE_OFF' ? 'bg-red-600 hover:bg-red-700' :
            resolutionType === 'JOURNAL_ENTRY' ? 'bg-blue-600 hover:bg-blue-700' :
            'bg-amber-600 hover:bg-amber-700',
          )}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {resolutionType === 'WRITE_OFF' ? 'Write Off Entry' :
           resolutionType === 'JOURNAL_ENTRY' ? 'Post Journal Entry' :
           'Escalate'}
        </button>
      </div>
    </form>
  );
}
