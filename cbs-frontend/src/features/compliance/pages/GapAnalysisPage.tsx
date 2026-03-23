import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Target, AlertTriangle, Clock, CheckCircle2, ShieldAlert, ShieldOff, Plus, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useGapAnalysisList,
  useGapAnalysisDashboard,
  useOverdueGapAnalysis,
  useIdentifyGap,
  usePlanGapAnalysis,
  useProgressGapAnalysis,
  useCloseGapAnalysis,
  useVerifyGapAnalysis,
  useAcceptGapAnalysisRisk,
} from '../hooks/useComplianceExt';
import { GapAgingChart } from '../components/compliance/GapAgingChart';
import type { ComplianceGapAnalysis } from '../types/gapAnalysis';
import type { ComplianceGap } from '../api/complianceApi';

// ── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MAJOR: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MINOR: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OBSERVATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const CATEGORY_COLORS: Record<string, string> = {
  POLICY: 'bg-blue-100 text-blue-700', PROCESS: 'bg-purple-100 text-purple-700',
  SYSTEM: 'bg-orange-100 text-orange-700', TECHNOLOGY: 'bg-orange-100 text-orange-700',
  PEOPLE: 'bg-teal-100 text-teal-700', DOCUMENTATION: 'bg-gray-100 text-gray-700',
  DATA: 'bg-cyan-100 text-cyan-700',
};

const LIFECYCLE_STAGES = ['IDENTIFIED', 'REMEDIATION_PLANNED', 'IN_PROGRESS', 'REMEDIATED', 'VERIFIED'] as const;
const TERMINAL_STATES = ['REMEDIATED', 'VERIFIED', 'ACCEPTED_RISK'];

const PIE_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MAJOR: '#f97316', MEDIUM: '#f59e0b', MINOR: '#f59e0b', LOW: '#22c55e', OBSERVATION: '#3b82f6' };

// ── Lifecycle Pipeline ───────────────────────────────────────────────────────

function LifecyclePipeline({ gaps, onFilter }: { gaps: any[]; onFilter: (status: string) => void }) {
  const counts = LIFECYCLE_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = gaps.filter((g) => (g.status ?? '') === s).length;
    return acc;
  }, {});
  const riskCount = gaps.filter((g) => g.status === 'ACCEPTED_RISK').length;

  return (
    <div className="surface-card p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Gap Lifecycle Pipeline</h3>
      <div className="flex items-center gap-1">
        {LIFECYCLE_STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center">
            <button onClick={() => onFilter(stage)}
              className="flex flex-col items-center px-3 py-2 rounded-lg hover:bg-muted transition-colors min-w-[80px]">
              <span className="text-lg font-bold">{counts[stage] ?? 0}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{stage.replace(/_/g, ' ')}</span>
            </button>
            {i < LIFECYCLE_STAGES.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />}
          </div>
        ))}
        <div className="ml-4 border-l pl-4">
          <button onClick={() => onFilter('ACCEPTED_RISK')}
            className="flex flex-col items-center px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <span className="text-lg font-bold text-muted-foreground">{riskCount}</span>
            <span className="text-[10px] text-muted-foreground">ACCEPTED RISK</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row Expansion ────────────────────────────────────────────────────────────

function GapExpansion({ gap }: { gap: ComplianceGapAnalysis }) {
  return (
    <div className="p-4 space-y-4 bg-muted/20 border-t">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30 p-3">
          <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Current State</h4>
          <p className="text-sm">{gap.currentState || '—'}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/30 p-3">
          <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Target State</h4>
          <p className="text-sm">{gap.targetState || '—'}</p>
        </div>
      </div>
      <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Gap Description</h4><p className="text-sm">{gap.gapDescription || '—'}</p></div>
      {gap.remediationDescription && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Remediation Plan</h4><p className="text-sm">{gap.remediationDescription}</p></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {gap.remediationCost > 0 && <div><span className="text-muted-foreground">Cost:</span> <span className="font-mono font-medium">{formatMoney(gap.remediationCost)}</span></div>}
        {gap.remediationStartDate && <div><span className="text-muted-foreground">Start:</span> {formatDate(gap.remediationStartDate)}</div>}
        {gap.remediationTargetDate && <div><span className="text-muted-foreground">Target:</span> {formatDate(gap.remediationTargetDate)}</div>}
        {gap.remediationActualDate && <div><span className="text-muted-foreground">Completed:</span> {formatDate(gap.remediationActualDate)}</div>}
        {gap.verifiedBy && <div><span className="text-muted-foreground">Verified By:</span> {gap.verifiedBy}</div>}
        {gap.verifiedAt && <div><span className="text-muted-foreground">Verified:</span> {formatDate(gap.verifiedAt)}</div>}
      </div>
    </div>
  );
}

// ── Identify Gap Dialog ──────────────────────────────────────────────────────

function IdentifyGapDialog({ onClose }: { onClose: () => void }) {
  const identify = useIdentifyGap();
  const [form, setForm] = useState({
    requirementRef: '', requirementDescription: '', regulatorySource: 'LOCAL_REGULATION',
    clauseReference: '', currentState: '', targetState: '', gapDescription: '',
    gapSeverity: 'MEDIUM', gapCategory: 'PROCESS', riskIfUnaddressed: 'MEDIUM',
  });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    identify.mutate(form as any, {
      onSuccess: () => { toast.success('Gap identified'); onClose(); },
      onError: () => toast.error('Failed to identify gap'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Identify New Gap</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Requirement Ref *</label><input value={form.requirementRef} onChange={(e) => setForm({ ...form, requirementRef: e.target.value })} className={fc} required /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Regulatory Source</label>
              <select value={form.regulatorySource} onChange={(e) => setForm({ ...form, regulatorySource: e.target.value })} className={fc}>
                {['BASEL_III', 'MAS_GUIDELINES', 'MIFID', 'GDPR', 'FATCA', 'CRS', 'LOCAL_REGULATION', 'OTHER'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select></div>
          </div>
          <div><label className="text-xs font-medium text-muted-foreground">Requirement Description *</label><textarea value={form.requirementDescription} onChange={(e) => setForm({ ...form, requirementDescription: e.target.value })} rows={2} className={fc} required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Clause Reference</label><input value={form.clauseReference} onChange={(e) => setForm({ ...form, clauseReference: e.target.value })} className={fc} /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Current State *</label><textarea value={form.currentState} onChange={(e) => setForm({ ...form, currentState: e.target.value })} rows={2} className={fc} required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Target State *</label><textarea value={form.targetState} onChange={(e) => setForm({ ...form, targetState: e.target.value })} rows={2} className={fc} required /></div>
          <div><label className="text-xs font-medium text-muted-foreground">Gap Description *</label><textarea value={form.gapDescription} onChange={(e) => setForm({ ...form, gapDescription: e.target.value })} rows={2} className={fc} required /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground">Severity</label>
              <select value={form.gapSeverity} onChange={(e) => setForm({ ...form, gapSeverity: e.target.value })} className={fc}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Category</label>
              <select value={form.gapCategory} onChange={(e) => setForm({ ...form, gapCategory: e.target.value })} className={fc}>
                {['POLICY', 'PROCESS', 'SYSTEM', 'PEOPLE', 'DOCUMENTATION'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-muted-foreground">Risk if Unaddressed</label>
              <select value={form.riskIfUnaddressed} onChange={(e) => setForm({ ...form, riskIfUnaddressed: e.target.value })} className={fc}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={identify.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {identify.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Identify Gap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Plan Remediation Dialog ──────────────────────────────────────────────────

function PlanRemediationDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const planGap = usePlanGapAnalysis();
  const [form, setForm] = useState({ owner: '', description: '', targetDate: '' });
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    planGap.mutate({ code, ...form }, {
      onSuccess: () => { toast.success('Remediation planned'); onClose(); },
      onError: () => toast.error('Failed to plan remediation'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Plan Remediation</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Remediation Owner *</label>
            <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className={fc} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={fc} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Target Date *</label>
            <input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className={fc} required />
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={planGap.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {planGap.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Plan Remediation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Verify Gap Dialog ────────────────────────────────────────────────────────

function VerifyGapDialog({ code, onClose }: { code: string; onClose: () => void }) {
  const verifyGap = useVerifyGapAnalysis();
  const [verifiedBy, setVerifiedBy] = useState('');
  const fc = 'w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyGap.mutate({ code, verifiedBy }, {
      onSuccess: () => { toast.success('Gap verified'); onClose(); },
      onError: () => toast.error('Verification failed'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl bg-background border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Verify Gap Remediation</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Verified By *</label>
            <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className={fc} placeholder="Staff ID or name" required />
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={verifyGap.isPending} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
              {verifyGap.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function GapAnalysisPage() {
  const [showIdentify, setShowIdentify] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [planTarget, setPlanTarget] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<string | null>(null);

  const { data: gaps = [], isLoading } = useGapAnalysisList();
  const { data: dashboard } = useGapAnalysisDashboard();
  const { data: overdueGaps = [] } = useOverdueGapAnalysis();

  const progressGap = useProgressGapAnalysis();
  const closeGap = useCloseGapAnalysis();
  const acceptRisk = useAcceptGapAnalysisRisk();

  const handleAction = (code: string, action: 'progress' | 'close' | 'acceptRisk') => {
    const mutations: Record<string, any> = { progress: progressGap, close: closeGap, acceptRisk };
    mutations[action]?.mutate(code, {
      onSuccess: () => toast.success(`Gap ${action === 'acceptRisk' ? 'risk accepted' : action + 'ed'}`),
      onError: () => toast.error('Action failed'),
    });
  };

  const filteredGaps = statusFilter ? gaps.filter((g: any) => g.status === statusFilter) : gaps;

  // Dashboard stats
  const stats = dashboard as Record<string, any> ?? {};
  const totalGaps = gaps.length;
  const criticalCount = gaps.filter((g: any) => g.gapSeverity === 'CRITICAL').length;
  const inProgressCount = gaps.filter((g: any) => g.status === 'IN_PROGRESS').length;
  const remediatedCount = gaps.filter((g: any) => g.status === 'REMEDIATED').length;
  const overdueCount = overdueGaps.length;
  const acceptedRiskCount = gaps.filter((g: any) => g.status === 'ACCEPTED_RISK').length;

  // Chart data
  const severityData = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => ({
    name: s, value: gaps.filter((g: any) => g.gapSeverity === s).length,
  })).filter((d) => d.value > 0);

  const categoryData = ['POLICY', 'PROCESS', 'SYSTEM', 'PEOPLE', 'DOCUMENTATION'].map((c) => ({
    name: c, count: gaps.filter((g: any) => g.gapCategory === c).length,
  })).filter((d) => d.count > 0);

  // Map full gap analysis items to ComplianceGap shape for GapAgingChart
  const gapsForAging = gaps.map((g: any) => ({
    ...g,
    ageDays: g.ageDays ?? Math.floor((Date.now() - new Date(g.createdAt ?? g.remediationStartDate ?? Date.now()).getTime()) / 86400000),
  }));

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: 'analysisCode', header: 'Code', cell: ({ row }) => (
      <button onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)} className="font-mono text-xs text-primary hover:underline flex items-center gap-1">
        {expandedId === row.original.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {row.original.analysisCode}
      </button>
    )},
    { accessorKey: 'requirementRef', header: 'Requirement', cell: ({ row }) => <span className="text-xs">{row.original.requirementRef}</span> },
    { accessorKey: 'regulatorySource', header: 'Source', cell: ({ row }) => <span className="text-xs bg-muted px-2 py-0.5 rounded">{row.original.regulatorySource}</span> },
    { accessorKey: 'gapSeverity', header: 'Severity', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[row.original.gapSeverity])}>{row.original.gapSeverity}</span> },
    { accessorKey: 'gapCategory', header: 'Category', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded text-xs font-medium', CATEGORY_COLORS[row.original.gapCategory])}>{row.original.gapCategory}</span> },
    { accessorKey: 'riskIfUnaddressed', header: 'Risk', cell: ({ row }) => <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[row.original.riskIfUnaddressed])}>{row.original.riskIfUnaddressed}</span> },
    { accessorKey: 'remediationOwner', header: 'Owner', cell: ({ row }) => <span className="text-sm">{row.original.remediationOwner || '—'}</span> },
    { accessorKey: 'remediationTargetDate', header: 'Target', cell: ({ row }) => {
      const d = row.original.remediationTargetDate;
      if (!d) return <span className="text-xs text-muted-foreground">—</span>;
      const isOverdue = new Date(d) < new Date() && !TERMINAL_STATES.includes(row.original.status);
      const isSoon = !isOverdue && new Date(d) < new Date(Date.now() + 7 * 86400000);
      return <span className={cn('text-xs', isOverdue ? 'text-red-600 font-bold' : isSoon ? 'text-amber-600' : '')}>{formatDate(d)}</span>;
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { id: 'actions', header: '', cell: ({ row }) => {
      const s = row.original.status;
      const code = row.original.analysisCode;
      return (
        <div className="flex gap-1">
          {s === 'IDENTIFIED' && <button onClick={() => setPlanTarget(code)} className="px-2 py-0.5 text-[10px] rounded border hover:bg-muted">Plan</button>}
          {s === 'REMEDIATION_PLANNED' && <button onClick={() => handleAction(code, 'progress')} className="px-2 py-0.5 text-[10px] rounded border hover:bg-muted">Start</button>}
          {s === 'IN_PROGRESS' && <button onClick={() => handleAction(code, 'close')} className="px-2 py-0.5 text-[10px] rounded border hover:bg-muted">Remediate</button>}
          {s === 'REMEDIATED' && <button onClick={() => setVerifyTarget(code)} className="px-2 py-0.5 text-[10px] rounded border hover:bg-muted">Verify</button>}
          {!TERMINAL_STATES.includes(s) && <button onClick={() => handleAction(code, 'acceptRisk')} className="px-2 py-0.5 text-[10px] rounded border text-amber-600 hover:bg-amber-50">Accept Risk</button>}
        </div>
      );
    }},
  ];

  return (
    <>
      {showIdentify && <IdentifyGapDialog onClose={() => setShowIdentify(false)} />}
      {planTarget && <PlanRemediationDialog code={planTarget} onClose={() => setPlanTarget(null)} />}
      {verifyTarget && <VerifyGapDialog code={verifyTarget} onClose={() => setVerifyTarget(null)} />}

      <PageHeader title="Compliance Gap Analysis" subtitle="Identify, track, and remediate compliance gaps"
        actions={<button onClick={() => setShowIdentify(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> Identify New Gap</button>}
      />

      <div className="page-container space-y-6">
        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{overdueCount} gap remediation{overdueCount > 1 ? 's are' : ' is'} overdue — {criticalCount} critical</p>
                <p className="text-xs text-red-600 dark:text-red-400/80">Immediate attention required.</p>
              </div>
            </div>
            <button onClick={() => setStatusFilter('')} className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-100">View Overdue</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Gaps" value={totalGaps} format="number" icon={Target} loading={isLoading} />
          <StatCard label="Critical" value={criticalCount} format="number" icon={ShieldAlert} loading={isLoading} />
          <StatCard label="In Progress" value={inProgressCount} format="number" icon={Clock} loading={isLoading} />
          <StatCard label="Remediated" value={remediatedCount} format="number" icon={CheckCircle2} loading={isLoading} />
          <StatCard label="Overdue" value={overdueCount} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Accepted Risk" value={acceptedRiskCount} format="number" icon={ShieldOff} loading={isLoading} />
        </div>

        {/* Pipeline */}
        <LifecyclePipeline gaps={gaps} onFilter={setStatusFilter} />

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          { id: 'register', label: 'Gap Register', badge: totalGaps || undefined, content: (
            <div className="space-y-4 p-4">
              {statusFilter && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Filtered:</span>
                  <StatusBadge status={statusFilter} dot />
                  <button onClick={() => setStatusFilter('')} className="text-xs text-primary hover:underline">Clear</button>
                </div>
              )}
              <DataTable
                columns={columns}
                data={filteredGaps}
                isLoading={isLoading}
                enableGlobalFilter
                enableExport
                exportFilename="compliance-gaps"
                emptyMessage="No gaps found"
                pageSize={15}
              />
              <GapAgingChart gaps={gapsForAging} />
            </div>
          )},
          { id: 'overdue', label: 'Overdue', badge: overdueCount || undefined, content: (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold text-red-600">{overdueCount}</p><p className="text-xs text-muted-foreground">Total Overdue</p></div>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                  const c = overdueGaps.filter((g: any) => g.gapSeverity === sev).length;
                  if (c === 0) return null;
                  return <div key={sev} className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold">{c}</p><p className="text-xs text-muted-foreground">{sev}</p></div>;
                })}
              </div>
              <DataTable
                columns={[
                  ...columns.slice(0, -1),
                  { id: 'daysOverdue', header: 'Days Overdue', cell: ({ row }: any) => {
                    const d = row.original.remediationTargetDate;
                    const days = d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;
                    return <span className="font-mono text-sm font-bold text-red-600">{days}d</span>;
                  }},
                ]}
                data={overdueGaps}
                isLoading={isLoading}
                enableGlobalFilter
                emptyMessage="No overdue gaps"
              />
            </div>
          )},
          { id: 'analytics', label: 'Gap Analytics', content: (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="surface-card p-5">
                <h3 className="text-sm font-semibold mb-4">Severity Distribution</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {severityData.map((d) => <Cell key={d.name} fill={(PIE_COLORS as any)[d.name] ?? '#94a3b8'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="surface-card p-5">
                <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="md:col-span-2">
                <GapAgingChart gaps={gapsForAging} />
              </div>
            </div>
          )},
        ]} />
      </div>
    </>
  );
}
