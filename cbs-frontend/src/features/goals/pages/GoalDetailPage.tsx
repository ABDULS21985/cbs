import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Target, Calendar, TrendingUp, Minus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared/TabsPage';
import { formatMoney } from '@/lib/formatters';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { GoalProgressCircle } from '../components/GoalProgressCircle';
import { ContributionHistoryTable } from '../components/ContributionHistoryTable';
import { AutoDebitConfigForm } from '../components/AutoDebitConfigForm';
import { GoalCelebration } from '../components/GoalCelebration';
import {
  getGoalById, getGoalContributions, contributeToGoal,
  updateAutoDebit,
} from '../api/goalApi';
import type { AutoDebitConfig } from '../api/goalApi';

export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCelebration, setShowCelebration] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeError, setContributeError] = useState('');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');

  const goalQuery = useQuery({
    queryKey: ['goal', id],
    queryFn: () => getGoalById(id!),
    enabled: !!id,
  });

  const contributionsQuery = useQuery({
    queryKey: ['goal-contributions', id],
    queryFn: () => getGoalContributions(id!),
    enabled: !!id,
  });

  const contributeMutation = useMutation({
    mutationFn: (amount: number) => contributeToGoal(id!, amount),
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      queryClient.invalidateQueries({ queryKey: ['goal-contributions', id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setContributeOpen(false);
      setContributeAmount('');
      if (updatedGoal.status === 'COMPLETED') {
        setShowCelebration(true);
      }
    },
  });

  const autoDebitMutation = useMutation({
    mutationFn: (config: AutoDebitConfig) => updateAutoDebit(id!, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
    },
  });

  const goal = goalQuery.data;
  const contributions = contributionsQuery.data ?? [];

  function submitContribution() {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) { setContributeError('Enter a valid amount'); return; }
    contributeMutation.mutate(amount);
  }

  function submitWithdraw() {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { setWithdrawError('Enter a valid amount'); return; }
    if (goal && amount > goal.currentAmount) {
      setWithdrawError(`Cannot withdraw more than ${formatMoney(goal.currentAmount)}`);
      return;
    }
    // Simulate withdrawal as a negative contribution
    contributeMutation.mutate(-amount);
    setWithdrawOpen(false);
    setWithdrawAmount('');
  }

  if (goalQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading goal...
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Target className="w-10 h-10 opacity-30" />
        <p className="font-medium">Goal not found</p>
        <button onClick={() => navigate('/accounts/goals')} className="text-primary text-sm hover:underline">
          Back to Goals
        </button>
      </div>
    );
  }

  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  // Build chart data from contributions
  const chartData = (() => {
    const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((c) => ({
      date: format(parseISO(c.date), 'dd MMM'),
      saved: c.runningTotal,
      target: goal.targetAmount,
    }));
  })();

  // Monthly needed (rough estimate)
  const monthsRemaining = Math.max(
    Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)),
    1,
  );
  const monthlyNeeded = remaining > 0 ? Math.ceil(remaining / monthsRemaining) : 0;

  const overviewContent = (
    <div className="page-container space-y-6">
      {/* Progress + Stats */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Progress circle */}
        <div className="flex flex-col items-center gap-3 bg-card rounded-xl border p-6 w-full lg:w-72">
          <GoalProgressCircle percentage={pct} size={200} />
          <p className="text-sm text-muted-foreground text-center">{goal.name}</p>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="stat-label flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Target
            </div>
            <div className="stat-value text-base">{formatMoney(goal.targetAmount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Saved
            </div>
            <div className="stat-value text-base text-green-600 dark:text-green-400">{formatMoney(goal.currentAmount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5" /> Remaining
            </div>
            <div className="stat-value text-base">{formatMoney(remaining)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Monthly Needed
            </div>
            <div className="stat-value text-base">{remaining > 0 ? formatMoney(monthlyNeeded) : '—'}</div>
            {remaining > 0 && (
              <div className="stat-change text-muted-foreground text-xs">
                Target: {formatDate(goal.targetDate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Savings Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatMoney(value),
                  name === 'saved' ? 'Amount Saved' : 'Target',
                ]}
              />
              <Legend />
              <ReferenceLine y={goal.targetAmount} stroke="#22c55e" strokeDasharray="6 3" label={{ value: 'Target', position: 'right', fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="saved"
                name="saved"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  const contributionsContent = (
    <div className="page-container">
      <ContributionHistoryTable
        contributions={contributions}
        isLoading={contributionsQuery.isLoading}
      />
    </div>
  );

  const autoDebitContent = (
    <div className="page-container max-w-2xl">
      <AutoDebitConfigForm
        config={goal.autoDebit}
        onSave={async (config) => { await autoDebitMutation.mutateAsync(config); }}
        onCancel={() => {}}
        isLoading={autoDebitMutation.isPending}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title={`${goal.icon} ${goal.name}`}
        subtitle={`${goal.status} · Account ${goal.sourceAccountNumber}`}
        backTo="/accounts/goals"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWithdrawOpen(true)}
              disabled={goal.currentAmount <= 0}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
            >
              Withdraw
            </button>
            <button
              onClick={() => setContributeOpen(true)}
              disabled={goal.status === 'COMPLETED'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Contribute
            </button>
          </div>
        }
      />

      <TabsPage
        tabs={[
          { id: 'overview', label: 'Overview', content: overviewContent },
          { id: 'contributions', label: 'Contributions', badge: contributions.length, content: contributionsContent },
          { id: 'auto-debit', label: 'Auto-Debit', content: autoDebitContent },
        ]}
        defaultTab="overview"
      />

      {/* Celebration */}
      {showCelebration && (
        <GoalCelebration goal={goal} onClose={() => setShowCelebration(false)} />
      )}

      {/* Contribute dialog */}
      {contributeOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setContributeOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4">
              <h3 className="text-lg font-semibold">Contribute to Goal</h3>
              <p className="text-sm text-muted-foreground">
                Remaining: <strong>{formatMoney(remaining)}</strong>
              </p>
              <div>
                <label className="text-sm font-medium">Amount (₦)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                  <input
                    type="number"
                    value={contributeAmount}
                    onChange={(e) => { setContributeAmount(e.target.value); setContributeError(''); }}
                    placeholder="50,000"
                    className={cn(
                      'w-full rounded-lg border bg-background pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                      contributeError && 'border-red-500',
                    )}
                    autoFocus
                  />
                </div>
                {contributeError && <p className="text-xs text-red-500 mt-0.5">{contributeError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setContributeOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitContribution}
                  disabled={contributeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {contributeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Withdraw dialog */}
      {withdrawOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setWithdrawOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Withdraw from Goal</h3>
                  <p className="text-xs text-muted-foreground">This will reduce your savings progress.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Available: <strong>{formatMoney(goal.currentAmount)}</strong>
              </p>
              <div>
                <label className="text-sm font-medium">Amount (₦)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(''); }}
                    placeholder="50,000"
                    className={cn(
                      'w-full rounded-lg border bg-background pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                      withdrawError && 'border-red-500',
                    )}
                    autoFocus
                  />
                </div>
                {withdrawError && <p className="text-xs text-red-500 mt-0.5">{withdrawError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWithdrawOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitWithdraw}
                  disabled={contributeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {contributeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
