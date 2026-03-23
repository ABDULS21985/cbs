import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, DollarSign, Users, TrendingUp, BarChart2, MoreHorizontal,
  CheckCircle2, XCircle, Target, RefreshCw, UserPlus, AlertTriangle,
  ShieldAlert, Info, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import type {
  WealthPlan, CreateWealthPlanPayload, WealthAdvisor,
  PerformanceAttribution, RiskHeatmapRow, StressScenario, WealthInsight,
} from '../api/wealthApi';
import {
  useWealthPlans, useCreateWealthPlan, useActivatePlan, useClosePlan,
  useAssignAdvisor, useAddGoal, useRebalancePlan,
  useWealthAdvisors, useCreateAdvisor,
  useAumTrend, useAumBySegment, useConcentrationRisk, useFlowAnalysis,
  usePerformanceAttribution, useRiskHeatmap, useStressScenarios,
  useFeeRevenue, useWealthInsights,
} from '../hooks/useWealth';

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAN_TYPES = [
  'COMPREHENSIVE', 'RETIREMENT', 'ESTATE', 'TAX_OPTIMIZATION',
  'EDUCATION', 'INVESTMENT_ONLY', 'INSURANCE', 'SUCCESSION',
];

const RISK_PROFILES = ['CONSERVATIVE', 'MODERATE', 'BALANCED', 'AGGRESSIVE', 'VERY_AGGRESSIVE'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', ACTIVE: 'Active', UNDER_REVIEW: 'Under Review',
  SUSPENDED: 'Suspended', CLOSED: 'Closed',
};

// ─── Dialog helpers ──────────────────────────────────────────────────────────

function DialogBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}

function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mb-4">{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
const selectCls = `${inputCls} cursor-pointer`;

// ─── Create Plan Dialog ──────────────────────────────────────────────────────

function CreatePlanDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateWealthPlan();
  const [form, setForm] = useState<Partial<CreateWealthPlanPayload>>({ planType: 'COMPREHENSIVE' });

  const set = (k: keyof CreateWealthPlanPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.planType) {
      toast.error('Customer ID and Plan Type are required');
      return;
    }
    create.mutate(form as CreateWealthPlanPayload, {
      onSuccess: (plan) => {
        toast.success(`Plan ${plan.planCode} created`);
        onClose();
      },
      onError: () => toast.error('Failed to create plan'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>New Wealth Management Plan</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer ID *">
            <input required type="number" className={inputCls} value={form.customerId ?? ''} onChange={e => set('customerId', e.target.value ? Number(e.target.value) : undefined as any)} />
          </Field>
          <Field label="Customer Name">
            <input className={inputCls} value={form.customerName || ''} onChange={e => set('customerName', e.target.value)} placeholder="John Doe" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan Type *">
            <select className={selectCls} value={form.planType || ''} onChange={e => set('planType', e.target.value)}>
              {PLAN_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
          <Field label="Risk Profile">
            <select className={selectCls} value={form.riskProfile || ''} onChange={e => set('riskProfile', e.target.value)}>
              <option value="">Select...</option>
              {RISK_PROFILES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Net Worth">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.totalNetWorth ?? ''} onChange={e => set('totalNetWorth', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Investable Assets">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.totalInvestableAssets ?? ''} onChange={e => set('totalInvestableAssets', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Annual Income">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.annualIncome ?? ''} onChange={e => set('annualIncome', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Investment Horizon (years)">
            <input type="number" min="1" max="50" className={inputCls} value={form.investmentHorizon ?? ''} onChange={e => set('investmentHorizon', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Next Review Date">
            <input type="date" className={inputCls} value={form.nextReviewDate || ''} onChange={e => set('nextReviewDate', e.target.value)} />
          </Field>
        </div>
        <Field label="Advisor ID">
          <input className={inputCls} value={form.advisorId || ''} onChange={e => set('advisorId', e.target.value)} placeholder="ADV-001" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Add Goal Dialog ─────────────────────────────────────────────────────────

function AddGoalDialog({ planCode, onClose }: { planCode: string; onClose: () => void }) {
  const addGoal = useAddGoal();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !targetAmount) { toast.error('Name and target amount are required'); return; }
    addGoal.mutate({
      code: planCode,
      goal: { name, targetAmount: Number(targetAmount), targetDate, priority },
    }, {
      onSuccess: () => { toast.success('Goal added'); onClose(); },
      onError: () => toast.error('Failed to add goal'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>Add Financial Goal — {planCode}</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Goal Name *">
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Retirement Fund" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target Amount *">
            <input type="number" min="0" step="0.01" className={inputCls} value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
          </Field>
          <Field label="Target Date">
            <input type="date" className={inputCls} value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Priority">
          <select className={selectCls} value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={addGoal.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {addGoal.isPending ? 'Adding...' : 'Add Goal'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Assign Advisor Dialog ───────────────────────────────────────────────────

function AssignAdvisorDialog({ planCode, onClose }: { planCode: string; onClose: () => void }) {
  const assign = useAssignAdvisor();
  const { data: advisors = [] } = useWealthAdvisors();
  const [advisorId, setAdvisorId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!advisorId) { toast.error('Select an advisor'); return; }
    assign.mutate({ code: planCode, advisorId }, {
      onSuccess: () => { toast.success('Advisor assigned'); onClose(); },
      onError: () => toast.error('Failed to assign advisor'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>Assign Advisor — {planCode}</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Advisor *">
          <select className={selectCls} value={advisorId} onChange={e => setAdvisorId(e.target.value)}>
            <option value="">Select advisor...</option>
            {advisors.map(a => (
              <option key={a.advisorCode} value={a.advisorCode}>{a.fullName}</option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={assign.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {assign.isPending ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Plan Row Actions ────────────────────────────────────────────────────────

type PlanDialog =
  | { type: 'goal'; planCode: string }
  | { type: 'advisor'; planCode: string }
  | null;

function PlanRowActions({ plan, onAction }: { plan: WealthPlan; onAction: (d: PlanDialog) => void }) {
  const [open, setOpen] = useState(false);
  const activate = useActivatePlan();
  const close = useClosePlan();
  const rebalance = useRebalancePlan();

  const isClosed = plan.status === 'CLOSED';
  const isDraft = plan.status === 'DRAFT';

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-muted" title="Actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 bg-popover border border-border rounded-lg shadow-lg py-1 text-sm">
            {isDraft && (
              <button
                className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2 text-green-700 dark:text-green-400"
                onClick={() => {
                  setOpen(false);
                  activate.mutate(plan.planCode, {
                    onSuccess: () => toast.success('Plan activated'),
                    onError: () => toast.error('Failed to activate'),
                  });
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Activate
              </button>
            )}
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'goal', planCode: plan.planCode }); }}
            >
              <Target className="w-3.5 h-3.5" /> Add Goal
            </button>
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => { setOpen(false); onAction({ type: 'advisor', planCode: plan.planCode }); }}
            >
              <UserPlus className="w-3.5 h-3.5" /> Assign Advisor
            </button>
            <button
              disabled={isClosed || isDraft}
              className="w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                rebalance.mutate(plan.planCode, {
                  onSuccess: () => toast.success('Rebalance initiated'),
                  onError: () => toast.error('Failed to rebalance'),
                });
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Rebalance
            </button>
            <div className="border-t border-border my-1" />
            <button
              disabled={isClosed}
              className="w-full px-3 py-1.5 text-left hover:bg-muted text-destructive disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                close.mutate(plan.planCode, {
                  onSuccess: () => toast.success('Plan closed'),
                  onError: () => toast.error('Failed to close plan'),
                });
              }}
            >
              <XCircle className="w-3.5 h-3.5" /> Close Plan
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Plans Tab ───────────────────────────────────────────────────────────────

function PlansTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [planDialog, setPlanDialog] = useState<PlanDialog>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: plans = [], isLoading } = useWealthPlans();

  const filtered = useMemo(() => {
    if (!statusFilter) return plans;
    return plans.filter(p => p.status === statusFilter);
  }, [plans, statusFilter]);

  const totalAum = plans.reduce((s, p) => s + (p.totalInvestableAssets || 0), 0);
  const activeCount = plans.filter(p => p.status === 'ACTIVE').length;
  const draftCount = plans.filter(p => p.status === 'DRAFT').length;

  const cols: ColumnDef<WealthPlan, unknown>[] = [
    {
      accessorKey: 'planCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.planCode}</span>,
    },
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => row.original.customerName || `#${row.original.customerId}` },
    {
      accessorKey: 'planType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.planType} />,
    },
    { accessorKey: 'advisorName', header: 'Advisor', cell: ({ row }) => row.original.advisorName || row.original.advisorId || '—' },
    {
      accessorKey: 'totalInvestableAssets',
      header: 'AUM',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.totalInvestableAssets ? formatMoney(row.original.totalInvestableAssets) : '—'}</span>
      ),
    },
    {
      accessorKey: 'riskProfile',
      header: 'Risk',
      cell: ({ row }) => row.original.riskProfile ? <StatusBadge status={row.original.riskProfile} /> : '—',
    },
    {
      accessorKey: 'ytdReturn',
      header: 'YTD Return',
      cell: ({ row }) => {
        const r = row.original.ytdReturn;
        if (!r) return '—';
        const cls = r >= 0 ? 'text-green-600' : 'text-red-600';
        return <span className={`font-mono text-sm ${cls}`}>{r.toFixed(2)}%</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER']}>
          <PlanRowActions plan={row.original} onAction={setPlanDialog} />
        </RoleGuard>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Plans" value={plans.length} format="number" icon={Users} loading={isLoading} />
        <StatCard label="Active Plans" value={activeCount} format="number" icon={CheckCircle2} loading={isLoading} />
        <StatCard label="Total AUM" value={totalAum} format="money" compact icon={DollarSign} loading={isLoading} />
        <StatCard label="Draft Plans" value={draftCount} format="number" icon={AlertTriangle} loading={isLoading} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <RoleGuard roles="CBS_ADMIN">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </RoleGuard>
        <select className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
        )}
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="wealth-plans"
        emptyMessage="No wealth management plans found"
      />

      {showCreate && <CreatePlanDialog onClose={() => setShowCreate(false)} />}
      {planDialog?.type === 'goal' && <AddGoalDialog planCode={planDialog.planCode} onClose={() => setPlanDialog(null)} />}
      {planDialog?.type === 'advisor' && <AssignAdvisorDialog planCode={planDialog.planCode} onClose={() => setPlanDialog(null)} />}
    </div>
  );
}

// ─── Advisors Tab ────────────────────────────────────────────────────────────

function AdvisorsTab() {
  const { data: advisors = [], isLoading } = useWealthAdvisors();
  const createAdvisor = useCreateAdvisor();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  function handleCreateAdvisor(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) { toast.error('Name and email are required'); return; }
    createAdvisor.mutate({ fullName: name, email, phone: phone || undefined }, {
      onSuccess: (a) => { toast.success(`Advisor ${a.advisorCode} created`); setShowCreate(false); setName(''); setEmail(''); setPhone(''); },
      onError: () => toast.error('Failed to create advisor'),
    });
  }

  const cols: ColumnDef<WealthAdvisor, unknown>[] = [
    {
      accessorKey: 'advisorCode',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.advisorCode}</span>,
    },
    { accessorKey: 'fullName', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '—',
    },
    {
      accessorKey: 'maxClients',
      header: 'Max Clients',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.maxClients ?? '—'}</span>,
    },
    {
      accessorKey: 'managementFeePct',
      header: 'Mgt Fee',
      cell: ({ row }) => row.original.managementFeePct != null
        ? <span className="font-mono text-sm">{(row.original.managementFeePct * 100).toFixed(2)}%</span>
        : '—',
    },
    {
      accessorKey: 'joinDate',
      header: 'Joined',
      cell: ({ row }) => row.original.joinDate ? formatDate(row.original.joinDate) : '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RoleGuard roles="CBS_ADMIN">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Advisor
          </button>
        </RoleGuard>
      </div>

      <DataTable
        columns={cols}
        data={advisors}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="wealth-advisors"
        emptyMessage="No advisors found"
      />

      {showCreate && (
        <DialogBackdrop>
          <DialogTitle>Register New Advisor</DialogTitle>
          <form onSubmit={handleCreateAdvisor} className="space-y-4">
            <Field label="Full Name *">
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" />
            </Field>
            <Field label="Email *">
              <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane.doe@cbs.ng" />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234-800-000-0000" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
              <button type="submit" disabled={createAdvisor.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {createAdvisor.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </DialogBackdrop>
      )}
    </div>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: aumTrend = [] } = useAumTrend();
  const { data: segments = [] } = useAumBySegment();
  const { data: concentration = [] } = useConcentrationRisk();
  const { data: flows = [] } = useFlowAnalysis();
  const { data: attribution = [] } = usePerformanceAttribution();
  const { data: heatmap = [] } = useRiskHeatmap();
  const { data: stress = [] } = useStressScenarios();
  const { data: feeRevenue = [] } = useFeeRevenue();
  const { data: insights = [] } = useWealthInsights();

  const totalAum = aumTrend.length > 0 ? aumTrend[aumTrend.length - 1].aum : 0;

  return (
    <div className="space-y-6">
      {/* Insights banner */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.filter(i => i.severity === 'HIGH' || i.type === 'WARNING' || i.type === 'RISK').map((insight, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
              insight.severity === 'HIGH' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
              'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
            }`}>
              {insight.type === 'RISK' ? <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> :
               insight.type === 'WARNING' ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> :
               <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
                <p className="text-xs text-primary mt-1">{insight.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AUM Trend */}
      {aumTrend.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-4">AUM Trend & Monthly Returns</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={aumTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis yAxisId="aum" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis yAxisId="ret" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="aum" type="monotone" dataKey="aum" name="AUM" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line yAxisId="ret" type="monotone" dataKey="returns" name="Return %" stroke="#22c55e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Segments */}
        {segments.length > 0 && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">AUM by Client Segment</h3>
            <div className="space-y-3">
              {segments.map(seg => (
                <div key={seg.segment} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{seg.segment}</p>
                    <p className="text-xs text-muted-foreground">{seg.clientCount} clients · {seg.planCount} plans</p>
                  </div>
                  <span className="font-mono text-sm font-medium">{formatMoney(seg.totalAum)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Concentration Risk */}
        {concentration.length > 0 && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">Top Client Concentration</h3>
            <div className="space-y-2">
              {concentration.slice(0, 5).map(c => (
                <div key={c.customerId} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.clientName}</p>
                    <p className="text-xs text-muted-foreground">{c.planCount} plans</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{formatMoney(c.totalAum)}</p>
                    <p className={`text-xs font-medium ${c.percentOfTotal > 15 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {c.percentOfTotal.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Flow Analysis */}
      {flows.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-4">Monthly Inflow / Outflow</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={flows}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inflows" name="Inflows" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflows" name="Outflows" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Attribution */}
      {attribution.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3">Advisor Performance Attribution</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4">Advisor</th>
                  <th className="text-right py-2 px-2">AUM</th>
                  <th className="text-right py-2 px-2">Clients</th>
                  <th className="text-right py-2 px-2">Return</th>
                  <th className="text-right py-2 px-2">Excess</th>
                  <th className="text-right py-2 px-2">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {attribution.map(a => (
                  <tr key={a.advisorId} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{a.advisorName}</td>
                    <td className="py-2 px-2 text-right font-mono">{formatMoney(a.aumManaged)}</td>
                    <td className="py-2 px-2 text-right">{a.clientCount}</td>
                    <td className="py-2 px-2 text-right font-mono">{a.portfolioReturn.toFixed(2)}%</td>
                    <td className={`py-2 px-2 text-right font-mono ${a.excessReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {a.excessReturn >= 0 ? '+' : ''}{a.excessReturn.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{a.sharpeRatio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risk Heatmap */}
      {heatmap.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3">Risk Heatmap by Asset Class</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4">Asset Class</th>
                  <th className="text-right py-2 px-2">Alloc %</th>
                  <th className="text-center py-2 px-2">Market</th>
                  <th className="text-center py-2 px-2">Credit</th>
                  <th className="text-center py-2 px-2">Liquidity</th>
                  <th className="text-center py-2 px-2">FX</th>
                  <th className="text-center py-2 px-2">Conc.</th>
                  <th className="text-center py-2 px-2">Overall</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map(row => (
                  <tr key={row.assetClass} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.assetClass}</td>
                    <td className="py-2 px-2 text-right font-mono">{row.allocationPct.toFixed(1)}%</td>
                    {([row.marketRisk, row.creditRisk, row.liquidityRisk, row.fxRisk, row.concentrationRisk, row.overallRisk] as number[]).map((score, i) => (
                      <td key={i} className="py-2 px-2 text-center">
                        <span className={`inline-block w-8 py-0.5 rounded text-center font-mono text-[10px] font-bold ${
                          score >= 70 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                          score >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                          'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                        }`}>
                          {score}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stress Scenarios */}
      {stress.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3">Stress Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {stress.map(s => (
              <div key={s.scenario} className={`p-4 rounded-lg border ${
                s.severity === 'CRITICAL' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                s.severity === 'HIGH' ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' :
                'border-border bg-muted/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold">{s.severity}</span>
                </div>
                <p className="text-sm font-medium mb-1">{s.scenario}</p>
                <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-red-600">{formatMoney(s.portfolioImpact)}</span>
                  <span>{s.affectedClients} clients · {s.recoveryMonths}mo recovery</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee Revenue */}
      {feeRevenue.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-4">Monthly Fee Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={feeRevenue}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e3).toFixed(0)}K`} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="advisoryFees" name="Advisory" fill="#6366f1" stackId="a" />
              <Bar dataKey="managementFees" name="Management" fill="#8b5cf6" stackId="a" />
              <Bar dataKey="performanceFees" name="Performance" fill="#a78bfa" stackId="a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function WealthManagementPage() {
  return (
    <>
      <PageHeader
        title="Wealth Management"
        subtitle="Financial planning, goals, estate strategy, advisor assignment, and advanced analytics"
      />
      <div className="page-container space-y-6">
        <TabsPage
          syncWithUrl
          tabs={[
            { id: 'plans', label: 'Plans', content: <PlansTab /> },
            { id: 'advisors', label: 'Advisors', content: <AdvisorsTab /> },
            { id: 'analytics', label: 'Analytics', content: <AnalyticsTab /> },
          ]}
        />
      </div>
    </>
  );
}
