import { formatMoneyCompact } from '@/lib/formatters';
import type { SavingsGoal } from '../../api/goalApi';

interface Props {
  goals: SavingsGoal[];
  currentUserId?: string;
}

export function LeaderboardCard({ goals, currentUserId }: Props) {
  // Group by source account and rank by total saved
  const byAccount: Record<string, number> = {};
  goals.forEach((g) => {
    const key = g.sourceAccountId || 'unknown';
    byAccount[key] = (byAccount[key] ?? 0) + g.currentAmount;
  });

  const ranked = Object.entries(byAccount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">Savings Leaderboard</h3>
      <div className="space-y-2">
        {ranked.map(([id, total], i) => (
          <div key={id} className="flex items-center gap-3 py-1.5">
            <span className="text-lg w-8 text-center">{i < 3 ? medals[i] : `${i + 1}.`}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono truncate">{id}</p>
            </div>
            <span className="text-sm font-bold tabular-nums">{formatMoneyCompact(total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
