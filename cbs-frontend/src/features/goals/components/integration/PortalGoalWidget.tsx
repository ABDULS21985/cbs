import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight } from 'lucide-react';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { goalApi } from '../../api/goalApi';
import { computeAchievements } from '../gamification/AchievementGrid';

interface Props {
  customerId: number;
}

export function PortalGoalWidget({ customerId }: Props) {
  const navigate = useNavigate();
  const { data: goals = [] } = useQuery({
    queryKey: ['goals', 'customer', customerId],
    queryFn: () => goalApi.getCustomerGoals(customerId),
    staleTime: 60_000,
  });

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE').slice(0, 3);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const earned = computeAchievements(goals, []).filter((a) => a.earned);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Savings Goals</h3>
        <button onClick={() => navigate('/accounts/goals')}
          className="flex items-center gap-1 text-xs text-primary hover:underline">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {activeGoals.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No active goals</p>
          <button onClick={() => navigate('/accounts/goals/new')}
            className="mt-2 flex items-center gap-1 mx-auto text-xs text-primary hover:underline">
            <Plus className="w-3 h-3" /> Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
            return (
              <div key={goal.id} className="flex items-center gap-3">
                <span className="text-lg">{goal.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{goal.name}</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs font-bold tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {totalSaved > 0 && (
        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">Total Saved</p>
          <p className="text-lg font-bold text-primary">{formatMoneyCompact(totalSaved)}</p>
        </div>
      )}

      {earned.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t">
          {earned.slice(0, 5).map((a) => <span key={a.id} className="text-lg" title={a.name}>{a.icon}</span>)}
          {earned.length > 5 && <span className="text-xs text-muted-foreground">+{earned.length - 5}</span>}
        </div>
      )}
    </div>
  );
}
