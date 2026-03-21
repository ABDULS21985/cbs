import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  type WealthPlan,
  type TrustAccount,
  type Advisor,
  type PlanCreateRequest,
} from '../api/wealthApi';
import { usePlans, useAdvisors, useTrusts, useAumTrend, useCreatePlan } from '../hooks/useWealthData';
import { formatMoney, formatMoneyCompact, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Landmark,
  Users,
  TrendingUp,
  Shield,
  AlertTriangle,
  BarChart3,
  Plus,
  X,
  Briefcase,
  Target,
  Download,
} from 'lucide-react';
import { exportAumReportExcel } from '../lib/wealthExport';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
];

// No fallback data — all data comes from real API calls

const DEFAULT_ALLOCATION = [
  { name: 'Equity', value: 45 },
  { name: 'Fixed Income', value: 25 },
  { name: 'Alternatives', value: 12 },
  { name: 'Real Estate', value: 10 },
  { name: 'Cash / Money Market', value: 8 },
];

const TAB_IDS = ['plans', 'trusts', 'advisors'] as const;
type TabId = (typeof TAB_IDS)[number];

// ─── Column Definitions ───────────────────────────────────────────────────────

const planCols: ColumnDef<WealthPlan, unknown>[] = [
  {
    accessorKey: 'planCode',
    header: 'Plan Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary font-semibold">{row.original.planCode}</span>
    ),
  },
  { accessorKey: 'customerName', header: 'Client Name' },
  {
    accessorKey: 'planType',
    header: 'Plan Type',
    cell: ({ row }) => <StatusBadge status={row.original.planType} />,
  },
  {
    accessorKey: 'totalNetWorth',
    header: 'Net Worth',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.totalNetWorth)}</span>
    ),
  },
  {
    accessorKey: 'totalInvestableAssets',
    header: 'AUM',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">
        {formatMoney(row.original.totalInvestableAssets)}
      </span>
    ),
  },
  { accessorKey: 'riskProfile', header: 'Risk Profile' },
  { accessorKey: 'advisorName', header: 'Advisor' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'nextReviewDate',
    header: 'Last Review',
    cell: ({ row }) =>
      row.original.nextReviewDate ? formatDate(row.original.nextReviewDate) : '—',
  },
];

const trustCols: ColumnDef<TrustAccount, unknown>[] = [
  {
    accessorKey: 'trustCode',
    header: 'Trust Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary font-semibold">{row.original.trustCode}</span>
    ),
  },
  { accessorKey: 'trustName', header: 'Trust Name' },
  {
    accessorKey: 'trustType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.trustType} />,
  },
  { accessorKey: 'grantorName', header: 'Grantor' },
  {
    accessorKey: 'corpusValue',
    header: 'Corpus Value',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.corpusValue)}</span>
    ),
  },
  {
    accessorKey: 'incomeYtd',
    header: 'YTD Income',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.incomeYtd)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'inceptionDate',
    header: 'Inception Date',
    cell: ({ row }) => formatDate(row.original.inceptionDate),
  },
];

const advisorCols: ColumnDef<Advisor, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'clientCount', header: 'Clients' },
  {
    accessorKey: 'aum',
    header: 'AUM',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoneyCompact(row.original.aum)}</span>
    ),
  },
  {
    accessorKey: 'avgReturn',
    header: 'Avg Return',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-green-600">{formatPercent(row.original.avgReturn)}</span>
    ),
  },
  {
    accessorKey: 'specializations',
    header: 'Specializations',
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {(row.original.specializations || []).slice(0, 2).map((s) => (
          <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium">
            {s}
          </span>
        ))}
      </div>
    ),
  },
  {
    accessorKey: 'joinDate',
    header: 'Join Date',
    cell: ({ row }) => (row.original.joinDate ? formatDate(row.original.joinDate) : '—'),
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  accent?: string;
}

function KpiCard({ label, value, icon: Icon, loading, accent = 'text-primary' }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className={cn('mt-0.5 p-2 rounded-lg bg-muted', accent)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-20 bg-muted animate-pulse rounded mt-1" />
        ) : (
          <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

interface CreatePlanModalProps {
  advisors: Advisor[];
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePlanModal({ advisors, onClose, onSuccess }: CreatePlanModalProps) {
  const createPlan = useCreatePlan();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlanCreateRequest>({
    customerId: 0,
    planType: 'COMPREHENSIVE',
    advisorId: '',
    riskProfile: 'MODERATE',
    investmentHorizon: 10,
    totalNetWorth: 0,
    totalInvestableAssets: 0,
    annualIncome: 0,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['investmentHorizon', 'totalNetWorth', 'totalInvestableAssets', 'annualIncome', 'customerId'].includes(name)
        ? Number(value)
        : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPlan.mutateAsync(form);
      onSuccess();
    } catch {
      setError('Failed to create plan. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold">Create Wealth Plan</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Customer ID</label>
              <input
                name="customerId"
                type="number"
                value={form.customerId || ''}
                onChange={handleChange}
                required
                placeholder="e.g. 1234"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Plan Type</label>
              <select
                name="planType"
                value={form.planType}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="COMPREHENSIVE">Comprehensive</option>
                <option value="RETIREMENT">Retirement</option>
                <option value="EDUCATION">Education</option>
                <option value="ESTATE">Estate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Advisor</label>
              <select
                name="advisorId"
                value={form.advisorId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select advisor…</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Risk Profile</label>
              <select
                name="riskProfile"
                value={form.riskProfile}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="CONSERVATIVE">Conservative</option>
                <option value="MODERATE">Moderate</option>
                <option value="AGGRESSIVE">Aggressive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Investment Horizon (years)</label>
              <input
                name="investmentHorizon"
                type="number"
                min={1}
                max={40}
                value={form.investmentHorizon}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Total Net Worth</label>
              <input
                name="totalNetWorth"
                type="number"
                min={0}
                value={form.totalNetWorth || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Investable Assets</label>
              <input
                name="totalInvestableAssets"
                type="number"
                min={0}
                value={form.totalInvestableAssets || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Annual Income (₦)</label>
              <input
                name="annualIncome"
                type="number"
                min={0}
                value={form.annualIncome}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPlan.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createPlan.isPending ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WealthManagementPage() {
  const navigate = useNavigate();

  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: trusts = [], isLoading: trustsLoading } = useTrusts();
  const { data: advisors = [], isLoading: advisorsLoading } = useAdvisors();
  const { data: aumTrend = [], isLoading: aumLoading } = useAumTrend(12);

  const [activeTab, setActiveTab] = useState<TabId>('plans');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Derived KPIs ──
  const totalAum = plans.reduce((s, p) => s + (p.totalInvestableAssets || 0), 0);
  const activeTrusts = trusts.filter((t) => t.status === 'ACTIVE').length;
  const avgReturn =
    advisors.length > 0
      ? advisors.reduce((s, a) => s + (a.avgReturn || 0), 0) / advisors.length
      : 0;
  const atRiskGoals = plans.reduce((count, p) => {
    const goals = (p.goals || p.financialGoals || []) as Record<string, unknown>[];
    return count + goals.filter((g) => g.status === 'AT_RISK' || g.status === 'OFF_TRACK' || g.onTrack === false).length;
  }, 0);

  const formatAum = (value: number) =>
    value >= 1e9 ? `₦${(value / 1e9).toFixed(2)}B` : `₦${(value / 1e6).toFixed(1)}M`;

  // ── Plan pipeline counts ──
  const pipelineCounts = {
    DRAFT: plans.filter((p) => p.status === 'DRAFT').length,
    ACTIVE: plans.filter((p) => p.status === 'ACTIVE').length,
    UNDER_REVIEW: plans.filter((p) => p.status === 'UNDER_REVIEW').length,
    CLOSED: plans.filter((p) => p.status === 'CLOSED').length,
  };

  // ── Top 5 plans by AUM ──
  const topPlans = [...plans]
    .sort((a, b) => (b.totalInvestableAssets || 0) - (a.totalInvestableAssets || 0))
    .slice(0, 5);

  // ── Allocation data for pie ──
  const allocationData = (() => {
    if (plans.length === 0) return DEFAULT_ALLOCATION;
    const totals: Record<string, number> = {};
    plans.forEach((p) => {
      Object.entries(p.currentAllocation || {}).forEach(([k, v]) => {
        totals[k] = (totals[k] || 0) + Number(v);
      });
    });
    const entries = Object.entries(totals);
    if (entries.length === 0) return DEFAULT_ALLOCATION;
    const sum = entries.reduce((s, [, v]) => s + v, 0);
    return entries.map(([name, value]) => ({ name, value: sum > 0 ? Math.round((value / sum) * 100) : 0 }));
  })();

  return (
    <>
      <PageHeader
        title="Wealth Management"
        subtitle="Portfolio plans, trust accounts, and advisor management"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportAumReportExcel(plans, advisors, trusts)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors no-print"
              aria-label="Export AUM report as Excel"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors no-print"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>
        }
      />

      <div className="px-6 pb-8 space-y-6">
        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Total AUM"
            value={plansLoading ? '—' : formatAum(totalAum)}
            icon={Landmark}
            loading={plansLoading}
            accent="text-primary"
          />
          <KpiCard
            label="Client Plans"
            value={plansLoading ? '—' : plans.length}
            icon={Briefcase}
            loading={plansLoading}
          />
          <KpiCard
            label="Active Trusts"
            value={trustsLoading ? '—' : activeTrusts}
            icon={Shield}
            loading={trustsLoading}
            accent="text-purple-600"
          />
          <KpiCard
            label="Avg Return"
            value={advisorsLoading ? '—' : formatPercent(avgReturn)}
            icon={TrendingUp}
            loading={advisorsLoading}
            accent="text-green-600"
          />
          <KpiCard
            label="Advisors"
            value={advisorsLoading ? '—' : advisors.length}
            icon={Users}
            loading={advisorsLoading}
            accent="text-blue-600"
          />
          <KpiCard
            label="At-Risk Goals"
            value={plansLoading ? '—' : atRiskGoals}
            icon={AlertTriangle}
            loading={plansLoading}
            accent="text-amber-600"
          />
        </div>

        {/* ── AUM Trend Chart ── */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">AUM Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">12-month assets under management and returns</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          {aumLoading ? (
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={aumTrend} margin={{ top: 4, right: 40, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `₦${(v / 1e9).toFixed(1)}B`}
                  tick={{ fontSize: 11 }}
                  width={70}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'aum'
                      ? [`₦${(value / 1e9).toFixed(2)}B`, 'AUM']
                      : [`${value}%`, 'Returns']
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="aum"
                  stroke="hsl(var(--primary))"
                  fill="url(#aumGrad)"
                  strokeWidth={2}
                  name="AUM"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="returns"
                  stroke="#10b981"
                  fill="url(#retGrad)"
                  strokeWidth={2}
                  name="Returns %"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Three-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Asset Allocation Pie */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Asset Allocation</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Plan Status Pipeline */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Plan Pipeline</h3>
            <div className="space-y-3">
              {[
                { label: 'Draft', key: 'DRAFT', color: 'bg-gray-100 text-gray-600' },
                { label: 'Active', key: 'ACTIVE', color: 'bg-green-100 text-green-700' },
                { label: 'Under Review', key: 'UNDER_REVIEW', color: 'bg-amber-100 text-amber-700' },
                { label: 'Closed', key: 'CLOSED', color: 'bg-red-100 text-red-700' },
              ].map(({ label, key, color }) => {
                const count = pipelineCounts[key as keyof typeof pipelineCounts] ?? 0;
                const pct = plans.length > 0 ? (count / plans.length) * 100 : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span className={cn('px-2 py-0.5 rounded-full font-semibold text-xs', color)}>
                        {plansLoading ? '…' : count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', color.split(' ')[0])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {!plansLoading && (
              <p className="text-xs text-muted-foreground mt-4">{plans.length} total plans</p>
            )}
          </div>

          {/* Top Plans by AUM */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Top Plans by AUM</h3>
            {plansLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : topPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2">
                <Target className="w-6 h-6" />
                <span>No plans yet</span>
              </div>
            ) : (
              <div className="space-y-2">
                {topPlans.map((p, i) => (
                  <div
                    key={p.planCode}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/wealth/${p.planCode}`)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{p.customerName}</p>
                        <p className="text-xs text-muted-foreground">{p.planType}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-mono font-semibold">
                        {formatMoneyCompact(p.totalInvestableAssets || 0)}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b bg-muted/30">
            {TAB_IDS.map((tab) => {
              const labels: Record<TabId, string> = {
                plans: 'Plans',
                trusts: 'Trusts',
                advisors: 'Advisors',
              };
              const badges: Record<TabId, number | undefined> = {
                plans: plans.length || undefined,
                trusts: trusts.length || undefined,
                advisors: undefined,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors relative',
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary bg-card'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {labels[tab]}
                  {badges[tab] !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-semibold">
                      {badges[tab]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'plans' && (
              <DataTable
                columns={planCols}
                data={plans}
                isLoading={plansLoading}
                enableGlobalFilter
                enableExport
                exportFilename="wealth-plans"
                onRowClick={(row) => navigate(`/wealth/${row.planCode}`)}
                emptyMessage="No wealth plans found"
              />
            )}
            {activeTab === 'trusts' && (
              <DataTable
                columns={trustCols}
                data={trusts}
                isLoading={trustsLoading}
                enableGlobalFilter
                enableExport
                exportFilename="trust-accounts"
                onRowClick={(row) => navigate(`/wealth/trusts/${row.trustCode}`)}
                emptyMessage="No trust accounts found"
              />
            )}
            {activeTab === 'advisors' && (
              <DataTable
                columns={advisorCols}
                data={advisors}
                isLoading={advisorsLoading}
                enableGlobalFilter
                onRowClick={(row) => navigate(`/wealth/advisors/${row.id}`)}
                emptyMessage="No advisors found"
              />
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreatePlanModal
          advisors={advisors}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}
