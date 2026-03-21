import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, AlertTriangle, Target, Calendar, TrendingUp, Minus,
  Plus, ArrowDownCircle, CheckCircle, Clock, Trophy, Zap,
  Flame, BarChart3, X, Bot, Hand,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { format, parseISO, differenceInDays, addMonths } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable, StatusBadge, StatCard } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { GoalProgressCircle } from '../components/GoalProgressCircle';
import { GoalCelebration } from '../components/GoalCelebration';
import { goalApi } from '../api/goalApi';
import type { SavingsGoal, GoalTransaction, GoalFundRequest } from '../api/goalApi';
import { useGoalDetail, useGoalContributions, goalQueryKeys } from '../hooks/useGoals';
import { useHasRole } from '@/hooks/usePermission';

// ─── Contribute Sheet ───────────────────────────────────────────────────────

function ContributeSheet({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [error, setError] = useState('');
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  const mutation = useMutation({
    mutationFn: (payload: GoalFundRequest) => goalApi.contribute(goal.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.detail(goal.id) });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.contributions(goal.id) });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.all });
      toast.success(`${formatMoney(Number(amount))} contributed!`);
      onClose();
    },
  });

  const parsedAmount = parseFloat(amount) || 0;
  const newTotal = goal.currentAmount + parsedAmount;
  const newPct = Math.min((newTotal / goal.targetAmount) * 100, 100);
  const completesGoal = newTotal >= goal.targetAmount;

  const quickAmounts = [10000, 50000, 100000, 500000];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Contribute to Goal</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Mini progress */}
          <div className="flex items-center gap-4">
            <GoalProgressCircle percentage={goal.progressPercentage} size={64} />
            <div>
              <p className="text-sm font-semibold">{goal.goalName}</p>
              <p className="text-xs text-muted-foreground">{formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}</p>
            </div>
          </div>

          {/* Quick amounts */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Select</label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((a) => (
                <button key={a} type="button" onClick={() => { setAmount(String(a)); setError(''); }}
                  className={cn('px-2 py-2 rounded-lg border text-xs font-medium transition-colors',
                    amount === String(a) ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}>
                  {formatMoney(a).replace('.00', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-sm font-medium">Amount</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{goal.currencyCode}</span>
              <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                placeholder="Enter amount" className={cn('w-full rounded-lg border bg-background pl-12 pr-3 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/30', error && 'border-red-500')}
                onKeyDown={(e) => e.key === 'Enter' && parsedAmount > 0 && mutation.mutate({ amount: parsedAmount, narration: narration || undefined })} autoFocus />
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Narration */}
          <div>
            <label className="text-sm font-medium">Narration (Optional)</label>
            <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g., Monthly savings" maxLength={300}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mt-1" />
          </div>

          {/* Preview */}
          {parsedAmount > 0 && (
            <div className={cn('rounded-xl border p-4 space-y-2', completesGoal ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : 'bg-muted/20')}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After contribution:</span>
                <span className="font-bold font-mono">{formatMoney(Math.min(newTotal, goal.targetAmount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-bold">{newPct.toFixed(1)}%</span>
              </div>
              {completesGoal && (
                <div className="flex items-center gap-2 text-green-600 font-semibold text-sm pt-1">
                  <Trophy className="w-4 h-4" /> This completes your goal!
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t">
          <button onClick={() => {
            if (parsedAmount <= 0) { setError('Enter a valid amount'); return; }
            mutation.mutate({ amount: parsedAmount, narration: narration || undefined });
          }} disabled={mutation.isPending || parsedAmount <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {mutation.isPending ? 'Contributing...' : `Contribute ${parsedAmount > 0 ? formatMoney(parsedAmount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Withdraw Sheet ─────────────────────────────────────────────────────────

function WithdrawSheet({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: GoalFundRequest) => goalApi.withdraw(goal.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.detail(goal.id) });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.contributions(goal.id) });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.all });
      toast.success('Withdrawal processed');
      onClose();
    },
    onError: () => toast.error('Withdrawal failed'),
  });

  const parsedAmount = parseFloat(amount) || 0;
  const newTotal = Math.max(goal.currentAmount - parsedAmount, 0);
  const newPct = (newTotal / goal.targetAmount) * 100;
  const oldPct = goal.progressPercentage;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Withdraw from Goal</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {goal.isLocked && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">This goal is locked. Withdrawals are not permitted.</p>
            </div>
          )}

          {!goal.allowWithdrawalBeforeTarget && goal.status !== 'COMPLETED' && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">Withdrawals are not allowed until the goal target is reached.</p>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Withdrawing will reduce your progress. You may fall behind schedule.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Amount ({goal.currencyCode})</label>
            <p className="text-xs text-muted-foreground mb-1">Available: {formatMoney(goal.currentAmount)}</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{goal.currencyCode}</span>
              <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                max={goal.currentAmount} className={cn('w-full rounded-lg border bg-background pl-12 pr-3 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/30', error && 'border-red-500')}
                onKeyDown={(e) => e.key === 'Enter' && parsedAmount > 0 && mutation.mutate({ amount: parsedAmount, narration: narration || undefined })} autoFocus />
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Narration */}
          <div>
            <label className="text-sm font-medium">Narration (Optional)</label>
            <input type="text" value={narration} onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g., Emergency withdrawal" maxLength={300}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mt-1" />
          </div>

          {parsedAmount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 dark:bg-amber-900/5 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">After withdrawal:</span>
                <span className="font-bold font-mono">{formatMoney(newTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-bold">{newPct.toFixed(1)}% <span className="text-red-500 text-xs">(was {oldPct.toFixed(1)}%)</span></span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t">
          <button onClick={() => {
            if (goal.isLocked) { setError('Goal is locked'); return; }
            if (!goal.allowWithdrawalBeforeTarget && goal.status !== 'COMPLETED') { setError('Withdrawals not allowed before target'); return; }
            if (parsedAmount <= 0) { setError('Enter a valid amount'); return; }
            if (parsedAmount > goal.currentAmount) { setError(`Max: ${formatMoney(goal.currentAmount)}`); return; }
            mutation.mutate({ amount: parsedAmount, narration: narration || undefined });
          }} disabled={mutation.isPending || parsedAmount <= 0 || goal.isLocked}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
            {mutation.isPending ? 'Processing...' : `Withdraw ${parsedAmount > 0 ? formatMoney(parsedAmount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Transaction Columns ─────────────────────────────────────────────────────

const txnTypeStyles: Record<string, { label: string; color: string }> = {
  DEPOSIT: { label: 'Deposit', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  WITHDRAWAL: { label: 'Withdrawal', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  INTEREST: { label: 'Interest', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PENALTY: { label: 'Penalty', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  REVERSAL: { label: 'Reversal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const contributionCols: ColumnDef<GoalTransaction, unknown>[] = [
  { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span> },
  {
    accessorKey: 'transactionType', header: 'Type',
    cell: ({ row }) => {
      const style = txnTypeStyles[row.original.transactionType] ?? txnTypeStyles.DEPOSIT;
      return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', style.color)}>
          {style.label}
        </span>
      );
    },
  },
  {
    accessorKey: 'amount', header: 'Amount',
    cell: ({ row }) => {
      const isCredit = row.original.transactionType === 'DEPOSIT' || row.original.transactionType === 'INTEREST';
      return <span className={cn('font-mono text-sm font-semibold', isCredit ? 'text-green-600' : 'text-red-600')}>{isCredit ? '+' : '-'}{formatMoney(row.original.amount)}</span>;
    },
  },
  { accessorKey: 'narration', header: 'Narration', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.narration || '—'}</span> },
  { accessorKey: 'runningBalance', header: 'Balance', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.runningBalance)}</span> },
  { accessorKey: 'transactionRef', header: 'Reference', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.transactionRef || '—'}</span> },
];

// ─── Contribution Calendar ──────────────────────────────────────────────────

function ContributionCalendar({ contributions }: { contributions: GoalTransaction[] }) {
  const days = useMemo(() => {
    const map = new Map<string, number>();
    contributions.filter(c => c.transactionType === 'DEPOSIT').forEach((c) => {
      const key = c.createdAt.split('T')[0];
      map.set(key, (map.get(key) ?? 0) + c.amount);
    });
    const result: Array<{ date: string; amount: number }> = [];
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, amount: map.get(key) ?? 0 });
    }
    return result;
  }, [contributions]);

  const maxAmount = Math.max(...days.map((d) => d.amount), 1);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">Contribution Activity (90 days)</h3>
      <div className="flex flex-wrap gap-[3px]">
        {days.map((day) => {
          const intensity = day.amount / maxAmount;
          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.amount > 0 ? formatMoney(day.amount) : 'No contribution'}`}
              className={cn('w-3 h-3 rounded-sm transition-colors',
                day.amount === 0 ? 'bg-muted' :
                intensity > 0.75 ? 'bg-green-600' :
                intensity > 0.5 ? 'bg-green-500' :
                intensity > 0.25 ? 'bg-green-400' : 'bg-green-300',
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div key={i} className={cn('w-3 h-3 rounded-sm',
            i === 0 ? 'bg-muted' : i <= 0.25 ? 'bg-green-300' : i <= 0.5 ? 'bg-green-400' : i <= 0.75 ? 'bg-green-500' : 'bg-green-600')} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Savings Projection ─────────────────────────────────────────────────────

function SavingsProjection({ goal }: { goal: SavingsGoal }) {
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const currentMonthly = goal.autoDebitAmount ?? 0;

  const scenarios = useMemo(() => {
    if (remaining <= 0 || !goal.targetDate) return [];
    const amounts = [
      currentMonthly > 0 ? Math.round(currentMonthly * 0.65) : 300000,
      currentMonthly > 0 ? currentMonthly : 467000,
      currentMonthly > 0 ? Math.round(currentMonthly * 1.3) : 600000,
    ];
    return amounts.map((monthly) => {
      const months = Math.ceil(remaining / monthly);
      const eta = addMonths(new Date(), months);
      const targetDate = new Date(goal.targetDate!);
      const ahead = differenceInDays(targetDate, eta);
      return { monthly, months, eta: format(eta, 'MMM yyyy'), ahead, emoji: ahead > 0 ? '✅' : ahead > -30 ? '⚠️' : '🚀' };
    });
  }, [remaining, currentMonthly, goal.targetDate]);

  if (remaining <= 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> What-If Scenarios</h3>
      {scenarios.map((s, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border">
          <span className="text-lg">{s.emoji}</span>
          <div className="flex-1">
            <p className="text-sm">
              At <span className="font-mono font-bold">{formatMoney(s.monthly)}</span>/month
            </p>
            <p className="text-xs text-muted-foreground">
              Goal reached {s.eta} ({s.months} months) — {s.ahead > 0 ? `${s.ahead} days ahead` : s.ahead === 0 ? 'on target' : `${Math.abs(s.ahead)} days late`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Insights Panel ─────────────────────────────────────────────────────────

function InsightsPanel({ goal, contributions }: { goal: SavingsGoal; contributions: GoalTransaction[] }) {
  const pct = goal.progressPercentage;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const deposits = contributions.filter(c => c.transactionType === 'DEPOSIT');

  const monthlyTotals = useMemo(() => {
    const map = new Map<string, number>();
    deposits.forEach((c) => {
      const month = c.createdAt.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + c.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [deposits]);
  const bestMonth = monthlyTotals[0];

  const streak = useMemo(() => {
    const months = new Set(deposits.map((c) => c.createdAt.slice(0, 7)));
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, 'yyyy-MM');
      if (months.has(key)) count++;
      else break;
    }
    return count;
  }, [deposits]);

  const avgContribution = deposits.length > 0 ? deposits.reduce((s, c) => s + c.amount, 0) / deposits.length : 0;

  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
  const expectedSaved = targetDate
    ? (goal.targetAmount / (differenceInDays(targetDate, new Date(goal.createdAt)) / 30)) * ((Date.now() - new Date(goal.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0;
  const diff = goal.currentAmount - expectedSaved;
  const monthsToTarget = targetDate ? Math.max(differenceInDays(targetDate, new Date()) / 30, 1) : 1;

  return (
    <div className="space-y-4">
      {targetDate && (
        <div className={cn('rounded-xl border p-5 flex items-center gap-4', diff >= 0 ? 'border-green-200 bg-green-50/30 dark:bg-green-900/5' : 'border-amber-200 bg-amber-50/30 dark:bg-amber-900/5')}>
          {diff >= 0 ? <CheckCircle className="w-8 h-8 text-green-500" /> : <AlertTriangle className="w-8 h-8 text-amber-500" />}
          <div>
            <p className="text-sm font-semibold">{diff >= 0 ? `You're ${formatMoney(Math.abs(diff))} ahead of schedule` : `You're ${formatMoney(Math.abs(diff))} behind schedule`}</p>
            <p className="text-xs text-muted-foreground">{diff >= 0 ? 'Keep up the great work!' : 'Consider increasing your contributions'}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {bestMonth && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Best Month</span>
            </div>
            <p className="text-lg font-bold font-mono">{formatMoney(bestMonth[1])}</p>
            <p className="text-xs text-muted-foreground">{format(parseISO(`${bestMonth[0]}-01`), 'MMMM yyyy')}</p>
          </div>
        )}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Streak</span>
          </div>
          <p className="text-lg font-bold">{streak} month{streak !== 1 ? 's' : ''}</p>
          <p className="text-xs text-muted-foreground">consecutive contributions</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Avg Contribution</span>
          </div>
          <p className="text-lg font-bold font-mono">{formatMoney(avgContribution)}</p>
          <p className="text-xs text-muted-foreground">per deposit</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Transactions</span>
          </div>
          <p className="text-lg font-bold">{contributions.length}</p>
          <p className="text-xs text-muted-foreground">{deposits.length} deposits, {contributions.filter((c) => c.transactionType === 'WITHDRAWAL').length} withdrawals</p>
        </div>
      </div>

      {remaining > 0 && goal.autoDebitEnabled && goal.autoDebitAmount && (
        <div className="rounded-xl border bg-card p-5 flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Optimization Suggestion</p>
            <p className="text-xs text-muted-foreground mt-1">
              Increase your auto-debit by {formatMoney(Math.ceil(remaining / Math.max(monthsToTarget - 2, 1)) - goal.autoDebitAmount)} to finish 2 months early.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auto-Debit Status ──────────────────────────────────────────────────────

function AutoDebitTab({ goal }: { goal: SavingsGoal }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(goal.autoDebitAmount ?? ''));
  const [frequency, setFrequency] = useState(goal.autoDebitFrequency ?? 'MONTHLY');

  const mutation = useMutation({
    mutationFn: (config: Record<string, unknown>) => goalApi.configureAutoDebit(goal.id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.detail(goal.id) });
      queryClient.invalidateQueries({ queryKey: goalQueryKeys.all });
      toast.success('Auto-debit updated');
      setEditing(false);
    },
  });

  const fc = 'w-full px-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';

  return (
    <div className="space-y-6 max-w-2xl">
      {goal.autoDebitEnabled ? (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Auto-Debit Configuration</h3>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
              🟢 ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground text-xs">Amount</span><p className="font-mono font-bold text-lg">{formatMoney(goal.autoDebitAmount ?? 0)}</p></div>
            <div><span className="text-muted-foreground text-xs">Frequency</span><p className="font-medium">{goal.autoDebitFrequency ?? '—'}</p></div>
            <div><span className="text-muted-foreground text-xs">Source Account</span><p className="font-mono">{goal.accountNumber}</p></div>
            <div><span className="text-muted-foreground text-xs">Next Debit</span><p className="font-medium">{goal.nextAutoDebitDate ? formatDate(goal.nextAutoDebitDate) : '—'}</p></div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(!editing)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              {editing ? 'Cancel' : 'Modify'}
            </button>
            <button onClick={() => mutation.mutate({ autoDebitEnabled: false })}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted text-amber-600">
              Disable Auto-Debit
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6 text-center space-y-3">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No auto-debit configured</p>
          <p className="text-xs text-muted-foreground">Set up automatic contributions to stay on track</p>
          <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Set Up Auto-Debit
          </button>
        </div>
      )}

      {editing && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h4 className="text-sm font-semibold">Configure Auto-Debit</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount ({goal.currencyCode})</label>
              <input type="number" className={fc} value={amount} onChange={(e) => setAmount(e.target.value)} min={100} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Frequency</label>
              <select className={fc} value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BI_WEEKLY">Bi-Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          {parseFloat(amount) > 0 && (
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                At {formatMoney(parseFloat(amount))}/{frequency.toLowerCase().replace('_', '-')}, you'll reach your goal in{' '}
                <span className="font-bold text-foreground">
                  {Math.ceil((goal.targetAmount - goal.currentAmount) / (parseFloat(amount) * (frequency === 'DAILY' ? 30 : frequency === 'WEEKLY' ? 4 : frequency === 'BI_WEEKLY' ? 2 : 1)))} months
                </span>
              </p>
            </div>
          )}

          <button onClick={() => {
            const amt = parseFloat(amount);
            if (!amt || amt < 100) { toast.error('Minimum amount is 100'); return; }
            mutation.mutate({
              autoDebitEnabled: true,
              autoDebitAmount: amt,
              autoDebitFrequency: frequency,
              autoDebitAccountId: goal.accountId,
            });
          }} disabled={mutation.isPending}
            className="btn-primary flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Configuration
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Goal Detail | CBS'; }, []);

  const [showCelebration, setShowCelebration] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const goalQuery = useGoalDetail(id!);
  const contributionsQuery = useGoalContributions(id!);

  const goal = goalQuery.data;
  const contributions = contributionsQuery.data ?? [];

  if (goalQuery.isLoading) {
    return <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading goal...</div>;
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Target className="w-10 h-10 opacity-30" />
        <p className="font-medium">Goal not found</p>
        <button onClick={() => navigate('/accounts/goals')} className="text-primary text-sm hover:underline">Back to Goals</button>
      </div>
    );
  }

  const pct = goal.progressPercentage;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthsRemaining = goal.targetDate
    ? Math.max(Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)), 1)
    : 0;
  const monthlyNeeded = remaining > 0 && monthsRemaining > 0 ? Math.ceil(remaining / monthsRemaining) : 0;
  const canWithdraw = !goal.isLocked && (goal.allowWithdrawalBeforeTarget || goal.status === 'COMPLETED');

  const chartData = useMemo(() => {
    const deposits = [...contributions].filter(c => c.transactionType === 'DEPOSIT' || c.transactionType === 'INTEREST')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return deposits.map((c) => ({
      date: format(parseISO(c.createdAt), 'dd MMM'),
      saved: c.runningBalance,
      target: goal.targetAmount,
    }));
  }, [contributions, goal.targetAmount]);

  const milestones = [25, 50, 75, 100].map((m) => ({
    pct: m, amount: (goal.targetAmount * m) / 100,
    reached: pct >= m,
  }));

  const isActive = goal.status === 'ACTIVE';
  const canModify = useHasRole(['CBS_ADMIN', 'CBS_OFFICER', 'PORTAL_USER']);

  const tabs = [
    {
      id: 'progress',
      label: 'Progress',
      content: (
        <div className="p-4 space-y-6">
          {chartData.length > 1 && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Savings Growth</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="savedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [formatMoney(value), name === 'saved' ? 'Amount Saved' : 'Target']} />
                  <ReferenceLine y={goal.targetAmount} stroke="#22c55e" strokeDasharray="6 3" label={{ value: 'Target', position: 'right', fontSize: 11 }} />
                  <Area type="monotone" dataKey="saved" name="saved" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#savedGradient)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <SavingsProjection goal={goal} />
          <ContributionCalendar contributions={contributions} />
        </div>
      ),
    },
    {
      id: 'contributions',
      label: 'Transactions',
      badge: contributions.length || undefined,
      content: (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{contributions.length}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Average Deposit</p>
              <p className="text-lg font-bold font-mono">{formatMoney(
                (() => { const deps = contributions.filter(c => c.transactionType === 'DEPOSIT'); return deps.length > 0 ? deps.reduce((s, c) => s + c.amount, 0) / deps.length : 0; })()
              )}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Largest Deposit</p>
              <p className="text-lg font-bold font-mono">{formatMoney(Math.max(...contributions.filter(c => c.transactionType === 'DEPOSIT').map((c) => c.amount), 0))}</p>
            </div>
          </div>
          <DataTable columns={contributionCols} data={contributions} isLoading={contributionsQuery.isLoading} enableGlobalFilter enableExport exportFilename={`goal-${id}-transactions`} emptyMessage="No transactions yet" />
        </div>
      ),
    },
    {
      id: 'auto-debit',
      label: 'Auto-Debit',
      content: <div className="p-4"><AutoDebitTab goal={goal} /></div>,
    },
    {
      id: 'insights',
      label: 'Insights',
      content: <div className="p-4"><InsightsPanel goal={goal} contributions={contributions} /></div>,
    },
  ];

  // Add interest tab if goal is interest-bearing
  if (goal.interestBearing) {
    tabs.splice(3, 0, {
      id: 'interest',
      label: 'Interest',
      content: (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="text-lg font-bold">{goal.interestRate}% p.a.</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">Accrued Interest</p>
              <p className="text-lg font-bold font-mono text-green-600">{formatMoney(goal.accruedInterest)}</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold font-mono">{formatMoney(goal.currentAmount + goal.accruedInterest)}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">Interest transactions</p>
            <DataTable
              columns={contributionCols}
              data={contributions.filter(c => c.transactionType === 'INTEREST')}
              isLoading={contributionsQuery.isLoading}
              emptyMessage="No interest accrued yet"
              pageSize={10}
            />
          </div>
        </div>
      ),
    });
  }

  return (
    <>
      {showCelebration && <GoalCelebration goalName={goal.goalName} onClose={() => setShowCelebration(false)} />}
      {showContribute && <ContributeSheet goal={goal} onClose={() => setShowContribute(false)} />}
      {showWithdraw && <WithdrawSheet goal={goal} onClose={() => setShowWithdraw(false)} />}

      <PageHeader
        title={`${goal.goalIcon || '🎯'} ${goal.goalName}`}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusBadge status={goal.status} dot />
            <span className="text-xs font-mono text-muted-foreground">{goal.goalNumber}</span>
            {goal.autoDebitEnabled && goal.autoDebitAmount && (
              <span className="text-xs">Auto-debit: {formatMoney(goal.autoDebitAmount)}/{(goal.autoDebitFrequency ?? 'MONTHLY').toLowerCase().replace('_', '-')}</span>
            )}
            <span className="text-xs text-muted-foreground">Created {formatDate(goal.createdAt)}</span>
          </span>
        }
        backTo="/accounts/goals"
        actions={
          canModify ? (
            <div className="flex items-center gap-2">
              {canWithdraw && (
                <button onClick={() => setShowWithdraw(true)} disabled={goal.currentAmount <= 0}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40">
                  Withdraw
                </button>
              )}
              {isActive && (
                <button onClick={() => setShowContribute(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                  <Plus className="w-4 h-4" /> Contribute
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="page-container space-y-6">
        {/* Goal details row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border bg-card p-3">
            <span className="text-xs text-muted-foreground">Customer</span>
            <p className="font-medium">{goal.customerDisplayName}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <span className="text-xs text-muted-foreground">Account</span>
            <p className="font-mono">{goal.accountNumber}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <span className="text-xs text-muted-foreground">Currency</span>
            <p className="font-medium">{goal.currencyCode}</p>
          </div>
        </div>

        {/* Progress Hero */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <GoalProgressCircle percentage={pct} size={180} />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground">Target</p><p className="text-lg font-bold font-mono">{formatMoney(goal.targetAmount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Saved</p><p className="text-lg font-bold font-mono text-green-600">{formatMoney(goal.currentAmount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Remaining</p><p className="text-lg font-bold font-mono">{formatMoney(remaining)}</p></div>
              <div><p className="text-xs text-muted-foreground">Monthly Needed</p><p className="text-lg font-bold font-mono">{monthlyNeeded > 0 ? formatMoney(monthlyNeeded) : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Target Date</p><p className="text-sm font-medium">{goal.targetDate ? formatDate(goal.targetDate) : 'No deadline'}</p></div>
              <div><p className="text-xs text-muted-foreground">ETA</p><p className="text-sm font-medium">{remaining > 0 && monthsRemaining > 0 ? `${monthsRemaining} months` : remaining <= 0 ? 'Completed!' : '—'}</p></div>
            </div>
          </div>

          {/* Lock / Withdrawal restrictions */}
          {(goal.isLocked || !goal.allowWithdrawalBeforeTarget) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {goal.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  🔒 Locked
                </span>
              )}
              {!goal.allowWithdrawalBeforeTarget && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  No early withdrawal
                </span>
              )}
            </div>
          )}

          {/* Milestones */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              {milestones.map((m) => (
                <div key={m.pct} className="flex flex-col items-center gap-1">
                  <div className={cn('w-4 h-4 rounded-full border-2',
                    m.reached ? 'bg-green-500 border-green-500' : pct >= m.pct - 5 ? 'border-primary bg-primary/20' : 'border-border bg-background')}>
                    {m.reached && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] font-mono font-medium">{formatMoney(m.amount)}</span>
                  <span className="text-[9px] text-muted-foreground">{m.pct}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center mt-1">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
