import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/shared';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { goalApi, type SavingsGoal, type GoalTransaction } from '../../api/goalApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoalProgressCircle } from '../GoalProgressCircle';
import { AchievementGrid, computeAchievements } from '../gamification/AchievementGrid';
import { LevelProgressBar } from '../gamification/LevelProgressBar';
import { SavingsStreak } from '../gamification/SavingsStreak';

interface CustomerGoalsTabProps {
  customerId: number;
}

export function CustomerGoalsTab({ customerId }: CustomerGoalsTabProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [contributeGoalId, setContributeGoalId] = useState<number | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', 'customer', customerId],
    queryFn: () => goalApi.getCustomerGoals(customerId),
    staleTime: 30_000,
  });

  // Gather all contributions across all goals
  const { data: allContributions = [] } = useQuery({
    queryKey: ['goals', 'contributions', 'customer', customerId],
    queryFn: async () => {
      const results = await Promise.all(goals.map((g) => goalApi.getContributions(g.id)));
      return results.flat();
    },
    enabled: goals.length > 0,
    staleTime: 60_000,
  });

  const contributeMutation = useMutation({
    mutationFn: ({ goalId, amount }: { goalId: number; amount: number }) =>
      goalApi.contribute(goalId, { amount }),
    onSuccess: () => {
      toast.success('Contribution recorded');
      qc.invalidateQueries({ queryKey: ['goals', 'customer', customerId] });
      setContributeGoalId(null);
      setContributeAmount('');
    },
    onError: () => toast.error('Contribution failed'),
  });

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completed = goals.filter((g) => g.status === 'COMPLETED');
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  // Streak
  const deposits = allContributions.filter(c => c.transactionType === 'DEPOSIT');
  const months = new Set(deposits.map((c) => c.createdAt.slice(0, 7)));
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months.has(key)) streak++;
    else break;
  }

  const earned = computeAchievements(goals, allContributions).filter((a) => a.earned);

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading goals...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active Goals" value={activeGoals.length} format="number" />
        <StatCard label="Total Saved" value={formatMoneyCompact(totalSaved)} />
        <StatCard label="Completed" value={completed.length} format="number" />
        <StatCard label="Streak" value={streak > 0 ? `${streak}mo` : '—'} />
      </div>

      {/* Achievements inline */}
      {earned.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Achievements:</span>
          {earned.map((a) => <span key={a.id} className="text-xl" title={a.name}>{a.icon}</span>)}
        </div>
      )}

      {/* Level */}
      <LevelProgressBar totalSaved={totalSaved} />

      {/* Goal cards */}
      {activeGoals.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">No active savings goals</p>
          <button onClick={() => navigate(`/accounts/goals/new?customerId=${customerId}`)}
            className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Create Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeGoals.map((goal) => {
            const pct = goal.progressPercentage;
            return (
              <div key={goal.id} className="surface-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{goal.goalIcon || '🎯'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{goal.goalName}</p>
                    <p className="text-xs text-muted-foreground">{formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn('text-lg font-bold tabular-nums', pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-blue-600')}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                {contributeGoalId === goal.id ? (
                  <div className="flex gap-2">
                    <input type="number" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} placeholder="Amount"
                      className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-sm" />
                    <button onClick={() => contributeMutation.mutate({ goalId: goal.id, amount: Number(contributeAmount) })}
                      disabled={contributeMutation.isPending || !contributeAmount}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setContributeGoalId(null)} className="px-2 py-1.5 rounded-lg border text-xs">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setContributeGoalId(goal.id)}
                    className="w-full px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
                    Contribute
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-debit summary */}
      {goals.filter((g) => g.autoDebitEnabled && g.autoDebitAmount).length > 0 && (
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">
            Auto-Debit: {goals.filter((g) => g.autoDebitEnabled).length} active
          </p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {goals.filter((g) => g.autoDebitEnabled && g.autoDebitAmount).map((g) => (
              <span key={g.id} className="text-xs bg-muted rounded px-2 py-0.5">
                {formatMoney(g.autoDebitAmount!)} {(g.autoDebitFrequency ?? 'MONTHLY').toLowerCase().replace('_', '-')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
