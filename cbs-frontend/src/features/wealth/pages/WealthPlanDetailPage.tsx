import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { InfoGrid, StatusBadge } from '@/components/shared';
import { wealthApi } from '../api/wealthApi';
import { formatMoney, formatPercent, formatDate } from '@/lib/formatters';
import { Loader2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(43, 74%, 49%)', 'hsl(142, 71%, 45%)', 'hsl(215, 16%, 47%)', 'hsl(0, 84%, 60%)'];

export function WealthPlanDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { data: plan, isLoading, isError } = useQuery({ queryKey: ['wealth', 'plan', code], queryFn: () => wealthApi.getPlan(code!), enabled: !!code });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (isError || !plan) return <div className="flex flex-col items-center justify-center h-64 gap-3"><AlertCircle className="w-8 h-8 text-muted-foreground" /><p>Wealth plan not found</p></div>;

  const allocationData = Object.entries(plan.currentAllocation || {}).map(([name, value]) => ({ name, value: Number(value) }));

  return (
    <>
      <PageHeader title={`Wealth Plan ${plan.planCode}`} subtitle={`${plan.customerName} — ${plan.planType}`} backTo="/wealth"
        actions={<StatusBadge status={plan.status} size="md" dot />}
      />
      <div className="page-container space-y-6">
        {/* Client Profile */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Client Profile</h3>
          <InfoGrid columns={4} items={[
            { label: 'Customer', value: plan.customerName },
            { label: 'Net Worth', value: plan.totalNetWorth, format: 'money' },
            { label: 'Investable Assets', value: plan.totalInvestableAssets, format: 'money' },
            { label: 'Annual Income', value: plan.annualIncome, format: 'money' },
            { label: 'Risk Profile', value: plan.riskProfile },
            { label: 'Investment Horizon', value: plan.investmentHorizon || '—' },
            { label: 'Advisor', value: plan.advisorName || '—' },
            { label: 'Next Review', value: plan.nextReviewDate || '—', format: plan.nextReviewDate ? 'date' : undefined },
          ]} />
        </div>

        {/* Asset Allocation */}
        {allocationData.length > 0 && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Asset Allocation</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {allocationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Financial Goals */}
        {plan.financialGoals && plan.financialGoals.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-4">Goal Tracking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plan.financialGoals.map((goal, i) => {
                const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
                return (
                  <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{goal.name}</h4>
                      {goal.onTrack ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: <span className="font-mono">{formatMoney(goal.target)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', goal.onTrack ? 'bg-green-500' : 'bg-amber-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-mono">{formatMoney(goal.current)}</span>
                      <span className="font-mono text-muted-foreground">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
