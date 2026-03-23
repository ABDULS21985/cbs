import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { Target, TrendingUp, CheckCircle, DollarSign, BarChart3, Info } from 'lucide-react';
import { formatMoneyCompact } from '@/lib/formatters';
import { goalApi, type SavingsGoal, type GoalTransaction } from '../api/goalApi';
import { MonthlyInflowChart } from '../components/analytics/MonthlyInflowChart';
import { GoalCompletionRateChart } from '../components/analytics/GoalCompletionRateChart';
import { GoalTypeDistribution } from '../components/analytics/GoalTypeDistribution';
import { AutoDebitSuccessRate } from '../components/analytics/AutoDebitSuccessRate';
import { TopSaversTable } from '../components/analytics/TopSaversTable';

export function GoalAnalyticsPage() {
  useEffect(() => { document.title = 'Savings Goals Analytics | CBS'; }, []);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', 'all'],
    queryFn: () => goalApi.getGoals({ size: 1000 }),
    staleTime: 60_000,
  });

  // Fetch contributions for all goals
  const { data: allContributions = [] } = useQuery({
    queryKey: ['goals', 'all-contributions'],
    queryFn: async () => {
      const results = await Promise.all(goals.slice(0, 50).map((g) => goalApi.getContributions(g.id)));
      return results.flat();
    },
    enabled: goals.length > 0,
    staleTime: 120_000,
  });

  const active = goals.filter((g) => g.status === 'ACTIVE');
  const completed = goals.filter((g) => g.status === 'COMPLETED');
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const avgGoalSize = goals.length > 0 ? goals.reduce((s, g) => s + g.targetAmount, 0) / goals.length : 0;
  const completionRate = goals.length > 0 ? (completed.length / goals.length) * 100 : 0;
  const autoDebitPct = goals.length > 0 ? (goals.filter((g) => g.autoDebitEnabled).length / goals.length) * 100 : 0;
  const atRisk = active.filter((g) => {
    if (!g.targetDate) return false;
    const daysLeft = (new Date(g.targetDate).getTime() - Date.now()) / 86400000;
    const pct = g.progressPercentage;
    return daysLeft < 60 && pct < 70;
  });

  return (
    <>
      <PageHeader title="Savings Goals Analytics" subtitle="Portfolio-wide savings performance, trends, and insights" />

      <div className="page-container space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Goals" value={goals.length} format="number" icon={Target} loading={isLoading} />
          <StatCard label="Active Goals" value={active.length} format="number" icon={TrendingUp} />
          <StatCard label="Completion Rate" value={`${completionRate.toFixed(0)}%`} icon={CheckCircle} />
          <StatCard label="Total Saved" value={formatMoneyCompact(totalSaved)} icon={DollarSign} />
          <StatCard label="Avg Goal Size" value={formatMoneyCompact(avgGoalSize)} icon={BarChart3} />
        </div>

        {/* Row 2: Inflow + Completion Rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3">Monthly Savings Inflow</h3>
            <MonthlyInflowChart contributions={allContributions} />
          </div>
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3">Goal Completion Rate</h3>
            <GoalCompletionRateChart goals={goals} />
          </div>
        </div>

        {/* Row 3: Distribution + Auto-Debit */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3">Goal Type Distribution</h3>
            <GoalTypeDistribution goals={goals} />
          </div>
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3">Auto-Debit Success Rate</h3>
            <AutoDebitSuccessRate contributions={allContributions} />
          </div>
        </div>

        {/* Row 4: Top Savers */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Top Savers</h3>
          <TopSaversTable goals={goals} />
        </div>

        {/* Row 5: Insights */}
        <div className="space-y-2">
          {goals.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border bg-green-50 dark:bg-green-900/10 p-3">
              <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                Auto-debit adoption at {autoDebitPct.toFixed(0)}% — {autoDebitPct >= 60 ? 'above' : 'below'} 60% target
              </p>
            </div>
          )}
          {atRisk.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border bg-amber-50 dark:bg-amber-900/10 p-3">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {atRisk.length} goal{atRisk.length !== 1 ? 's' : ''} at risk of not meeting deadline — consider proactive outreach
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
