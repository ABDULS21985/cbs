import { useState } from 'react';
import { X, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { useContribute } from '../hooks/useGoals';
import type { SavingsGoal } from '../api/goalApi';
import { toast } from 'sonner';

interface QuickContributeDialogProps {
  goal: SavingsGoal;
  onClose: () => void;
  onCompleted?: () => void;
}

const QUICK_AMOUNTS = [5000, 10000, 50000, 100000];

export function QuickContributeDialog({ goal, onClose, onCompleted }: QuickContributeDialogProps) {
  const contribute = useContribute();
  const [amount, setAmount] = useState(0);
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const afterAmount = goal.currentAmount + amount;
  const afterPct = goal.targetAmount > 0 ? Math.min((afterAmount / goal.targetAmount) * 100, 100) : 0;
  const willComplete = amount > 0 && afterAmount >= goal.targetAmount;

  const handleSubmit = () => {
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }
    contribute.mutate(
      { goalId: goal.id, payload: { amount } },
      {
        onSuccess: (result) => {
          toast.success(`${formatMoney(amount)} contributed to ${goal.goalName}`);
          if (result?.status === 'COMPLETED' || willComplete) {
            onCompleted?.();
          }
          onClose();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>

        {/* Goal info */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{goal.goalIcon || '🎯'}</span>
          <div>
            <p className="text-sm font-semibold">{goal.goalName}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
            </p>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK_AMOUNTS.map((qa) => (
            <button
              key={qa}
              onClick={() => setAmount(qa)}
              className={cn(
                'py-2 text-xs font-medium rounded-lg border transition-colors',
                amount === qa ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/40',
              )}
            >
              {formatMoney(qa).replace('.00', '')}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-1">Custom Amount</label>
          <input
            type="number"
            step="100"
            min={0}
            max={remaining}
            value={amount || ''}
            onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full input"
            placeholder="Enter amount..."
          />
        </div>

        {/* Preview */}
        {amount > 0 && (
          <div className={cn('rounded-lg p-3 mb-4 text-sm', willComplete ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted/50')}>
            <p className="text-muted-foreground">
              After this contribution:{' '}
              <span className="font-medium text-foreground tabular-nums">{formatMoney(Math.min(afterAmount, goal.targetAmount))}</span>
              {' / '}{formatMoney(goal.targetAmount)}
              {' '}({afterPct.toFixed(1)}%)
            </p>
            {willComplete && (
              <p className="text-green-600 font-medium mt-1 flex items-center gap-1.5">
                <PartyPopper className="w-4 h-4" /> This will complete your goal!
              </p>
            )}
          </div>
        )}

        {/* Source account */}
        {goal.accountNumber && (
          <p className="text-xs text-muted-foreground mb-4">
            Source: <span className="font-mono">{goal.accountNumber}</span>
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={amount <= 0 || contribute.isPending}
          className="w-full btn-primary"
        >
          {contribute.isPending ? 'Contributing...' : `Contribute ${amount > 0 ? formatMoney(amount) : ''}`}
        </button>
      </div>
    </div>
  );
}
