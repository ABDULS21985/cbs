import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  X,
  Calculator,
  Search,
  Layers,
  TrendingUp,
  Users,
  DollarSign,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import {
  useNotionalPools,
  useNotionalPoolMembers,
  useAddNotionalPoolMember,
  useCalculateNotionalPool,
} from '../hooks/useAccountsExt';
import type { NotionalPool, NotionalPoolCalcResult } from '../types/notionalPool';

// ── Add Member Modal ────────────────────────────────────────────────────────

const addMemberSchema = z.object({
  accountId: z.coerce.number().min(1, 'Account ID is required'),
  memberName: z.string().min(2, 'Account name is required'),
  accountCurrency: z.string().min(3, 'Currency is required'),
  currentBalance: z.coerce.number({ invalid_type_error: 'Balance is required' }),
  fxRateToBase: z.coerce.number().min(0.0001, 'FX rate is required'),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  poolCode: string;
  onClose: () => void;
}

function AddMemberDialog({ poolCode, onClose }: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const addMember = useAddNotionalPoolMember();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { accountCurrency: 'NGN', fxRateToBase: 1 },
  });

  const onSubmit = (data: AddMemberFormData) => {
    addMember.mutate(
      {
        poolCode,
        data: {
          accountId: data.accountId,
          memberName: data.memberName,
          accountCurrency: data.accountCurrency,
          currentBalance: data.currentBalance,
          fxRateToBase: data.fxRateToBase,
        },
      },
      {
        onSuccess: onClose,
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add pool member'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold">Add Pool Member</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search account by number or name..."
              className="w-full pl-9 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Account ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              {...register('accountId')}
              placeholder="e.g. 10045"
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.accountId && 'border-red-500',
              )}
            />
            {errors.accountId && (
              <p className="text-xs text-red-600">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Account Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('memberName')}
              placeholder="e.g. Subsidiary A Operating Account"
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.memberName && 'border-red-500',
              )}
            />
            {errors.memberName && (
              <p className="text-xs text-red-600">{errors.memberName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Currency <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('accountCurrency')}
                placeholder="NGN"
                className={cn(
                  'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.accountCurrency && 'border-red-500',
                )}
              />
              {errors.accountCurrency && (
                <p className="text-xs text-red-600">{errors.accountCurrency.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                FX Rate to Base <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                {...register('fxRateToBase')}
                placeholder="1.0000"
                className={cn(
                  'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                  errors.fxRateToBase && 'border-red-500',
                )}
              />
              {errors.fxRateToBase && (
                <p className="text-xs text-red-600">{errors.fxRateToBase.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Current Balance <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              {...register('currentBalance')}
              placeholder="e.g. 50000000"
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50',
                errors.currentBalance && 'border-red-500',
              )}
            />
            {errors.currentBalance && (
              <p className="text-xs text-red-600">{errors.currentBalance.message}</p>
            )}
          </div>

          {addMember.isError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 px-4 py-3">
              <p className="text-sm text-red-700 dark:text-red-400">
                Failed to add member. Please try again.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMember.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {addMember.isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Interest Calculation Results Panel ───────────────────────────────────────

interface CalcResultsPanelProps {
  result: NotionalPoolCalcResult;
  pool: NotionalPool;
  onClose: () => void;
}

function CalcResultsPanel({ result, pool, onClose }: CalcResultsPanelProps) {
  const creditRate = pool.creditRate ?? 2.0;
  const debitRate = pool.debitRate ?? 8.0;
  const advantageSpread = pool.advantageSpread ?? 0.5;
  const pooledRate = result.net_balance >= 0
    ? creditRate + advantageSpread
    : debitRate - advantageSpread;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-background border-l shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-semibold">Interest Calculation Results</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Net Balance
              </div>
              <div className="text-lg font-semibold">
                {formatMoney(result.net_balance)}
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Credit
              </div>
              <div className="text-lg font-semibold text-green-600">
                {formatMoney(result.total_credit)}
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total Debit
              </div>
              <div className="text-lg font-semibold text-red-600">
                {formatMoney(result.total_debit)}
              </div>
            </div>
            <div className="rounded-lg border p-4 text-center bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
              <div className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
                Daily Interest Benefit
              </div>
              <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                +{formatMoney(result.daily_interest_benefit)}
              </div>
            </div>
          </div>

          {/* Rate comparison */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Rate Comparison</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Metric</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Individual</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Pooled</th>
                    <th className="text-center px-4 py-2.5 font-medium text-green-700 dark:text-green-400">Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">Credit Rate</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted">
                        {formatPercent(creditRate)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                        {formatPercent(creditRate + advantageSpread)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-green-700 dark:text-green-400 font-medium">
                      +{formatPercent(advantageSpread)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">Debit Rate</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted">
                        {formatPercent(debitRate)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
                        {formatPercent(debitRate - advantageSpread)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-green-700 dark:text-green-400 font-medium">
                      -{formatPercent(advantageSpread)}
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/30 bg-muted/20">
                    <td className="px-4 py-2.5 font-semibold">Effective Pooled Rate</td>
                    <td className="px-4 py-2.5 text-center">—</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 font-semibold">
                        {formatPercent(pooledRate)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pool summary */}
          <div className="rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Pool: {result.pool_code}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {result.members} active member{result.members !== 1 ? 's' : ''} in calculation
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Estimated Monthly Benefit</div>
                <div className="text-base font-semibold text-green-700 dark:text-green-400">
                  +{formatMoney(result.daily_interest_benefit * 30)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Pool Card ────────────────────────────────────────────────────────────────

interface PoolCardProps {
  pool: NotionalPool;
  onAddMember: (poolCode: string) => void;
}

function PoolCard({ pool, onAddMember }: PoolCardProps) {
  const [calcResult, setCalcResult] = useState<NotionalPoolCalcResult | null>(null);

  const { data: members = [], isLoading: membersLoading } = useNotionalPoolMembers(pool.poolCode);
  const calculateMutation = useCalculateNotionalPool();

  const activeMembers = members.filter((m) => m.isActive);
  const totalNotionalBalance = members.reduce((s, m) => s + m.balanceInBase, 0);

  const handleCalculate = () => {
    calculateMutation.mutate(pool.poolCode, {
      onSuccess: (data) => setCalcResult(data),
      onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to calculate notional pool'),
    });
  };

  return (
    <>
      <div className="surface-card shadow-sm overflow-hidden">
        {/* Pool header */}
        <div className="px-5 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">{pool.poolName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pool.poolCode} &middot; {pool.poolType.replace(/_/g, ' ')} &middot; {pool.baseCurrency}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCalculate}
                disabled={calculateMutation.isPending || members.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60"
              >
                {calculateMutation.isPending ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Calculator className="w-3.5 h-3.5" />
                )}
                Calculate
              </button>
              <button
                onClick={() => onAddMember(pool.poolCode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Member
              </button>
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                pool.isActive
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
              )}>
                {pool.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b">
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <DollarSign className="w-3.5 h-3.5" />
              Total Notional Balance
            </div>
            <div className="stat-value text-sm">
              {formatMoney(pool.netPoolBalance ?? totalNotionalBalance, pool.baseCurrency)}
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <Users className="w-3.5 h-3.5" />
              Pool Members
            </div>
            <div className="stat-value">{activeMembers.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <TrendingUp className="w-3.5 h-3.5" />
              Interest Benefit (MTD)
            </div>
            <div className="stat-value text-green-600 text-sm">
              {pool.interestBenefitMtd > 0
                ? `+${formatMoney(pool.interestBenefitMtd, pool.baseCurrency)}`
                : '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-1.5 stat-label">
              <CalendarDays className="w-3.5 h-3.5" />
              Last Calculation
            </div>
            <div className="stat-value text-sm">
              {pool.lastCalcDate
                ? new Date(pool.lastCalcDate).toLocaleDateString('en-NG', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })
                : 'Never'}
            </div>
          </div>
        </div>

        {/* Member table */}
        {membersLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No members yet. Add accounts to start pooling.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Account ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Account Name</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Individual Balance</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Balance in Base</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Notional Share %</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Interest Allocation</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((member) => {
                  const sharePercent =
                    totalNotionalBalance > 0
                      ? (member.balanceInBase / totalNotionalBalance) * 100
                      : 0;

                  return (
                    <tr key={member.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{member.accountId}</td>
                      <td className="px-4 py-2.5 font-medium">{member.memberName}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {formatMoney(member.currentBalance, member.accountCurrency)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs">
                        {formatMoney(member.balanceInBase, pool.baseCurrency)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(sharePercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono">{formatPercent(sharePercent)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {formatPercent(member.interestAllocationPct)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                            member.isActive
                              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                          )}
                        >
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculation results slide-out */}
      {calcResult && (
        <CalcResultsPanel
          result={calcResult}
          pool={pool}
          onClose={() => setCalcResult(null)}
        />
      )}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function NotionalPoolPage() {
  useEffect(() => { document.title = 'Notional Pooling | CBS'; }, []);
  const [addMemberPoolCode, setAddMemberPoolCode] = useState<string | null>(null);

  const { data: pools = [], isLoading } = useNotionalPools();

  return (
    <div>
      <PageHeader
        title="Notional Pooling"
        subtitle="Optimize interest through notional balance aggregation"
      />

      <div className="page-container space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Active Pools</div>
            <div className="stat-value">{pools.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pool Types</div>
            <div className="stat-value text-sm">
              {[...new Set(pools.map((p) => p.poolType))].length || 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Net Balance</div>
            <div className="stat-value text-sm">
              {formatMoney(pools.reduce((s, p) => s + (p.netPoolBalance ?? 0), 0))}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Interest Benefit (MTD)</div>
            <div className="stat-value text-green-600 text-sm">
              +{formatMoney(pools.reduce((s, p) => s + (p.interestBenefitMtd ?? 0), 0))}
            </div>
          </div>
        </div>

        {/* Pool cards */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No notional pools configured yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a notional pool via the API to start interest optimization.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pools.map((pool) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                onAddMember={setAddMemberPoolCode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      {addMemberPoolCode && (
        <AddMemberDialog
          poolCode={addMemberPoolCode}
          onClose={() => setAddMemberPoolCode(null)}
        />
      )}
    </div>
  );
}
