import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, Hand, PlusCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import type { SavingsGoal } from '../api/goalApi';
import { GoalProgressCircle } from './GoalProgressCircle';
import { MilestoneIndicator } from './MilestoneIndicator';
import { QuickContributeDialog } from './QuickContributeDialog';

interface GoalCardProps {
  goal: SavingsGoal;
  onCelebrate?: () => void;
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PAUSED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function timeRemaining(targetDate: string): { label: string; urgent: boolean; overdue: boolean } {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff < 0) return { label: 'Overdue', urgent: false, overdue: true };
  const days = Math.ceil(diff / 86400000);
  if (days <= 7) return { label: `${days} day${days !== 1 ? 's' : ''} left`, urgent: true, overdue: false };
  const months = Math.round(days / 30);
  if (months <= 0) return { label: `${days} days left`, urgent: days <= 30, overdue: false };
  return { label: `${months} month${months !== 1 ? 's' : ''} left`, urgent: false, overdue: false };
}

export function GoalCard({ goal, onCelebrate }: GoalCardProps) {
  const navigate = useNavigate();
  const [showContribute, setShowContribute] = useState(false);

  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const time = timeRemaining(goal.targetDate);
  const isCompleted = goal.status === 'COMPLETED';
  const isPaused = goal.status === 'PAUSED';

  return (
    <>
      <div
        className={cn(
          'bg-card rounded-xl border p-5 flex flex-col gap-4 transition-all hover:shadow-md cursor-pointer relative overflow-hidden',
          isCompleted && 'border-amber-300 dark:border-amber-700',
          isPaused && 'opacity-60',
        )}
        onClick={() => navigate(`/accounts/goals/${goal.id}`)}
      >
        {/* Completed sparkle overlay */}
        {isCompleted && (
          <div className="absolute top-2 right-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
        )}

        {/* Paused overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center z-10 pointer-events-none rounded-xl">
            <span className="px-3 py-1 rounded-full bg-gray-500 text-white text-xs font-medium">Paused</span>
          </div>
        )}

        {/* Header: Icon + Name + Status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{goal.icon}</span>
            <div>
              <h3 className="font-semibold text-sm leading-tight">{goal.name}</h3>
              <span className={cn('mt-0.5 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', statusStyles[goal.status])}>
                {isCompleted ? 'Achieved' : goal.status}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Circle */}
        <div className="flex justify-center">
          <GoalProgressCircle percentage={pct} size="md" />
        </div>

        {/* Amounts */}
        <div className="text-center">
          <p className="text-sm font-bold tabular-nums">
            {formatMoneyCompact(goal.currentAmount)} / {formatMoneyCompact(goal.targetAmount)}
          </p>
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">{formatMoneyCompact(remaining)} remaining</p>
          )}
        </div>

        {/* Time + Funding method */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className={cn(time.overdue && 'text-red-600 font-medium', time.urgent && !time.overdue && 'text-red-600')}>
              {time.overdue ? (
                <span className="inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium dark:bg-red-900/30 dark:text-red-400">Overdue</span>
              ) : time.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {goal.fundingMethod === 'AUTO_DEBIT' && goal.autoDebit ? (
              <>
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span>{formatMoneyCompact(goal.autoDebit.amount)}/{goal.autoDebit.frequency.toLowerCase().slice(0, 2)}</span>
              </>
            ) : (
              <>
                <Hand className="w-3.5 h-3.5" />
                <span>Manual</span>
              </>
            )}
          </div>
        </div>

        {/* Milestones */}
        <div className="px-1 pb-1">
          <MilestoneIndicator percentage={pct} />
        </div>

        {/* Quick Contribute Button */}
        {!isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowContribute(true); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Quick Contribute
          </button>
        )}
        {isCompleted && (
          <div className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Goal Achieved!
          </div>
        )}
      </div>

      {showContribute && (
        <QuickContributeDialog
          goal={goal}
          onClose={() => setShowContribute(false)}
          onCompleted={onCelebrate}
        />
      )}
    </>
  );
}
