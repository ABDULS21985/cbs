import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Zap, ChevronRight } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useGoals, useRecurringDeposits, useProcessAutoDebits } from '../hooks/useGoals';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { GoalSummaryStrip } from '../components/GoalSummaryStrip';
import { GoalFilterBar } from '../components/GoalFilterBar';
import { GoalCard } from '../components/GoalCard';
import { GoalEmptyState } from '../components/GoalEmptyState';
import { GoalCelebration } from '../components/GoalCelebration';
import type { SavingsGoal } from '../api/goalApi';
import { toast } from 'sonner';

function sortGoals(goals: SavingsGoal[], sortBy: string): SavingsGoal[] {
  const sorted = [...goals];
  switch (sortBy) {
    case 'progress':
      return sorted.sort((a, b) => b.progressPercentage - a.progressPercentage);
    case 'amount':
      return sorted.sort((a, b) => b.currentAmount - a.currentAmount);
    case 'target':
      return sorted.sort((a, b) => b.targetAmount - a.targetAmount);
    case 'date':
      return sorted.sort((a, b) => {
        if (!a.targetDate) return 1;
        if (!b.targetDate) return -1;
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      });
    case 'name':
      return sorted.sort((a, b) => a.goalName.localeCompare(b.goalName));
    default:
      return sorted;
  }
}

export function GoalListPage() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading } = useGoals();
  const { data: recurringDeposits = [] } = useRecurringDeposits();
  const processAutoDebits = useProcessAutoDebits();

  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('progress');
  const [search, setSearch] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const filtered = useMemo(() => {
    let result = goals;
    if (statusFilter) result = result.filter((g) => g.status === statusFilter);
    if (search) result = result.filter((g) => g.goalName.toLowerCase().includes(search.toLowerCase()));
    return sortGoals(result, sortBy);
  }, [goals, statusFilter, sortBy, search]);

  const activeGoals = filtered.filter((g) => g.status !== 'COMPLETED');
  const completedGoals = filtered.filter((g) => g.status === 'COMPLETED');

  const handleProcessAutoDebits = () => {
    processAutoDebits.mutate(undefined, {
      onSuccess: (data) => {
        const { processed = 0, skipped = 0, failed = 0 } = data ?? {};
        const parts = [`${processed} processed`];
        if (skipped > 0) parts.push(`${skipped} skipped (low balance)`);
        if (failed  > 0) parts.push(`${failed} failed`);
        if (failed > 0) {
          toast.error(`Auto-debits completed with errors: ${parts.join(', ')}`);
        } else {
          toast.success(`Auto-debits complete — ${parts.join(', ')}`);
        }
      },
      onError: () => toast.error('Failed to process auto-debits'),
    });
  };

  return (
    <>
      <PageHeader
        title="Savings Goals"
        subtitle="Track your savings targets and watch your money grow"
        actions={
          <div className="flex items-center gap-2">
            <RoleGuard roles="CBS_ADMIN">
              <button onClick={handleProcessAutoDebits} disabled={processAutoDebits.isPending} className="flex items-center gap-2 btn-secondary">
                <Zap className="w-4 h-4" /> {processAutoDebits.isPending ? 'Processing...' : 'Process Auto-Debits'}
              </button>
            </RoleGuard>
            <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER', 'PORTAL_USER']}>
              <button onClick={() => navigate('/accounts/goals/new')} className="flex items-center gap-2 btn-primary">
                <Plus className="w-4 h-4" /> New Goal
              </button>
            </RoleGuard>
          </div>
        }
      />
      <div className="page-container space-y-6">
        <GoalSummaryStrip goals={goals} isLoading={isLoading} />

        <GoalFilterBar
          status={statusFilter} onStatusChange={setStatusFilter}
          sort={sortBy} onSortChange={setSortBy}
          search={search} onSearchChange={setSearch}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : goals.length === 0 ? (
          <GoalEmptyState />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">No goals match your filters.</p>
          </div>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onCelebrate={() => setShowCelebration(true)} />
                ))}
              </div>
            )}

            {completedGoals.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Completed ({completedGoals.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Recurring Deposits */}
        {recurringDeposits.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Your Recurring Deposits</p>
              <button onClick={() => navigate('/accounts/recurring-deposits')} className="flex items-center gap-1 text-xs text-primary hover:underline">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recurringDeposits.slice(0, 5).map((rd) => {
                const pct = rd.totalInstallments > 0 ? (rd.completedInstallments / rd.totalInstallments) * 100 : 0;
                return (
                  <div key={rd.id} onClick={() => navigate(`/accounts/recurring-deposits/${rd.id}`)} className="flex-shrink-0 w-56 rounded-xl border bg-card p-4 cursor-pointer hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-primary font-medium">{rd.depositNumber?.slice(-6) ?? `RD-${rd.id}`}</span>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                        rd.status === 'ACTIVE' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        rd.status === 'MATURED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        rd.status === 'BROKEN' || rd.status === 'SUSPENDED' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-muted text-muted-foreground',
                      )}>{rd.status}</span>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{formatMoney(rd.installmentAmount)}/{rd.frequency.toLowerCase().replace('_', '-')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rd.completedInstallments}/{rd.totalInstallments} paid</p>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Next: {formatDate(rd.nextDueDate)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCelebration && <GoalCelebration goalName="your goal" onClose={() => setShowCelebration(false)} />}
    </>
  );
}
