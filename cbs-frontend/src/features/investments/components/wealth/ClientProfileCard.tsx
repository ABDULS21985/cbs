import { formatMoney } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import type { WealthManagementPlan } from '../../api/wealthApi';

export function ClientProfileCard({ plan }: { plan: WealthManagementPlan }) {
  const items = [
    { label: 'Net Worth', value: plan.totalNetWorth != null ? formatMoney(plan.totalNetWorth) : '—' },
    { label: 'Investable Assets', value: plan.totalInvestableAssets != null ? formatMoney(plan.totalInvestableAssets) : '—' },
    { label: 'Annual Income', value: plan.annualIncome != null ? formatMoney(plan.annualIncome) : '—' },
    { label: 'Tax Bracket', value: plan.taxBracketPct != null ? `${plan.taxBracketPct}%` : '—' },
    { label: 'Retirement Target Age', value: plan.retirementTargetAge?.toString() ?? '—' },
    { label: 'Retirement Income Goal', value: plan.retirementIncomeGoal != null ? formatMoney(plan.retirementIncomeGoal) : '—' },
  ];

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Client Profile</h3>
        <StatusBadge status={plan.planType} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium font-mono mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>
      {plan.taxStrategy && (
        <div>
          <p className="text-xs text-muted-foreground">Tax Strategy</p>
          <p className="text-sm mt-0.5">{plan.taxStrategy}</p>
        </div>
      )}
      {plan.estatePlanSummary && (
        <div>
          <p className="text-xs text-muted-foreground">Estate Plan Summary</p>
          <p className="text-sm mt-0.5">{plan.estatePlanSummary}</p>
        </div>
      )}
    </div>
  );
}
