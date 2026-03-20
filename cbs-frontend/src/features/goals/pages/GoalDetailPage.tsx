import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, AlertTriangle, Target, Calendar, TrendingUp, Minus,
  Plus, ArrowDownCircle, CheckCircle, Clock, Trophy, Zap,
  Flame, BarChart3, X, Bot, Hand,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
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
import {
  getGoalById, getGoalContributions, contributeToGoal,
  updateAutoDebit,
} from '../api/goalApi';
import type { SavingsGoal, GoalContribution, AutoDebitConfig } from '../api/goalApi';
import { apiPost } from '@/lib/api';

// ─── Contribute Sheet ───────────────────────────────────────────────────────

function ContributeSheet({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  const mutation = useMutation({
    mutationFn: (amt: number) => contributeToGoal(goal.id, amt),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['goal', goal.id] });
      queryClient.invalidateQueries({ queryKey: ['goal-contributions', goal.id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success(`₦${Number(amount).toLocaleString()} contributed!`);
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
            <GoalProgressCircle percentage={Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)} size={64} />
            <div>
              <p className="text-sm font-semibold">{goal.name}</p>
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
                  ₦{(a / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-sm font-medium">Amount (₦)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
              <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                placeholder="Enter amount" className={cn('w-full rounded-lg border bg-background pl-7 pr-3 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/30', error && 'border-red-500')}
                onKeyDown={(e) => e.key === 'Enter' && parsedAmount > 0 && mutation.mutate(parsedAmount)} autoFocus />
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
            mutation.mutate(parsedAmount);
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
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (amt: number) => apiPost<SavingsGoal>(`/api/v1/goals/${goal.id}/withdraw`, { amount: amt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goal.id] });
      queryClient.invalidateQueries({ queryKey: ['goal-contributions', goal.id] });
      toast.success('Withdrawal processed');
      onClose();
    },
    onError: () => toast.error('Withdrawal failed'),
  });

  const parsedAmount = parseFloat(amount) || 0;
  const newTotal = Math.max(goal.currentAmount - parsedAmount, 0);
  const newPct = (newTotal / goal.targetAmount) * 100;
  const oldPct = (goal.currentAmount / goal.targetAmount) * 100;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Withdraw from Goal</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Withdrawing will reduce your progress. You may fall behind schedule.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Amount (₦)</label>
            <p className="text-xs text-muted-foreground mb-1">Available: {formatMoney(goal.currentAmount)}</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
              <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
                max={goal.currentAmount} className={cn('w-full rounded-lg border bg-background pl-7 pr-3 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-primary/30', error && 'border-red-500')}
                onKeyDown={(e) => e.key === 'Enter' && parsedAmount > 0 && mutation.mutate(parsedAmount)} autoFocus />
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
            if (parsedAmount <= 0) { setError('Enter a valid amount'); return; }
            if (parsedAmount > goal.currentAmount) { setError(`Max: ${formatMoney(goal.currentAmount)}`); return; }
            mutation.mutate(parsedAmount);
          }} disabled={mutation.isPending || parsedAmount <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
            {mutation.isPending ? 'Processing...' : `Withdraw ${parsedAmount > 0 ? formatMoney(parsedAmount) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contribution Columns ───────────────────────────────────────────────────

const contributionCols: ColumnDef<GoalContribution, unknown>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm font-semibold text-green-600">{formatMoney(row.original.amount)}</span> },
  { accessorKey: 'source', header: 'Source', cell: ({ row }) => <span className="text-xs">{row.original.source}</span> },
  {
    accessorKey: 'type', header: 'Type',
    cell: ({ row }) => (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
        row.original.type === 'AUTO' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
        {row.original.type === 'AUTO' ? <Bot className="w-3 h-3" /> : <Hand className="w-3 h-3" />}
        {row.original.type}
      </span>
    ),
  },
  { accessorKey: 'runningTotal', header: 'Running Total', cell: ({ row }) => <span className="font-mono text-sm font-medium">{formatMoney(row.original.runningTotal)}</span> },
];

// ─── Contribution Calendar ──────────────────────────────────────────────────

function ContributionCalendar({ contributions }: { contributions: GoalContribution[] }) {
  const days = useMemo(() => {
    const map = new Map<string, number>();
    contributions.forEach((c) => {
      const key = c.date.split('T')[0];
      map.set(key, (map.get(key) ?? 0) + c.amount);
    });
    // Last 90 days
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
  const currentMonthly = goal.autoDebit?.amount ?? 0;

  const scenarios = useMemo(() => {
    if (remaining <= 0) return [];
    const amounts = [
      currentMonthly > 0 ? Math.round(currentMonthly * 0.65) : 300000,
      currentMonthly > 0 ? currentMonthly : 467000,
      currentMonthly > 0 ? Math.round(currentMonthly * 1.3) : 600000,
    ];
    return amounts.map((monthly) => {
      const months = Math.ceil(remaining / monthly);
      const eta = addMonths(new Date(), months);
      const targetDate = new Date(goal.targetDate);
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

function InsightsPanel({ goal, contributions }: { goal: SavingsGoal; contributions: GoalContribution[] }) {
  const pct = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  // Best month
  const monthlyTotals = useMemo(() => {
    const map = new Map<string, number>();
    contributions.forEach((c) => {
      const month = c.date.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + c.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [contributions]);
  const bestMonth = monthlyTotals[0];

  // Streak
  const streak = useMemo(() => {
    const months = new Set(contributions.map((c) => c.date.slice(0, 7)));
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, 'yyyy-MM');
      if (months.has(key)) count++;
      else break;
    }
    return count;
  }, [contributions]);

  // Avg contribution
  const avgContribution = contributions.length > 0 ? contributions.reduce((s, c) => s + c.amount, 0) / contributions.length : 0;

  // Days ahead/behind
  const targetDate = new Date(goal.targetDate);
  const monthsToTarget = Math.max(differenceInDays(targetDate, new Date()) / 30, 1);
  const expectedSaved = (goal.targetAmount / (differenceInDays(targetDate, new Date(goal.createdAt)) / 30)) * ((Date.now() - new Date(goal.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000));
  const diff = goal.currentAmount - expectedSaved;

  return (
    <div className="space-y-4">
      {/* Pace */}
      <div className={cn('rounded-xl border p-5 flex items-center gap-4', diff >= 0 ? 'border-green-200 bg-green-50/30 dark:bg-green-900/5' : 'border-amber-200 bg-amber-50/30 dark:bg-amber-900/5')}>
        {diff >= 0 ? <CheckCircle className="w-8 h-8 text-green-500" /> : <AlertTriangle className="w-8 h-8 text-amber-500" />}
        <div>
          <p className="text-sm font-semibold">{diff >= 0 ? `You're ${formatMoney(Math.abs(diff))} ahead of schedule` : `You're ${formatMoney(Math.abs(diff))} behind schedule`}</p>
          <p className="text-xs text-muted-foreground">{diff >= 0 ? 'Keep up the great work!' : 'Consider increasing your contributions'}</p>
        </div>
      </div>

      {/* Stats grid */}
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
          <p className="text-xs text-muted-foreground">per contribution</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Contributions</span>
          </div>
          <p className="text-lg font-bold">{contributions.length}</p>
          <p className="text-xs text-muted-foreground">{contributions.filter((c) => c.type === 'AUTO').length} auto, {contributions.filter((c) => c.type === 'MANUAL').length} manual</p>
        </div>
      </div>

      {/* Suggestion */}
      {remaining > 0 && goal.autoDebit && (
        <div className="rounded-xl border bg-card p-5 flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Optimization Suggestion</p>
            <p className="text-xs text-muted-foreground mt-1">
              Increase your auto-debit by {formatMoney(Math.ceil(remaining / Math.max(monthsToTarget - 2, 1)) - goal.autoDebit.amount)} to finish 2 months early.
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
  const [amount, setAmount] = useState(String(goal.autoDebit?.amount ?? ''));
  const [frequency, setFrequency] = useState(goal.autoDebit?.frequency ?? 'MONTHLY');

  const mutation = useMutation({
    mutationFn: (config: AutoDebitConfig) => updateAutoDebit(goal.id, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', goal.id] });
      toast.success('Auto-debit updated');
      setEditing(false);
    },
  });

  const fc = 'w-full px-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 border-border';

  return (
    <div className="space-y-6 max-w-2xl">
      {goal.autoDebit ? (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Auto-Debit Configuration</h3>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold',
              goal.autoDebit.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
              {goal.autoDebit.status === 'ACTIVE' ? '🟢' : '⏸'} {goal.autoDebit.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground text-xs">Amount</span><p className="font-mono font-bold text-lg">{formatMoney(goal.autoDebit.amount)}</p></div>
            <div><span className="text-muted-foreground text-xs">Frequency</span><p className="font-medium">{goal.autoDebit.frequency}</p></div>
            <div><span className="text-muted-foreground text-xs">Source Account</span><p className="font-mono">{goal.sourceAccountNumber}</p></div>
            <div><span className="text-muted-foreground text-xs">Start Date</span><p className="font-medium">{formatDate(goal.autoDebit.startDate)}</p></div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(!editing)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
              {editing ? 'Cancel' : 'Modify Amount'}
            </button>
            <button onClick={() => mutation.mutate({ ...goal.autoDebit!, status: goal.autoDebit!.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' })}
              className={cn('px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted',
                goal.autoDebit.status === 'ACTIVE' ? 'text-amber-600' : 'text-green-600')}>
              {goal.autoDebit.status === 'ACTIVE' ? 'Pause' : 'Resume'}
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
              <label className="text-sm font-medium text-muted-foreground">Amount (₦)</label>
              <input type="number" className={fc} value={amount} onChange={(e) => setAmount(e.target.value)} min={100} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Frequency</label>
              <select className={fc} value={frequency} onChange={(e) => setFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          {/* Calculator */}
          {parseFloat(amount) > 0 && (
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground">
                At {formatMoney(parseFloat(amount))}/{frequency.toLowerCase()}, you'll reach your goal in{' '}
                <span className="font-bold text-foreground">
                  {Math.ceil((goal.targetAmount - goal.currentAmount) / (parseFloat(amount) * (frequency === 'DAILY' ? 30 : frequency === 'WEEKLY' ? 4 : 1)))} months
                </span>
              </p>
            </div>
          )}

          <button onClick={() => {
            const amt = parseFloat(amount);
            if (!amt || amt < 100) { toast.error('Minimum amount is ₦100'); return; }
            mutation.mutate({ amount: amt, frequency, startDate: goal.autoDebit?.startDate ?? new Date().toISOString().split('T')[0], status: 'ACTIVE' });
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

  const goalQuery = useQuery({ queryKey: ['goal', id], queryFn: () => getGoalById(id!), enabled: !!id });
  const contributionsQuery = useQuery({ queryKey: ['goal-contributions', id], queryFn: () => getGoalContributions(id!), enabled: !!id });

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

  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthsRemaining = Math.max(Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)), 1);
  const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / monthsRemaining) : 0;

  // Chart data
  const chartData = useMemo(() => {
    const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((c) => ({
      date: format(parseISO(c.date), 'dd MMM'),
      saved: c.runningTotal,
      target: goal.targetAmount,
    }));
  }, [contributions, goal.targetAmount]);

  // Milestones
  const milestones = [25, 50, 75, 100].map((m) => ({
    pct: m, amount: (goal.targetAmount * m) / 100,
    reached: pct >= m,
  }));

  const tabs = [
    {
      id: 'progress',
      label: 'Progress',
      content: (
        <div className="p-4 space-y-6">
          {/* Savings growth chart */}
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
                  <YAxis tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [formatMoney(value), name === 'saved' ? 'Amount Saved' : 'Target']} />
                  <ReferenceLine y={goal.targetAmount} stroke="#22c55e" strokeDasharray="6 3" label={{ value: 'Target', position: 'right', fontSize: 11 }} />
                  <Area type="monotone" dataKey="saved" name="saved" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#savedGradient)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Projection */}
          <SavingsProjection goal={goal} />

          {/* Calendar */}
          <ContributionCalendar contributions={contributions} />
        </div>
      ),
    },
    {
      id: 'contributions',
      label: 'Contributions',
      badge: contributions.length || undefined,
      content: (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{contributions.length}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-lg font-bold font-mono">{formatMoney(contributions.length > 0 ? contributions.reduce((s, c) => s + c.amount, 0) / contributions.length : 0)}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Largest</p>
              <p className="text-lg font-bold font-mono">{formatMoney(Math.max(...contributions.map((c) => c.amount), 0))}</p>
            </div>
          </div>
          <DataTable columns={contributionCols} data={contributions} isLoading={contributionsQuery.isLoading} enableGlobalFilter enableExport exportFilename={`goal-${id}-contributions`} emptyMessage="No contributions yet" />
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

  return (
    <>
      {showCelebration && <GoalCelebration goal={goal} onClose={() => setShowCelebration(false)} />}
      {showContribute && <ContributeSheet goal={goal} onClose={() => setShowContribute(false)} />}
      {showWithdraw && <WithdrawSheet goal={goal} onClose={() => setShowWithdraw(false)} />}

      <PageHeader
        title={`${goal.icon} ${goal.name}`}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusBadge status={goal.status} dot />
            {goal.autoDebit && <span className="text-xs">Auto-debit: {formatMoney(goal.autoDebit.amount)}/{goal.autoDebit.frequency.toLowerCase()}</span>}
            <span className="text-xs text-muted-foreground">Created {formatDate(goal.createdAt)}</span>
          </span>
        }
        backTo="/accounts/goals"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowWithdraw(true)} disabled={goal.currentAmount <= 0}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40">
              Withdraw
            </button>
            <button onClick={() => setShowContribute(true)} disabled={goal.status === 'COMPLETED'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
              <Plus className="w-4 h-4" /> Contribute
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Progress Hero */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <GoalProgressCircle percentage={pct} size={180} />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground">Target</p><p className="text-lg font-bold font-mono">{formatMoney(goal.targetAmount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Saved</p><p className="text-lg font-bold font-mono text-green-600">{formatMoney(goal.currentAmount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Remaining</p><p className="text-lg font-bold font-mono">{formatMoney(remaining)}</p></div>
              <div><p className="text-xs text-muted-foreground">Monthly Needed</p><p className="text-lg font-bold font-mono">{remaining > 0 ? formatMoney(monthlyNeeded) : '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Target Date</p><p className="text-sm font-medium">{formatDate(goal.targetDate)}</p></div>
              <div><p className="text-xs text-muted-foreground">ETA</p><p className="text-sm font-medium">{remaining > 0 ? `${monthsRemaining} months` : 'Completed!'}</p></div>
            </div>
          </div>

          {/* Milestones */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              {milestones.map((m, i) => (
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
