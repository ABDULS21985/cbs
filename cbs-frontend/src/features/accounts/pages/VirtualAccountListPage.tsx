import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Layers, Wallet, CheckCircle2, AlertCircle,
  Filter, ToggleLeft, ToggleRight, ArrowDownUp,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VirtualAccountTable } from '../components/virtual/VirtualAccountTable';
import {
  getVirtualAccounts,
  createVirtualAccount,
  activateVirtualAccount,
  bulkSweep,
} from '../api/virtualAccountApi';
import {
  useDeactivateVirtualAccount,
} from '../hooks/useAccountsExt';
import type { VirtualAccount } from '../types/virtualAccountExt';

// ── Schema ────────────────────────────────────────────────────────────────────

const ACCOUNT_PURPOSES = [
  'COLLECTIONS', 'PAYMENTS', 'RECONCILIATION', 'SEGREGATION',
  'PROJECT', 'DEPARTMENT', 'SUBSIDIARY', 'CLIENT_MONEY',
  'ESCROW_VIRTUAL', 'SUPPLIER_PAYMENT', 'PAYROLL', 'TAX_RESERVE',
] as const;

const newVASchema = z.object({
  masterAccountId: z.coerce.number().min(1, 'Master account ID is required'),
  customerId: z.coerce.number().min(1, 'Customer ID is required'),
  accountName: z.string().min(2, 'Account name is required'),
  accountPurpose: z.enum(ACCOUNT_PURPOSES),
  referencePattern: z.string().optional(),
  externalReference: z.string().optional(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']),
  autoSweepEnabled: z.boolean().optional(),
  sweepThreshold: z.coerce.number().optional(),
  sweepTargetBalance: z.coerce.number().optional(),
  sweepDirection: z.enum(['TO_MASTER', 'FROM_MASTER', 'BIDIRECTIONAL']).optional(),
});

type NewVAFormData = z.infer<typeof newVASchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export function VirtualAccountListPage() {
  useEffect(() => { document.title = 'Virtual Accounts | CBS'; }, []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [parentFilter, setParentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['virtual-accounts'],
    queryFn: getVirtualAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createVirtualAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
      setShowDialog(false);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create virtual account'),
  });

  const sweepMutation = useMutation({
    mutationFn: bulkSweep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Bulk sweep failed'),
  });

  const deactivateMutation = useDeactivateVirtualAccount();

  const activateMutation = useMutation({
    mutationFn: activateVirtualAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to activate account'),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NewVAFormData>({
    resolver: zodResolver(newVASchema),
    defaultValues: {
      currency: 'NGN',
      accountPurpose: 'COLLECTIONS',
      autoSweepEnabled: false,
      sweepDirection: 'TO_MASTER',
    },
  });

  const autoSweepEnabled = watch('autoSweepEnabled');

  // ── Filtered data ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = accounts;
    if (statusFilter !== 'ALL') {
      result = result.filter((a) =>
        statusFilter === 'ACTIVE' ? a.isActive : !a.isActive,
      );
    }
    if (parentFilter) {
      result = result.filter((a) =>
        String(a.masterAccountId) === parentFilter,
      );
    }
    if (dateFrom) {
      result = result.filter((a) => a.createdAt >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((a) => a.createdAt <= dateTo);
    }
    return result;
  }, [accounts, statusFilter, parentFilter, dateFrom, dateTo]);

  // ── Derived stats ───────────────────────────────────────────────────────────

  const totalBalance = accounts.reduce((s, a) => s + a.virtualBalance, 0);
  const activeCount = accounts.filter((a) => a.isActive).length;

  // ── Unique master accounts for filter ───────────────────────────────────────

  const uniqueParents = useMemo(
    () => [...new Set(accounts.map((a) => String(a.masterAccountId)))],
    [accounts],
  );

  // ── Bulk actions ────────────────────────────────────────────────────────────

  const handleBulkActivate = () => {
    selectedIds.forEach((id) => {
      const acct = accounts.find((a) => String(a.id) === id);
      if (acct && !acct.isActive) activateMutation.mutate(acct.virtualAccountNumber);
    });
    setSelectedIds([]);
  };

  const handleBulkDeactivate = () => {
    selectedIds.forEach((id) => {
      const acct = accounts.find((a) => String(a.id) === id);
      if (acct && acct.isActive) deactivateMutation.mutate(acct.virtualAccountNumber);
    });
    setSelectedIds([]);
  };

  const handleSweepAll = () => {
    sweepMutation.mutate();
  };

  // ── Form submit ─────────────────────────────────────────────────────────────

  const onSubmit = (data: NewVAFormData) => {
    createMutation.mutate({
      masterAccountId: data.masterAccountId,
      customerId: data.customerId,
      accountName: data.accountName,
      accountPurpose: data.accountPurpose,
      currency: data.currency,
      referencePattern: data.referencePattern || undefined,
      externalReference: data.externalReference || undefined,
      autoSweepEnabled: data.autoSweepEnabled,
      sweepThreshold: data.sweepThreshold,
      sweepTargetBalance: data.sweepTargetBalance,
      sweepDirection: data.sweepDirection,
    });
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setParentFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = statusFilter !== 'ALL' || parentFilter || dateFrom || dateTo;

  return (
    <div>
      <PageHeader
        title="Virtual Accounts"
        subtitle="Manage virtual account numbers and transaction matching rules"
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                <button
                  onClick={handleBulkActivate}
                  disabled={activateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-green-50 hover:border-green-200 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors disabled:opacity-60"
                >
                  <ToggleRight className="w-4 h-4" />
                  Activate
                </button>
                <button
                  onClick={handleBulkDeactivate}
                  disabled={deactivateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-60"
                >
                  <ToggleLeft className="w-4 h-4" />
                  Deactivate
                </button>
              </div>
            )}

            <button
              onClick={handleSweepAll}
              disabled={sweepMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              <ArrowDownUp className="w-4 h-4" />
              {sweepMutation.isPending ? 'Sweeping...' : 'Sweep All'}
            </button>

            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Virtual Account
            </button>
          </div>
        }
      />

      <div className="page-container">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Virtual Accounts"
            value={accounts.length}
            format="number"
            icon={Layers}
            loading={isLoading}
          />
          <StatCard
            label="Active"
            value={activeCount}
            format="number"
            icon={CheckCircle2}
            loading={isLoading}
          />
          <StatCard
            label="Total Balance"
            value={totalBalance}
            format="money"
            icon={Wallet}
            loading={isLoading}
          />
          <StatCard
            label="Inactive"
            value={accounts.length - activeCount}
            format="number"
            icon={AlertCircle}
            loading={isLoading}
          />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
              hasActiveFilters
                ? 'border-primary/50 bg-primary/5 text-primary'
                : 'hover:bg-muted',
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {[statusFilter !== 'ALL', parentFilter, dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="mt-3 p-4 surface-card">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Physical Account</label>
                  <select
                    value={parentFilter}
                    onChange={(e) => setParentFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Accounts</option>
                    {uniqueParents.map((p) => (
                      <option key={p} value={p}>Master #{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Created From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Created To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end mt-3 pt-3 border-t">
                  <button
                    onClick={clearFilters}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <VirtualAccountTable
          accounts={filtered}
          onRowClick={(id) => navigate(`/accounts/virtual-accounts/${id}`)}
        />
      </div>

      {/* ── Create Virtual Account Dialog ──────────────────────────────────────── */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 modal-scrim"
            onClick={() => setShowDialog(false)}
          />

          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold">Create Virtual Account</h2>
              </div>
              <button
                onClick={() => { setShowDialog(false); reset(); }}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('accountName')}
                  placeholder="e.g. Dangote Industries — Invoice Collections"
                  className={cn(
                    'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
                    errors.accountName && 'border-red-500',
                  )}
                />
                {errors.accountName && (
                  <p className="text-xs text-red-600">{errors.accountName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Master Account ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Master Account ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('masterAccountId')}
                    placeholder="e.g. 1001"
                    className={cn(
                      'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                      errors.masterAccountId && 'border-red-500',
                    )}
                  />
                  {errors.masterAccountId && (
                    <p className="text-xs text-red-600">{errors.masterAccountId.message}</p>
                  )}
                </div>

                {/* Customer ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Customer ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('customerId')}
                    placeholder="e.g. 500"
                    className={cn(
                      'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                      errors.customerId && 'border-red-500',
                    )}
                  />
                  {errors.customerId && (
                    <p className="text-xs text-red-600">{errors.customerId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Purpose */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Account Purpose</label>
                  <select
                    {...register('accountPurpose')}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {ACCOUNT_PURPOSES.map((p) => (
                      <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    {...register('currency')}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
              </div>

              {/* Matching */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reference Pattern</label>
                  <input
                    type="text"
                    {...register('referencePattern')}
                    placeholder="e.g. ^INV-CUST-\d+$"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">Regex for auto-matching payments</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">External Reference</label>
                  <input
                    type="text"
                    {...register('externalReference')}
                    placeholder="e.g. PROJECT-ABC"
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">Exact match reference</p>
                </div>
              </div>

              {/* Auto Sweep */}
              <div className="rounded-lg border p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('autoSweepEnabled')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Enable Auto-Sweep</span>
                </label>

                {autoSweepEnabled && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Threshold</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('sweepThreshold')}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Target Balance</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('sweepTargetBalance')}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Direction</label>
                      <select
                        {...register('sweepDirection')}
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="TO_MASTER">To Master</option>
                        <option value="FROM_MASTER">From Master</option>
                        <option value="BIDIRECTIONAL">Bidirectional</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => { setShowDialog(false); reset(); }}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {createMutation.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Account
                </button>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-red-600 text-center">
                  Failed to create virtual account. Please try again.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
