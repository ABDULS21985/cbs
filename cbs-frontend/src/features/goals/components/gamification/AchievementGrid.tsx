import { AchievementBadge, type Achievement } from './AchievementBadge';
import type { SavingsGoal, GoalTransaction } from '../../api/goalApi';

interface Props {
  goals: SavingsGoal[];
  contributions: GoalTransaction[];
}

export function computeAchievements(goals: SavingsGoal[], contributions: GoalTransaction[]): Achievement[] {
  const completed = goals.filter((g) => g.status === 'COMPLETED');
  const deposits = contributions.filter((c) => c.transactionType === 'DEPOSIT');
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');

  // Streak: count consecutive months with deposits
  const months = new Set(deposits.map((c) => c.createdAt.slice(0, 7)));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months.has(key)) streak++;
    else break;
  }

  const maxMonthly = deposits.reduce((acc, c) => {
    const m = c.createdAt.slice(0, 7);
    acc[m] = (acc[m] ?? 0) + c.amount;
    return acc;
  }, {} as Record<string, number>);
  const maxMonth = Math.max(...Object.values(maxMonthly), 0);

  const hasWithdrawals = contributions.some(c => c.transactionType === 'WITHDRAWAL');

  return [
    { id: 'first-seed', icon: '🌱', name: 'First Seed', description: 'Made first contribution', earned: deposits.length > 0 },
    { id: 'hot-streak', icon: '🔥', name: 'Hot Streak', description: '3+ months consecutive contributions', earned: streak >= 3, progress: Math.min((streak / 3) * 100, 100) },
    { id: 'power-saver', icon: '💪', name: 'Power Saver', description: 'Saved 1M+ in a single month', earned: maxMonth >= 1000000, progress: Math.min((maxMonth / 1000000) * 100, 100) },
    { id: 'bullseye', icon: '🎯', name: 'Bullseye', description: 'Completed a goal on exact target date', earned: completed.some((g) => g.currentAmount >= g.targetAmount) },
    { id: 'goal-crusher', icon: '🏆', name: 'Goal Crusher', description: 'Completed 3+ goals', earned: completed.length >= 3, progress: Math.min((completed.length / 3) * 100, 100) },
    { id: 'speed-saver', icon: '⚡', name: 'Speed Saver', description: 'Completed goal ahead of schedule', earned: completed.some((g) => g.currentAmount >= g.targetAmount) },
    { id: 'auto-pilot', icon: '🤖', name: 'Auto Pilot', description: '6+ months of auto-debit deposits', earned: deposits.length >= 6, progress: Math.min((deposits.length / 6) * 100, 100) },
    { id: 'diamond-hands', icon: '💎', name: 'Diamond Hands', description: 'Never withdrawn from any goal', earned: goals.length > 0 && !hasWithdrawals },
    { id: 'diversified', icon: '🌍', name: 'Diversified', description: '3+ active goals simultaneously', earned: activeGoals.length >= 3, progress: Math.min((activeGoals.length / 3) * 100, 100) },
    { id: 'early-bird', icon: '🔔', name: 'Early Bird', description: 'Contributed within first week', earned: deposits.length > 0 },
  ];
}

export function AchievementGrid({ goals, contributions }: Props) {
  const achievements = computeAchievements(goals, contributions);
  const earned = achievements.filter((a) => a.earned);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Achievements</h3>
        <span className="text-xs text-muted-foreground">{earned.length}/{achievements.length} earned</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {achievements.map((a) => (
          <AchievementBadge key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
}
