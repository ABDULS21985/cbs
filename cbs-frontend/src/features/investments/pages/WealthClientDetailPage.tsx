import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge, TabsPage } from '@/components/shared';
import { InfoGrid } from '@/components/shared/InfoGrid';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { wealthApi, type WealthManagementPlan } from '../api/wealthApi';

// ─── Allocation Display ──────────────────────────────────────────────────────

function AllocationDisplay({ allocation }: { allocation: Record<string, unknown> | null }) {
  if (!allocation || Object.keys(allocation).length === 0) {
    return <p className="text-sm text-muted-foreground">No allocation data available</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Object.entries(allocation).map(([key, value]) => (
        <div key={key} className="card p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
          <p className="text-sm font-semibold mt-1">
            {typeof value === 'number' ? `${value}%` : String(value ?? '—')}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Goals List ──────────────────────────────────────────────────────────────

function GoalsList({ goals }: { goals: Record<string, unknown>[] | null }) {
  if (!goals || goals.length === 0) {
    return <p className="text-sm text-muted-foreground">No financial goals defined</p>;
  }

  return (
    <div className="space-y-3">
      {goals.map((goal, idx) => (
        <div key={idx} className="card p-4 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
          <div className="text-sm space-y-1">
            {Object.entries(goal).map(([k, v]) => (
              <p key={k}>
                <span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span>{' '}
                <span className="font-medium">{String(v ?? '—')}</span>
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function WealthClientDetailPage() {
  const { code } = useParams<{ code: string }>();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = code ? `Wealth Plan - ${code}` : 'Wealth Plan Detail';
  }, [code]);

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['wealth-plan', code],
    queryFn: () => wealthApi.getByCode(code!),
    enabled: !!code,
  });

  const activateMutation = useMutation({
    mutationFn: () => wealthApi.activate(code!),
    onSuccess: () => {
      toast.success('Plan activated successfully');
      queryClient.invalidateQueries({ queryKey: ['wealth-plan', code] });
    },
    onError: () => toast.error('Failed to activate plan'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-muted-foreground">Failed to load wealth plan</p>
      </div>
    );
  }

  const infoItems = [
    { label: 'Plan Code', value: plan.planCode, mono: true, copyable: true },
    { label: 'Customer ID', value: plan.customerId },
    { label: 'Plan Type', value: plan.planType },
    { label: 'Advisor', value: plan.advisorId ?? '—' },
    { label: 'Total Net Worth', value: plan.totalNetWorth ?? 0, format: 'money' as const },
    { label: 'Investable Assets', value: plan.totalInvestableAssets ?? 0, format: 'money' as const },
    { label: 'Annual Income', value: plan.annualIncome ?? 0, format: 'money' as const },
    { label: 'Retirement Target Age', value: plan.retirementTargetAge ?? '—' },
    { label: 'Next Review Date', value: plan.nextReviewDate ? formatDate(plan.nextReviewDate) : '—' },
    { label: 'Status', value: plan.status },
  ];

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      content: (
        <div className="p-6 space-y-8">
          <section>
            <h3 className="font-semibold mb-3">Financial Goals</h3>
            <GoalsList goals={plan.financialGoals} />
          </section>
          <section>
            <h3 className="font-semibold mb-3">Recommended Allocation</h3>
            <AllocationDisplay allocation={plan.recommendedAllocation} />
          </section>
          <section>
            <h3 className="font-semibold mb-3">Insurance Needs</h3>
            {plan.insuranceNeeds && Object.keys(plan.insuranceNeeds).length > 0 ? (
              <div className="card p-4 text-sm space-y-1">
                {Object.entries(plan.insuranceNeeds).map(([k, v]) => (
                  <p key={k}>
                    <span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span>{' '}
                    <span className="font-medium">{String(v ?? '—')}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No insurance needs recorded</p>
            )}
          </section>
        </div>
      ),
    },
    {
      id: 'portfolios',
      label: 'Portfolios',
      content: (
        <div className="p-6">
          <div className="card p-8 text-center">
            <p className="text-muted-foreground mb-2">Investment portfolios linked to this wealth plan</p>
            <a href="/investments/portfolios" className="text-primary hover:underline text-sm font-medium">
              View Investment Portfolios
            </a>
          </div>
        </div>
      ),
    },
    {
      id: 'performance',
      label: 'Performance',
      content: (
        <div className="p-6">
          <div className="card p-8 text-center">
            <p className="text-muted-foreground">Performance tracking and analytics will be available here.</p>
            <div className="grid grid-cols-2 gap-4 mt-6 max-w-md mx-auto">
              <div className="card p-4">
                <p className="text-xs text-muted-foreground">Net Worth</p>
                <p className="text-lg font-semibold font-mono mt-1">{formatMoney(plan.totalNetWorth ?? 0)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted-foreground">Investable Assets</p>
                <p className="text-lg font-semibold font-mono mt-1">{formatMoney(plan.totalInvestableAssets ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      content: (
        <div className="p-6 space-y-6">
          <section>
            <h3 className="font-semibold mb-3">Estate Plan Summary</h3>
            <div className="card p-4">
              <p className="text-sm whitespace-pre-wrap">{plan.estatePlanSummary || 'No estate plan summary available.'}</p>
            </div>
          </section>
          <section>
            <h3 className="font-semibold mb-3">Tax Strategy</h3>
            <div className="card p-4">
              <p className="text-sm whitespace-pre-wrap">{plan.taxStrategy || 'No tax strategy defined.'}</p>
            </div>
          </section>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={plan.planCode}
        subtitle={`${plan.planType} wealth management plan`}
        backTo="/investments/wealth"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={plan.status} size="md" />
            {plan.status === 'DRAFT' && (
              <button
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {activateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Activate
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="card p-6">
          <InfoGrid items={infoItems} columns={4} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
