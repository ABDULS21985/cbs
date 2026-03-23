import { cn } from '@/lib/utils';
import type { GoalTransaction } from '../../api/goalApi';

interface Props {
  contributions: GoalTransaction[];
}

export function SavingsStreak({ contributions }: Props) {
  const deposits = contributions.filter(c => c.transactionType === 'DEPOSIT');

  // Compute current streak
  const months = new Set(deposits.map((c) => c.createdAt.slice(0, 7)));
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months.has(key)) streak++;
    else break;
  }

  // Build 12-month heatmap
  const heatmap = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthDeposits = deposits.filter((c) => c.createdAt.startsWith(key));
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      count: monthDeposits.length,
      total: monthDeposits.reduce((s, c) => s + c.amount, 0),
    };
  });

  const maxCount = Math.max(...heatmap.map((h) => h.count), 1);

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{streak > 0 ? '🔥' : '❄️'}</span>
        <div>
          <p className="text-2xl font-bold tabular-nums">{streak > 0 ? `${streak}-month streak!` : 'No streak yet'}</p>
          <p className="text-xs text-muted-foreground">Consecutive months with deposits</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        {heatmap.map((h) => (
          <div key={h.month} className="flex-1 text-center">
            <div
              className={cn('h-8 rounded-sm transition-colors', h.count > 0 ? '' : 'bg-muted/30')}
              style={h.count > 0 ? { backgroundColor: `rgba(34, 197, 94, ${Math.min(h.count / maxCount, 1) * 0.8 + 0.2})` } : undefined}
              title={`${h.month}: ${h.count} deposits`}
            />
            <span className="text-[8px] text-muted-foreground">{h.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
