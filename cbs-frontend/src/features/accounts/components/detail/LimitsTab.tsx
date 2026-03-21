import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Edit3, Loader2, Gauge, Save } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { apiGet, apiPatch } from '@/lib/api';

interface AccountLimit {
  id: number;
  limitType: string;
  limitValue: number;
  previousValue?: number | null;
  reason?: string | null;
  effectiveDate?: string | null;
  performedBy?: string | null;
}

interface LimitsTabProps {
  accountId: string;
  currency?: string;
}

const LIMIT_TYPES = [
  { value: 'DAILY_DEBIT', label: 'Daily Debit Limit', description: 'Maximum total debits per day' },
  { value: 'DAILY_CREDIT', label: 'Daily Credit Limit', description: 'Maximum total credits per day' },
  { value: 'PER_TRANSACTION', label: 'Per Transaction Limit', description: 'Maximum single transaction amount' },
  { value: 'MONTHLY_DEBIT', label: 'Monthly Debit Limit', description: 'Maximum total debits per month' },
  { value: 'MONTHLY_CREDIT', label: 'Monthly Credit Limit', description: 'Maximum total credits per month' },
  { value: 'WITHDRAWAL', label: 'Withdrawal Limit', description: 'Maximum daily cash withdrawal' },
  { value: 'POS_ATM', label: 'POS/ATM Limit', description: 'Maximum POS or ATM transaction' },
  { value: 'ONLINE_TRANSACTION', label: 'Online Transaction Limit', description: 'Maximum online/internet banking transaction' },
] as const;

const limitTypeLabel = (type: string) =>
  LIMIT_TYPES.find((lt) => lt.value === type)?.label ?? type.replace(/_/g, ' ');

export function LimitsTab({ accountId, currency = 'NGN' }: LimitsTabProps) {
  const queryClient = useQueryClient();
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeForm, setChangeForm] = useState({
    limitType: 'DAILY_DEBIT',
    newValue: 0,
    reason: '',
  });

  const { data: limits = [], isLoading } = useQuery<AccountLimit[]>({
    queryKey: ['accounts', accountId, 'limits'],
    queryFn: () => apiGet<AccountLimit[]>(`/api/v1/accounts/${accountId}/limits`),
    staleTime: 30_000,
  });

  const changeLimitMutation = useMutation({
    mutationFn: () =>
      apiPatch(`/api/v1/accounts/${accountId}/limits`, {
        limitType: changeForm.limitType,
        newValue: changeForm.newValue,
        reason: changeForm.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'limits'] });
      toast.success('Transaction limit updated');
      setShowChangeForm(false);
      setChangeForm({ limitType: 'DAILY_DEBIT', newValue: 0, reason: '' });
    },
    onError: () => toast.error('Failed to update transaction limit'),
  });

  const columns: ColumnDef<AccountLimit, unknown>[] = [
    {
      accessorKey: 'limitType',
      header: 'Limit Type',
      cell: ({ getValue }) => (
        <div>
          <p className="text-sm font-medium">{limitTypeLabel(String(getValue()))}</p>
          <p className="text-xs text-muted-foreground">
            {LIMIT_TYPES.find((lt) => lt.value === String(getValue()))?.description ?? ''}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'limitValue',
      header: 'Current Limit',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-medium">
          {formatMoney(getValue<number>() ?? 0, currency)}
        </span>
      ),
    },
    {
      accessorKey: 'previousValue',
      header: 'Previous Value',
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        return v != null ? (
          <span className="font-mono text-xs text-muted-foreground">
            {formatMoney(v, currency)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate block">
          {String(getValue() ?? '—')}
        </span>
      ),
    },
    {
      accessorKey: 'effectiveDate',
      header: 'Effective Date',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? <span className="text-sm">{formatDate(v)}</span> : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'performedBy',
      header: 'Changed By',
      cell: ({ getValue }) => (
        <span className="text-sm">{String(getValue() ?? '—')}</span>
      ),
    },
  ];

  // Build a summary of configured limits vs unconfigured
  const configuredTypes = new Set(limits.map((l) => l.limitType));
  const unconfiguredTypes = LIMIT_TYPES.filter((lt) => !configuredTypes.has(lt.value));

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="p-4 space-y-4">
      {/* Summary banner */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Transaction Limits</p>
            <p className="text-xs text-muted-foreground">
              {limits.length} limit{limits.length !== 1 ? 's' : ''} configured
              {unconfiguredTypes.length > 0 && ` · ${unconfiguredTypes.length} unconfigured`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowChangeForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Edit3 className="w-4 h-4" /> Change Limit
        </button>
      </div>

      {/* Limits table */}
      <DataTable
        columns={columns}
        data={limits}
        isLoading={isLoading}
        emptyMessage="No transaction limits configured for this account"
        pageSize={10}
      />

      {/* Unconfigured limits info */}
      {unconfiguredTypes.length > 0 && limits.length > 0 && (
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Unconfigured Limit Types
          </p>
          <div className="flex flex-wrap gap-2">
            {unconfiguredTypes.map((lt) => (
              <span
                key={lt.value}
                className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground"
              >
                {lt.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Change Limit Dialog */}
      {showChangeForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowChangeForm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Change Transaction Limit</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Set or update a transaction limit for this account.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Limit Type *</label>
                  <select
                    value={changeForm.limitType}
                    onChange={(e) => setChangeForm((p) => ({ ...p, limitType: e.target.value }))}
                    className={fc}
                  >
                    {LIMIT_TYPES.map((lt) => (
                      <option key={lt.value} value={lt.value}>
                        {lt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {LIMIT_TYPES.find((lt) => lt.value === changeForm.limitType)?.description}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">New Value ({currency}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={changeForm.newValue || ''}
                    onChange={(e) => setChangeForm((p) => ({ ...p, newValue: Number(e.target.value) }))}
                    className={`${fc} font-mono`}
                    placeholder="0.00"
                  />
                  {/* Show current value if exists */}
                  {limits.find((l) => l.limitType === changeForm.limitType) && (
                    <p className="text-xs text-muted-foreground">
                      Current: <span className="font-mono">{formatMoney(limits.find((l) => l.limitType === changeForm.limitType)!.limitValue, currency)}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Reason *</label>
                  <textarea
                    value={changeForm.reason}
                    onChange={(e) => setChangeForm((p) => ({ ...p, reason: e.target.value }))}
                    rows={2}
                    className={fc}
                    placeholder="Reason for changing this limit..."
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowChangeForm(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button
                  onClick={() => changeLimitMutation.mutate()}
                  disabled={!changeForm.newValue || !changeForm.reason.trim() || changeLimitMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {changeLimitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Apply Limit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
