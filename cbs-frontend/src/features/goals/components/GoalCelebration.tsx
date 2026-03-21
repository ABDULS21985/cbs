import { X, Trophy } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import type { SavingsGoal } from '../api/goalApi';

interface GoalCelebrationProps {
  goal?: SavingsGoal;
  goalName?: string;
  onClose: () => void;
}

// CSS-only confetti pieces
const CONFETTI_PIECES = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  left: `${Math.floor(Math.random() * 100)}%`,
  delay: `${(Math.random() * 1.5).toFixed(2)}s`,
  duration: `${(2 + Math.random() * 2).toFixed(2)}s`,
  color: ['#f59e0b', '#3b82f6', '#22c55e', '#f43f5e', '#a855f7', '#06b6d4'][i % 6],
  size: `${6 + Math.floor(Math.random() * 8)}px`,
  rotate: `${Math.floor(Math.random() * 360)}deg`,
}));

export function GoalCelebration({ goal, goalName, onClose }: GoalCelebrationProps) {
  const displayName = goal?.goalName ?? goalName ?? 'your goal';
  const displayIcon = goal?.goalIcon || '🎯';
  const displayAmount = goal?.targetAmount;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="relative bg-card rounded-2xl shadow-2xl border w-full max-w-sm p-8 text-center pointer-events-auto overflow-hidden">

          {/* Confetti layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <style>{`
              @keyframes confetti-fall {
                0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
              }
            `}</style>
            {CONFETTI_PIECES.map((p) => (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.id % 3 === 0 ? '50%' : p.id % 3 === 1 ? '2px' : '0',
                  transform: `rotate(${p.rotate})`,
                  animation: `confetti-fall ${p.duration} ${p.delay} ease-in infinite`,
                }}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="relative z-10 space-y-4">
            {/* Trophy */}
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>
            </div>

            {/* Goal icon */}
            <div className="text-5xl">{displayIcon}</div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Congratulations!</h2>
              <p className="text-muted-foreground text-sm">You've reached your goal!</p>
            </div>

            {/* Goal details */}
            <div className="rounded-xl bg-muted/50 p-4 space-y-1">
              <p className="font-semibold text-lg">{displayName}</p>
              {displayAmount != null && (
                <>
                  <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 tabular-nums">
                    {formatMoney(displayAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">Target Achieved</p>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Awesome! Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
