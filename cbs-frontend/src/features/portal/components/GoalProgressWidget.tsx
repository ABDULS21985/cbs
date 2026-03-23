import { Link } from 'react-router-dom';
import { Target, ArrowUpRight } from 'lucide-react';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { GoalSummary } from '../types/dashboard';

interface GoalProgressWidgetProps {
  goals: GoalSummary[];
}

function monthsRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(0, months);
}

function monthlyNeeded(goal: GoalSummary): string | null {
  const months = monthsRemaining(goal.targetDate);
  if (!months || months === 0) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return null;
  const monthly = remaining / months;
  return formatMoneyCompact(monthly, goal.currencyCode) + '/month';
}

export function GoalProgressWidget({ goals }: GoalProgressWidgetProps) {
  if (goals.length === 0) {
    return (
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-4">Savings Goals</h3>
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <Target className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No active goals</p>
          <p className="text-xs">Create a savings goal to start tracking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Savings Goals</h3>
        <span className="text-xs text-muted-foreground">{goals.length} active</span>
      </div>
      <div className="space-y-4">
        {goals.map((goal) => {
          const pct = Math.min(goal.progressPercentage, 100);
          const needed = monthlyNeeded(goal);
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{goal.goalIcon || '🎯'}</span>
                  <span className="text-sm font-medium truncate">{goal.goalName}</span>
                </div>
                <span className="text-xs font-mono font-medium flex-shrink-0">
                  {formatMoneyCompact(goal.currentAmount, goal.currencyCode)}
                  <span className="text-muted-foreground"> / {formatMoneyCompact(goal.targetAmount, goal.currencyCode)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {pct.toFixed(0)}% complete
                  {needed && ` · ${needed} needed`}
                </span>
                <Link
                  to={`/portal/goals/${goal.id}/fund`}
                  className="inline-flex items-center gap-0.5 text-xs text-primary font-medium hover:underline"
                >
                  Top up <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
