import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Target, TrendingUp } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { GoalCard } from '../components/GoalCard';
import { getGoals, getRecurringDeposits, contributeToGoal } from '../api/goalApi';
import type { RecurringDeposit } from '../api/goalApi';

export function GoalListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeError, setContributeError] = useState('');

  const goalsQuery = useQuery({ queryKey: ['goals'], queryFn: getGoals });
  const rdQuery = useQuery({ queryKey: ['recurring-deposits'], queryFn: getRecurringDeposits });

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => contributeToGoal(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setContributeGoalId(null);
      setContributeAmount('');
      setContributeError('');
    },
  });

  function handleContribute(id: string) {
    setContributeGoalId(id);
    setContributeAmount('');
    setContributeError('');
  }

  function handleEdit(id: string) {
    navigate(`/accounts/goals/${id}`);
  }

  function handleGoalClick(id: string) {
    navigate(`/accounts/goals/${id}`);
  }

  function submitContribution() {
    const amount = parseFloat(contributeAmount);
    if (!amount || amount <= 0) {
      setContributeError('Please enter a valid amount');
      return;
    }
    if (!contributeGoalId) return;
    contributeMutation.mutate({ id: contributeGoalId, amount });
  }

  const goals = goalsQuery.data ?? [];
  const recurringDeposits = rdQuery.data ?? [];

  // Recurring deposits table columns
  const rdColumns: ColumnDef<RecurringDeposit, unknown>[] = [
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue() as number)}</span>,
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ getValue }) => {
        const freq = getValue() as string;
        return (
          <span className="capitalize text-sm text-muted-foreground">{freq.toLowerCase()}</span>
        );
      },
    },
    {
      id: 'installments',
      header: 'Installments',
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.installmentsPaid} / {row.original.totalInstallments}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} dot />,
    },
    {
      accessorKey: 'nextDueDate',
      header: 'Next Due',
      cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue() as string)}</span>,
    },
  ];

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <>
      <PageHeader
        title="Savings Goals"
        subtitle="Track and manage your savings goals"
        actions={
          <button
            onClick={() => navigate('/accounts/goals/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Summary bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground/60" />
              <div className="stat-label">Active Goals</div>
            </div>
            <div className="stat-value">{activeGoals.length}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground/60" />
              <div className="stat-label">Total Saved</div>
            </div>
            <div className="stat-value text-lg">{formatMoney(totalSaved)}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground/60" />
              <div className="stat-label">Goals Completed</div>
            </div>
            <div className="stat-value">{completedGoals.length}</div>
          </div>
        </div>

        {/* Goals grid */}
        {goalsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading goals...
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
            <Target className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium text-muted-foreground">No savings goals yet</p>
            <p className="text-sm text-muted-foreground/70">Create your first goal to start saving with purpose.</p>
            <button
              onClick={() => navigate('/accounts/goals/new')}
              className="mx-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={handleContribute}
                onEdit={handleEdit}
                onClick={handleGoalClick}
              />
            ))}
          </div>
        )}

        {/* Recurring Deposits section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recurring Deposits</h2>
              <p className="text-sm text-muted-foreground">Scheduled deposit plans for customers</p>
            </div>
            <button
              onClick={() => navigate('/accounts/recurring-deposits')}
              className="text-sm text-primary hover:underline font-medium"
            >
              View all
            </button>
          </div>
          <DataTable
            columns={rdColumns}
            data={recurringDeposits}
            isLoading={rdQuery.isLoading}
            enableGlobalFilter
            pageSize={5}
            onRowClick={(rd: RecurringDeposit) => navigate(`/accounts/recurring-deposits/${rd.id}`)}
            emptyMessage="No recurring deposits found"
          />
        </div>
      </div>

      {/* Contribute dialog */}
      {contributeGoalId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setContributeGoalId(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm p-6 space-y-4">
              <h3 className="text-lg font-semibold">Contribute to Goal</h3>
              <p className="text-sm text-muted-foreground">
                Enter the amount you want to add to this savings goal.
              </p>
              <div>
                <label className="text-sm font-medium">Amount (₦)</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₦</span>
                  <input
                    type="number"
                    value={contributeAmount}
                    onChange={(e) => { setContributeAmount(e.target.value); setContributeError(''); }}
                    placeholder="50,000"
                    className={cn(
                      'w-full rounded-lg border bg-background pl-7 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                      contributeError && 'border-red-500',
                    )}
                    autoFocus
                  />
                </div>
                {contributeError && <p className="text-xs text-red-500 mt-0.5">{contributeError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setContributeGoalId(null)}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitContribution}
                  disabled={contributeMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {contributeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
