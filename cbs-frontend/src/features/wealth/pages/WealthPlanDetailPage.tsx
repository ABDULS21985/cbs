import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { wealthApi, type WealthPlan, type WealthGoal, type AssetAllocation } from '../api/wealthApi';
import { usePlan, useActivatePlan, useClosePlan } from '../hooks/useWealthData';
import { useHasRole } from '@/hooks/usePermission';
import { exportWealthPlanPdf } from '../lib/wealthExport';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Target,
  TrendingUp,
  DollarSign,
  BarChart2,
  Plus,
  Download,
  Upload,
  FileText,
  Clock,
  Shield,
  Zap,
  Activity,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
];

// Asset class labels used throughout the plan detail views
const _ASSET_CLASSES = ['Equity', 'Fixed Income', 'Alternatives', 'Real Estate', 'Cash / Money Market'];
void _ASSET_CLASSES;

const DEFAULT_ALLOCATIONS: AssetAllocation[] = [
  { assetClass: 'Equity', percentage: 45, currentValue: 0, targetPercentage: 40 },
  { assetClass: 'Fixed Income', percentage: 25, currentValue: 0, targetPercentage: 28 },
  { assetClass: 'Alternatives', percentage: 12, currentValue: 0, targetPercentage: 12 },
  { assetClass: 'Real Estate', percentage: 10, currentValue: 0, targetPercentage: 12 },
  { assetClass: 'Cash / Money Market', percentage: 8, currentValue: 0, targetPercentage: 8 },
];

const TAX_SCENARIOS = [
  {
    name: 'Conservative',
    projectedLiability: 4_800_000,
    taxDeferred: 12_000_000,
    effectiveRate: 18.5,
    actions: [
      'Maximise pension contributions',
      'Invest in tax-exempt government bonds',
      'Hold equities beyond 12 months for capital gains relief',
    ],
  },
  {
    name: 'Moderate',
    projectedLiability: 6_200_000,
    taxDeferred: 8_500_000,
    effectiveRate: 22.4,
    actions: [
      'Utilise annual allowances fully',
      'Consider income-splitting strategies',
      'Harvest tax losses to offset capital gains',
    ],
  },
  {
    name: 'Aggressive',
    projectedLiability: 9_100_000,
    taxDeferred: 4_000_000,
    effectiveRate: 28.7,
    actions: [
      'Review dividend reinvestment strategy',
      'Reassess asset location across accounts',
      'Consult tax advisor on offshore structures',
    ],
  },
];

const TAX_HARVESTING_MOCK = [
  { asset: 'Zenith Bank Plc', unrealizedLoss: -420_000, action: 'Sell & Re-enter after 30 days' },
  { asset: 'Dangote Cement', unrealizedLoss: -280_000, action: 'Swap for sector ETF' },
  { asset: 'MTN Nigeria', unrealizedLoss: -190_000, action: 'Defer — near break-even' },
];

type TabId = 'overview' | 'allocation' | 'goals' | 'tax' | 'documents';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('surface-card p-5', className)}>
      {title && <h3 className="text-sm font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function FieldItem({ label, value, badge }: { label: string; value: React.ReactNode; badge?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {badge && typeof value === 'string' ? (
        <StatusBadge status={value} />
      ) : (
        <p className="text-sm font-medium">{value || '—'}</p>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
  color = 'text-foreground',
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-lg font-bold tracking-tight', color)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ plan }: { plan: WealthPlan }) {
  const timeline = [
    { icon: FileText, label: 'Plan Created', date: plan.createdDate, color: 'text-blue-500' },
    { icon: Zap, label: 'Plan Activated', date: plan.activatedDate, color: 'text-green-500' },
    { icon: Activity, label: 'Last Review', date: plan.lastReviewDate, color: 'text-amber-500' },
    { icon: Clock, label: 'Next Review Due', date: plan.nextReviewDate, color: 'text-purple-500' },
  ].filter((t) => t.date);

  return (
    <div className="space-y-5">
      {/* Client Profile */}
      <SectionCard title="Client Profile">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FieldItem label="Full Name" value={plan.customerName} />
          <FieldItem label="Net Worth" value={formatMoney(plan.totalNetWorth)} />
          <FieldItem label="Investable Assets" value={formatMoney(plan.totalInvestableAssets)} />
          <FieldItem label="Annual Income" value={formatMoney(plan.annualIncome)} />
          <FieldItem label="Risk Profile" value={plan.riskProfile} badge />
          <FieldItem
            label="Investment Horizon"
            value={plan.investmentHorizon ? `${plan.investmentHorizon} years` : '—'}
          />
          <FieldItem label="Advisor" value={plan.advisorName} />
          <FieldItem
            label="Next Review Date"
            value={plan.nextReviewDate ? formatDate(plan.nextReviewDate) : '—'}
          />
        </div>
      </SectionCard>

      {/* Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatPill
          label="YTD Return"
          value={formatPercent(plan.ytdReturn ?? 0)}
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatPill
          label="Absolute Gain"
          value={formatMoney(plan.absoluteGain ?? 0)}
          icon={DollarSign}
          color="text-primary"
        />
        <StatPill
          label="vs S&P 500"
          value={
            (plan.benchmarkDiff ?? 0) >= 0
              ? `+${formatPercent(plan.benchmarkDiff ?? 0)}`
              : formatPercent(plan.benchmarkDiff ?? 0)
          }
          icon={BarChart2}
          color={(plan.benchmarkDiff ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}
        />
      </div>

      {/* Activity Timeline */}
      {timeline.length > 0 && (
        <SectionCard title="Recent Activity">
          <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {timeline.map(({ icon: Icon, label, date, color }, i) => (
              <div key={i} className="relative flex items-start gap-3">
                <div className={cn('absolute -left-6 mt-0.5 p-1 rounded-full bg-card border', color)}>
                  <Icon className={cn('w-3 h-3', color)} />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{date ? formatDate(date) : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Tab: Allocation ──────────────────────────────────────────────────────────

function AllocationTab({ plan }: { plan: WealthPlan }) {
  const [rebalancing, setRebalancing] = useState(false);
  const [rebalanceMsg, setRebalanceMsg] = useState<string | null>(null);

  const allocations: AssetAllocation[] = (() => {
    if (plan.allocations && plan.allocations.length > 0) {
      return plan.allocations.map((a) => ({
        assetClass: String(a.assetClass || ''),
        percentage: Number(a.percentage || 0),
        currentValue: Number(a.currentValue || 0),
        targetPercentage: Number(a.targetPercentage || 0),
      }));
    }
    // Build from currentAllocation / targetAllocation maps
    const keys = new Set([
      ...Object.keys(plan.currentAllocation || {}),
      ...Object.keys(plan.targetAllocation || {}),
    ]);
    if (keys.size === 0) return DEFAULT_ALLOCATIONS.map((a) => ({
      ...a,
      currentValue: (plan.totalInvestableAssets || 0) * (a.percentage / 100),
    }));
    return Array.from(keys).map((key) => ({
      assetClass: key,
      percentage: Number((plan.currentAllocation || {})[key] || 0),
      currentValue: (plan.totalInvestableAssets || 0) * (Number((plan.currentAllocation || {})[key] || 0) / 100),
      targetPercentage: Number((plan.targetAllocation || {})[key] || 0),
    }));
  })();

  const pieData = allocations.map((a) => ({ name: a.assetClass, value: a.percentage }));

  async function handleRebalance() {
    setRebalancing(true);
    setRebalanceMsg(null);
    try {
      await wealthApi.rebalancePlan(plan.planCode);
      setRebalanceMsg('Rebalance request submitted successfully.');
    } catch {
      setRebalanceMsg('Rebalance request failed. Please try again.');
    } finally {
      setRebalancing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut chart */}
        <SectionCard title="Current vs Target Allocation">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Allocation table */}
        <SectionCard title="Drift Analysis">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Asset Class</th>
                  <th className="text-right py-2 font-medium">Current %</th>
                  <th className="text-right py-2 font-medium">Target %</th>
                  <th className="text-right py-2 font-medium">Drift</th>
                  <th className="text-right py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((row) => {
                  const drift = row.percentage - row.targetPercentage;
                  const absDrift = Math.abs(drift);
                  const driftColor =
                    absDrift > 5 ? 'text-red-600' : absDrift > 2 ? 'text-amber-600' : 'text-green-600';
                  return (
                    <tr key={row.assetClass} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 font-medium">{row.assetClass}</td>
                      <td className="py-2 text-right font-mono">{row.percentage.toFixed(1)}%</td>
                      <td className="py-2 text-right font-mono">{row.targetPercentage.toFixed(1)}%</td>
                      <td className={cn('py-2 text-right font-mono font-semibold', driftColor)}>
                        {drift >= 0 ? '+' : ''}{drift.toFixed(1)}%
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatMoney(row.currentValue || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleRebalance}
              disabled={rebalancing}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {rebalancing ? 'Submitting…' : 'Rebalance Portfolio'}
            </button>
            {rebalanceMsg && (
              <span className={cn('text-xs', rebalanceMsg.includes('successfully') ? 'text-green-600' : 'text-red-500')}>
                {rebalanceMsg}
              </span>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Tab: Goals ───────────────────────────────────────────────────────────────

function GoalsTab({ plan }: { plan: WealthPlan }) {
  const [goals, setGoals] = useState<WealthGoal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGoal, setNewGoal] = useState<Omit<WealthGoal, 'id'>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    priority: 'MEDIUM',
    status: 'ON_TRACK',
    monthlyContribution: 0,
  });

  useEffect(() => {
    const rawGoals = (plan.goals && plan.goals.length > 0) ? plan.goals : (plan.financialGoals || []);
    const mapped: WealthGoal[] = rawGoals.map((g, i) => ({
      id: String(g.id ?? i),
      name: String(g.name ?? g.goalName ?? 'Goal'),
      targetAmount: Number(g.targetAmount ?? g.target ?? 0),
      currentAmount: Number(g.currentAmount ?? g.current ?? 0),
      targetDate: String(g.targetDate ?? ''),
      priority: (g.priority as WealthGoal['priority']) ?? 'MEDIUM',
      status: g.onTrack === false ? ('AT_RISK' as const)
        : (g.status as WealthGoal['status']) ?? 'ON_TRACK',
      monthlyContribution: Number(g.monthlyContribution ?? 0),
    }));
    setGoals(mapped);
  }, [plan]);

  const onTrackCount = goals.filter((g) => g.status === 'ON_TRACK').length;

  function handleGoalChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setNewGoal((prev) => ({
      ...prev,
      [name]: ['targetAmount', 'currentAmount', 'monthlyContribution'].includes(name)
        ? Number(value)
        : value,
    }));
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await wealthApi.addGoal(plan.planCode, newGoal);
      setGoals((prev) => [...prev, created]);
      setShowAddForm(false);
      setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, targetDate: '', priority: 'MEDIUM', status: 'ON_TRACK', monthlyContribution: 0 });
    } catch {
      // optimistic fallback
      setGoals((prev) => [...prev, { ...newGoal, id: `local-${Date.now()}` }]);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  }

  function goalStatusIcon(status: WealthGoal['status']) {
    if (status === 'ON_TRACK') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'AT_RISK') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  }

  function goalBarColor(status: WealthGoal['status']) {
    if (status === 'ON_TRACK') return 'bg-green-500';
    if (status === 'AT_RISK') return 'bg-amber-500';
    return 'bg-red-500';
  }

  function priorityColor(priority: WealthGoal['priority']) {
    if (priority === 'HIGH') return 'bg-red-100 text-red-700';
    if (priority === 'MEDIUM') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{onTrackCount}</span> of{' '}
          <span className="font-semibold text-foreground">{goals.length}</span> goals on track
        </p>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="surface-card p-5">
          <h4 className="text-sm font-semibold mb-4">New Goal</h4>
          <form onSubmit={handleAddGoal} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Goal Name</label>
              <input
                name="name"
                value={newGoal.name}
                onChange={handleGoalChange}
                required
                placeholder="e.g. Retirement Fund"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
              <select
                name="priority"
                value={newGoal.priority}
                onChange={handleGoalChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Target Amount (₦)</label>
              <input
                name="targetAmount"
                type="number"
                min={0}
                value={newGoal.targetAmount}
                onChange={handleGoalChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Current Amount (₦)</label>
              <input
                name="currentAmount"
                type="number"
                min={0}
                value={newGoal.currentAmount}
                onChange={handleGoalChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Target Date</label>
              <input
                name="targetDate"
                type="date"
                value={newGoal.targetDate}
                onChange={handleGoalChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Monthly Contribution (₦)</label>
              <input
                name="monthlyContribution"
                type="number"
                min={0}
                value={newGoal.monthlyContribution}
                onChange={handleGoalChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="col-span-2 flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal cards */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
          <Target className="w-8 h-8" />
          <p className="text-sm">No goals defined yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            return (
              <div key={goal.id} className="surface-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {goalStatusIcon(goal.status)}
                      <h4 className="font-semibold text-sm">{goal.name}</h4>
                    </div>
                    <span className={cn('mt-1 inline-flex px-1.5 py-0.5 rounded text-xs font-medium', priorityColor(goal.priority))}>
                      {goal.priority}
                    </span>
                  </div>
                  <StatusBadge status={goal.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Target</p>
                    <p className="font-mono font-semibold">{formatMoney(goal.targetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current</p>
                    <p className="font-mono font-semibold">{formatMoney(goal.currentAmount)}</p>
                  </div>
                  {goal.targetDate && (
                    <div>
                      <p className="text-muted-foreground">Target Date</p>
                      <p className="font-medium">{formatDate(goal.targetDate)}</p>
                    </div>
                  )}
                  {goal.monthlyContribution > 0 && (
                    <div>
                      <p className="text-muted-foreground">Monthly</p>
                      <p className="font-mono font-semibold">{formatMoney(goal.monthlyContribution)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono font-semibold">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', goalBarColor(goal.status))}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Tax Insights ────────────────────────────────────────────────────────

function TaxInsightsTab() {
  const barData = TAX_SCENARIOS.map((s) => ({
    name: s.name,
    'Current Year': s.projectedLiability * 0.85,
    Projected: s.projectedLiability,
  }));

  return (
    <div className="space-y-5">
      {/* Scenario cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TAX_SCENARIOS.map((scenario) => (
          <div key={scenario.name} className="surface-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">{scenario.name}</h4>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected Tax Liability</span>
                <span className="font-mono font-semibold text-red-600">
                  {formatMoney(scenario.projectedLiability)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax-Deferred Amount</span>
                <span className="font-mono font-semibold text-green-600">
                  {formatMoney(scenario.taxDeferred)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Tax Rate</span>
                <span className="font-mono font-semibold">{formatPercent(scenario.effectiveRate)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Recommended Actions</p>
              <ul className="space-y-1">
                {scenario.actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart comparison */}
      <SectionCard title="Tax Comparison: Current Year vs Projected">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `₦${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11 }} width={65} />
            <Tooltip formatter={(v: number) => formatMoney(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Current Year" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Projected" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Tax-loss harvesting */}
      <SectionCard title="Tax-Loss Harvesting Opportunities">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 font-medium">Asset</th>
              <th className="text-right py-2 font-medium">Unrealized Loss</th>
              <th className="text-left py-2 pl-4 font-medium">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {TAX_HARVESTING_MOCK.map((row) => (
              <tr key={row.asset} className="border-b hover:bg-muted/30 transition-colors">
                <td className="py-2 font-medium">{row.asset}</td>
                <td className="py-2 text-right font-mono text-red-600">{formatMoney(row.unrealizedLoss)}</td>
                <td className="py-2 pl-4 text-muted-foreground">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

interface PlanDocument {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadDate: string;
  url: string;
}

function DocumentsTab({ planCode }: { planCode: string }) {
  const [docs, setDocs] = useState<PlanDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    wealthApi.getDocuments(planCode)
      .then((data) => setDocs((data ?? []).map((d) => ({
        id: String(d.id ?? ''),
        name: String(d.name ?? 'Document'),
        type: String(d.type ?? ''),
        uploadedBy: String(d.uploadedBy ?? ''),
        uploadDate: String(d.uploadDate ?? ''),
        url: String(d.url ?? ''),
      }))))
      .finally(() => setLoading(false));
  }, [planCode]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await wealthApi.uploadDocument(planCode, file);
      setDocs((prev) => [
        ...prev,
        {
          id: result.id,
          name: result.name || file.name,
          type: file.type || 'application/octet-stream',
          uploadedBy: 'Current User',
          uploadDate: result.uploadDate || new Date().toISOString(),
          url: '',
        },
      ]);
    } catch {
      // Silent fail — file upload may succeed on retry
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
          <FileText className="w-8 h-8" />
          <p className="text-sm">No documents uploaded</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded By</th>
                <th className="text-left px-4 py-3 font-medium">Upload Date</th>
                <th className="text-center px-4 py-3 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    {doc.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.uploadedBy}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {doc.uploadDate ? formatDate(doc.uploadDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        download
                        className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors text-primary"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'goals', label: 'Goals' },
  { id: 'tax', label: 'Tax Insights' },
  { id: 'documents', label: 'Documents' },
];

export function WealthPlanDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { data: plan, isLoading: loading, isError: error } = usePlan(code || '');
  const activatePlan = useActivatePlan();
  const closePlanMutation = useClosePlan();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const isAdmin = useHasRole('CBS_ADMIN');

  function handleActivate() {
    if (!code) return;
    activatePlan.mutate(code);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <AlertCircle className="w-10 h-10" />
        <p className="text-sm">Wealth plan not found</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={plan.planCode}
        subtitle="Wealth Plan"
        backTo="/wealth"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportWealthPlanPdf(plan)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors no-print"
              aria-label="Export plan as PDF"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <StatusBadge status={plan.status} size="md" dot />
            {isAdmin && plan.status === 'DRAFT' && (
              <button
                onClick={handleActivate}
                disabled={activatePlan.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                {activatePlan.isPending ? 'Activating…' : 'Activate'}
              </button>
            )}
            {isAdmin && plan.status === 'ACTIVE' && (
              <button
                onClick={() => code && closePlanMutation.mutate({ code, reason: 'Client request' })}
                disabled={closePlanMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {closePlanMutation.isPending ? 'Closing…' : 'Close Plan'}
              </button>
            )}
          </div>
        }
      />

      <div className="px-6 pb-8 space-y-5">
        {/* Tab bar */}
        <div className="flex gap-0.5 border-b overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab plan={plan} />}
        {activeTab === 'allocation' && <AllocationTab plan={plan} />}
        {activeTab === 'goals' && <GoalsTab plan={plan} />}
        {activeTab === 'tax' && <TaxInsightsTab />}
        {activeTab === 'documents' && <DocumentsTab planCode={plan.planCode} />}
      </div>
    </>
  );
}
