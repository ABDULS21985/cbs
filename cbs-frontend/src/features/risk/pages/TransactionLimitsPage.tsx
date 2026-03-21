import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Plus, Shield, AlertTriangle, Search, X, Edit2,
  ArrowUpDown, DollarSign, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { transactionLimitApi } from '../api/transactionLimitApi';
import type {
  TransactionLimit, TransactionLimitUsage,
  LimitType, LimitScope, CreateLimitRequest,
} from '../types/transactionLimit';

// ─── Constants ───────────────────────────────────────────────────────────────

const LIMIT_TYPES: LimitType[] = [
  'DAILY_DEBIT', 'DAILY_CREDIT', 'SINGLE_TRANSACTION', 'DAILY_TRANSFER',
  'MONTHLY_TRANSFER', 'DAILY_WITHDRAWAL', 'DAILY_POS', 'DAILY_ONLINE', 'DAILY_INTERNATIONAL',
];

const LIMIT_SCOPES: LimitScope[] = ['GLOBAL', 'PRODUCT', 'ACCOUNT', 'CUSTOMER'];

const SCOPE_COLORS: Record<LimitScope, string> = {
  GLOBAL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  PRODUCT: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  ACCOUNT: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  CUSTOMER: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

function formatAmount(v: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

// ─── Create Limit Modal ──────────────────────────────────────────────────────

function CreateLimitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Partial<TransactionLimit>) => transactionLimitApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionLimits'] });
      onClose();
    },
  });

  const [form, setForm] = useState<CreateLimitRequest>({
    limitType: 'DAILY_DEBIT',
    scope: 'GLOBAL',
    maxAmount: 0,
    currencyCode: 'USD',
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      effectiveFrom: form.effectiveFrom || new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Create Transaction Limit</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Limit Type</label>
              <select value={form.limitType} onChange={(e) => setForm({ ...form, limitType: e.target.value as LimitType })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {LIMIT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scope</label>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as LimitScope })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {LIMIT_SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {(form.scope === 'ACCOUNT' || form.scope === 'CUSTOMER') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {form.scope === 'ACCOUNT' ? 'Account ID' : 'Customer ID'}
              </label>
              <input type="number" value={form.scopeRefId || ''} onChange={(e) => setForm({ ...form, scopeRefId: parseInt(e.target.value) || undefined })}
                placeholder={`${form.scope.toLowerCase()} ID`} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          )}

          {form.scope === 'PRODUCT' && (
            <div>
              <label className="block text-sm font-medium mb-1">Product Code</label>
              <input value={form.productCode || ''} onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                placeholder="e.g. SAVINGS_01" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Max Amount</label>
              <input type="number" required step="0.01" min="0" value={form.maxAmount || ''}
                onChange={(e) => setForm({ ...form, maxAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00" className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Count (optional)</label>
              <input type="number" min="0" value={form.maxCount ?? ''}
                onChange={(e) => setForm({ ...form, maxCount: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Unlimited" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input required value={form.currencyCode} maxLength={3}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Channels</label>
              <input value={form.appliesToChannels || ''} onChange={(e) => setForm({ ...form, appliesToChannels: e.target.value })}
                placeholder="ALL" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Effective From</label>
              <input type="date" value={form.effectiveFrom || ''} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          {createMutation.isError && <p className="text-xs text-destructive">Failed to create limit. Check permissions and input.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || form.maxAmount <= 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Limit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Update Limit Modal ──────────────────────────────────────────────────────

function UpdateLimitModal({ open, onClose, limit }: { open: boolean; onClose: () => void; limit: TransactionLimit | null }) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ id, params }: { id: number; params: { maxAmount?: number; maxCount?: number } }) =>
      transactionLimitApi.update(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionLimits'] });
      onClose();
    },
  });

  const [maxAmount, setMaxAmount] = useState(limit?.maxAmount?.toString() || '');
  const [maxCount, setMaxCount] = useState(limit?.maxCount?.toString() || '');

  if (!open || !limit) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      id: limit!.id,
      params: {
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        maxCount: maxCount ? parseInt(maxCount) : undefined,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Update Limit</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="rounded-lg bg-muted/30 border p-3 mb-4 text-xs space-y-1">
          <p><span className="text-muted-foreground">Type:</span> <span className="font-medium">{limit.limitType.replace(/_/g, ' ')}</span></p>
          <p><span className="text-muted-foreground">Scope:</span> <span className="font-medium">{limit.scope}</span>{limit.scopeRefId ? ` (ID: ${limit.scopeRefId})` : ''}</p>
          <p><span className="text-muted-foreground">Current Max:</span> <span className="font-mono font-medium">{formatAmount(limit.maxAmount)} {limit.currencyCode}</span></p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Max Amount</label>
            <input type="number" step="0.01" min="0" value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder={formatAmount(limit.maxAmount)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Max Count</label>
            <input type="number" min="0" value={maxCount}
              onChange={(e) => setMaxCount(e.target.value)}
              placeholder={limit.maxCount?.toString() || 'Unlimited'} className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
          </div>
          {updateMutation.isError && <p className="text-xs text-destructive">Failed to update limit.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending || (!maxAmount && !maxCount)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Usage Viewer ────────────────────────────────────────────────────────────

function UsagePanel({ accountId }: { accountId: number }) {
  const [limitType, setLimitType] = useState<LimitType>('DAILY_DEBIT');

  const usageQuery = useQuery({
    queryKey: ['transactionLimits', 'usage', accountId, limitType],
    queryFn: () => transactionLimitApi.getUsage(accountId, limitType),
    enabled: accountId > 0,
    staleTime: 15_000,
  });

  const usage = usageQuery.data;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">Today's Usage</h3>
      <div className="flex items-center gap-3 mb-4">
        <select value={limitType} onChange={(e) => setLimitType(e.target.value as LimitType)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm">
          {LIMIT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      {usageQuery.isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !usage ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No usage recorded today for this limit type.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Amount Used</p>
            <p className="text-lg font-bold font-mono tabular-nums">{formatAmount(usage.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">{usage.currencyCode}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Transactions</p>
            <p className="text-lg font-bold">{usage.totalCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Last Updated</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(usage.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function TransactionLimitsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editLimit, setEditLimit] = useState<TransactionLimit | null>(null);
  const [accountId, setAccountId] = useState('');
  const [accountIdInput, setAccountIdInput] = useState('');

  const limitsQuery = useQuery({
    queryKey: ['transactionLimits', 'account', accountId],
    queryFn: () => transactionLimitApi.getByAccount(parseInt(accountId)),
    enabled: !!accountId && parseInt(accountId) > 0,
    staleTime: 30_000,
  });

  const limits = limitsQuery.data ?? [];
  const activeLimits = limits.filter((l) => l.isActive);
  const inactiveLimits = limits.filter((l) => !l.isActive);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAccountId(accountIdInput);
  }

  return (
    <>
      <PageHeader
        title="Transaction Limits"
        subtitle="Hierarchical transaction limit management — GLOBAL > PRODUCT > ACCOUNT > CUSTOMER scope resolution"
        actions={
          <button type="button" onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Limit
          </button>
        }
      />

      <div className="px-6 space-y-6 pb-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={accountIdInput} onChange={(e) => setAccountIdInput(e.target.value)}
              placeholder="Enter Account ID to view limits..." type="number"
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground" />
          </div>
          <button type="submit" disabled={!accountIdInput}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            Load Limits
          </button>
        </form>

        {!accountId ? (
          <div className="rounded-xl border border-dashed p-16 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Enter an Account ID to view configured limits</p>
            <p className="text-xs mt-1">Limits are resolved hierarchically: Customer {">"} Account {">"} Product {">"} Global</p>
          </div>
        ) : limitsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">Active Limits</p>
                </div>
                <p className="text-2xl font-bold">{activeLimits.length}</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">Inactive / Expired</p>
                </div>
                <p className="text-2xl font-bold">{inactiveLimits.length}</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <DollarSign className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-xs text-muted-foreground">Limit Types</p>
                </div>
                <p className="text-2xl font-bold">{new Set(activeLimits.map((l) => l.limitType)).size}</p>
              </div>
            </div>

            {/* Limits Table */}
            {limits.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                <p className="text-sm">No limits configured for account {accountId}.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Limit Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Scope</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Max Amount</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Max Count</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Channels</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Effective</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {limits.map((limit) => (
                        <tr key={limit.id} className={cn('border-b last:border-0 hover:bg-muted/20 transition-colors', !limit.isActive && 'opacity-50')}>
                          <td className="px-4 py-3">
                            <span className="font-medium text-sm">{limit.limitType.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', SCOPE_COLORS[limit.scope])}>
                              {limit.scope}
                            </span>
                            {limit.scopeRefId && <span className="text-xs text-muted-foreground ml-1">#{limit.scopeRefId}</span>}
                            {limit.productCode && <span className="text-xs text-muted-foreground ml-1">{limit.productCode}</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                            {formatAmount(limit.maxAmount)} <span className="text-xs text-muted-foreground">{limit.currencyCode}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {limit.maxCount ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{limit.appliesToChannels}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            {limit.effectiveFrom}{limit.effectiveTo ? ` → ${limit.effectiveTo}` : ''}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              limit.isActive ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-800')}>
                              {limit.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {limit.isActive && (
                              <button type="button" onClick={() => { setEditLimit(limit); }}
                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/80 transition-colors">
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Usage Panel */}
            <UsagePanel accountId={parseInt(accountId)} />
          </>
        )}
      </div>

      <CreateLimitModal open={showCreate} onClose={() => setShowCreate(false)} />
      <UpdateLimitModal open={!!editLimit} onClose={() => setEditLimit(null)} limit={editLimit} />
    </>
  );
}
