import { Target, Wallet, CheckCircle, TrendingUp } from 'lucide-react';
import { formatMoneyCompact } from '@/lib/formatters';
import type { SavingsGoal } from '../api/goalApi';

interface GoalSummaryStripProps {
  goals: SavingsGoal[];
  isLoading: boolean;
}

export function GoalSummaryStrip({ goals, isLoading }: GoalSummaryStripProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  const active = goals.filter((g) => g.status === 'ACTIVE').length;
  const completed = goals.filter((g) => g.status === 'COMPLETED').length;
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const avgProgress = goals.length > 0
    ? goals.reduce((s, g) => s + g.progressPercentage, 0) / goals.length
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active Goals</p>
          <p className="text-xl font-bold tabular-nums">{active}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Total Saved</p>
        </div>
        <p className="text-lg font-bold tabular-nums">{formatMoneyCompact(totalSaved)}</p>
        <p className="text-xs text-muted-foreground">of {formatMoneyCompact(totalTarget)}</p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min(overallPct, 100)}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{overallPct.toFixed(1)}%</p>
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-xl font-bold tabular-nums">{completed}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Progress</p>
          <p className="text-xl font-bold tabular-nums">{avgProgress.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
}
