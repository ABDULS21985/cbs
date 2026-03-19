import { Calendar, Zap, Hand, Edit2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { formatDate } from '@/lib/formatters';
import type { SavingsGoal } from '../api/goalApi';

interface GoalCardProps {
  goal: SavingsGoal;
  onContribute: (id: string) => void;
  onEdit: (id: string) => void;
  onClick?: (id: string) => void;
}

function progressColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 75) return 'bg-blue-500';
  if (pct >= 50) return 'bg-primary';
  if (pct >= 25) return 'bg-amber-500';
  return 'bg-rose-400';
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAUSED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function GoalCard({ goal, onContribute, onEdit, onClick }: GoalCardProps) {
  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  return (
    <div
      className={cn(
        'bg-card rounded-xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(goal.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{goal.icon}</span>
          <div>
            <h3 className="font-semibold text-base leading-tight">{goal.name}</h3>
            <span className={cn('mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusStyles[goal.status] || '')}>
              {goal.status}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(goal.id); }}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Edit goal"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Amounts */}
      <div>
        <div className="flex items-end justify-between mb-1.5">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Saved</p>
            <p className="text-lg font-bold tabular-nums">{formatMoney(goal.currentAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Target</p>
            <p className="text-sm font-medium text-muted-foreground tabular-nums">{formatMoney(goal.targetAmount)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progressColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}% complete</span>
          {remaining > 0 && (
            <span className="text-xs text-muted-foreground">{formatMoney(remaining)} left</span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>By {formatDate(goal.targetDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {goal.fundingMethod === 'AUTO_DEBIT' && goal.autoDebit ? (
            <>
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>{formatMoney(goal.autoDebit.amount)}/{goal.autoDebit.frequency.toLowerCase()}</span>
            </>
          ) : (
            <>
              <Hand className="w-3.5 h-3.5" />
              <span>Manual</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {goal.status !== 'COMPLETED' && (
        <button
          onClick={(e) => { e.stopPropagation(); onContribute(goal.id); }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Contribute
        </button>
      )}
      {goal.status === 'COMPLETED' && (
        <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium">
          Goal Achieved!
        </div>
      )}
    </div>
  );
}
