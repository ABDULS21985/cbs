import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  UserPlus, Target, FileText, Plus, X,
} from 'lucide-react';
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
          <p className="text-sm font-semibold mt-1">{typeof value === 'number' ? `${value}%` : String(value ?? '—')}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Goals List ──────────────────────────────────────────────────────────────

function GoalsList({ goals, planCode }: { goals: Record<string, unknown>[] | null; planCode: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [goalForm, setGoalForm] = useState({ goalName: '', targetAmount: 0, targetDate: '', priority: 'MEDIUM' });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    setSubmitting(true);
    wealthApi.addGoal(planCode, goalForm).then(() => {
      toast.success('Goal added');
      qc.invalidateQueries({ queryKey: ['wealth-plan', planCode] });
      setShowAdd(false);
      setGoalForm({ goalName: '', targetAmount: 0, targetDate: '', priority: 'MEDIUM' });
    }).catch(() => toast.error('Failed to add goal')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Financial Goals</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </button>
      </div>
      {!goals || goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No financial goals defined</p>
      ) : (
        goals.map((goal, idx) => (
          <div key={idx} className="card p-4 flex items-start gap-3">
            <Target className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <div className="text-sm space-y-1">
              {Object.entries(goal).map(([k, v]) => (
                <p key={k}><span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span> <span className="font-medium">{String(v ?? '—')}</span></p>
              ))}
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Add Financial Goal</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Goal Name</label><input className={fc} value={goalForm.goalName} onChange={(e) => setGoalForm((f) => ({ ...f, goalName: e.target.value }))} required /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Target Amount</label><input type="number" step="0.01" className={fc} value={goalForm.targetAmount || ''} onChange={(e) => setGoalForm((f) => ({ ...f, targetAmount: Number(e.target.value) }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Target Date</label><input type="date" className={fc} value={goalForm.targetDate} onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select className={fc} value={goalForm.priority} onChange={(e) => setGoalForm((f) => ({ ...f, priority: e.target.value }))}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleAdd} disabled={submitting || !goalForm.goalName} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Goal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents Tab ───────────────────────────────────────────────────────────

function DocumentsTab({ planCode }: { planCode: string }) {
  const qc = useQueryClient();
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['wealth-plan', planCode, 'documents'],
    queryFn: () => wealthApi.getDocuments(planCode),
    enabled: !!planCode,
  });
  const [showAdd, setShowAdd] = useState(false);
  const [docForm, setDocForm] = useState({ documentType: 'IPS', fileName: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = () => {
    setSubmitting(true);
    wealthApi.addDocument(planCode, { ...docForm, uploadedAt: new Date().toISOString() }).then(() => {
      toast.success('Document added');
      qc.invalidateQueries({ queryKey: ['wealth-plan', planCode, 'documents'] });
      setShowAdd(false);
    }).catch(() => toast.error('Failed to add document')).finally(() => setSubmitting(false));
  };

  const fc = 'w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Add Document
        </button>
      </div>
      {docs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No documents uploaded</p></div>
      ) : (
        <div className="space-y-2">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{String(d.fileName ?? `Document ${i + 1}`)}</p>
                <p className="text-xs text-muted-foreground">{String(d.documentType ?? '')} • {d.uploadedAt ? formatDate(String(d.uploadedAt)) : '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Add Document</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Type</label>
                <select className={fc} value={docForm.documentType} onChange={(e) => setDocForm((f) => ({ ...f, documentType: e.target.value }))}>
                  {['IPS', 'KYC', 'RISK_PROFILE', 'TAX_RETURN', 'ESTATE_PLAN', 'INSURANCE', 'OTHER'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">File Name</label><input className={fc} value={docForm.fileName} onChange={(e) => setDocForm((f) => ({ ...f, fileName: e.target.value }))} required /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><textarea className={fc} rows={2} value={docForm.description} onChange={(e) => setDocForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={handleAdd} disabled={submitting || !docForm.fileName} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Performance Tab ─────────────────────────────────────────────────────────

function PerformanceTab({ planCode, plan }: { planCode: string; plan: WealthManagementPlan }) {
  const { data: perf, isLoading } = useQuery({
    queryKey: ['wealth-plan', planCode, 'performance'],
    queryFn: () => wealthApi.getPerformance(planCode),
    enabled: !!planCode,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-muted-foreground">Net Worth</p><p className="text-lg font-semibold font-mono mt-1">{formatMoney(plan.totalNetWorth ?? 0)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted-foreground">Investable Assets</p><p className="text-lg font-semibold font-mono mt-1">{formatMoney(plan.totalInvestableAssets ?? 0)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted-foreground">Annual Income</p><p className="text-lg font-semibold font-mono mt-1">{formatMoney(plan.annualIncome ?? 0)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted-foreground">Tax Bracket</p><p className="text-lg font-semibold font-mono mt-1">{plan.taxBracketPct != null ? `${plan.taxBracketPct}%` : '—'}</p></div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : perf ? (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(perf).map(([k, v]) => (
              <div key={k}>
                <span className="text-xs text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                <p className="font-medium font-mono">{typeof v === 'number' ? v.toLocaleString() : String(v ?? '—')}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function WealthClientDetailPage() {
  const { code } = useParams<{ code: string }>();
  const queryClient = useQueryClient();
  const [showAssignAdvisor, setShowAssignAdvisor] = useState(false);
  const [advisorIdInput, setAdvisorIdInput] = useState('');

  useEffect(() => { document.title = code ? `Wealth Plan - ${code}` : 'Wealth Plan Detail'; }, [code]);

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ['wealth-plan', code],
    queryFn: () => wealthApi.getByCode(code!),
    enabled: !!code,
  });

  const activateMut = useMutation({
    mutationFn: () => wealthApi.activate(code!),
    onSuccess: () => { toast.success('Plan activated'); queryClient.invalidateQueries({ queryKey: ['wealth-plan', code] }); },
    onError: () => toast.error('Failed to activate'),
  });

  const closeMut = useMutation({
    mutationFn: () => wealthApi.close(code!),
    onSuccess: () => { toast.success('Plan closed'); queryClient.invalidateQueries({ queryKey: ['wealth-plan', code] }); },
    onError: () => toast.error('Failed to close'),
  });

  const rebalanceMut = useMutation({
    mutationFn: () => wealthApi.rebalance(code!),
    onSuccess: () => { toast.success('Rebalance initiated'); queryClient.invalidateQueries({ queryKey: ['wealth-plan', code] }); },
    onError: () => toast.error('Failed to rebalance'),
  });

  const assignAdvisorMut = useMutation({
    mutationFn: (advisorId: string) => wealthApi.assignAdvisor(code!, { advisorId }),
    onSuccess: () => { toast.success('Advisor assigned'); queryClient.invalidateQueries({ queryKey: ['wealth-plan', code] }); setShowAssignAdvisor(false); },
    onError: () => toast.error('Failed to assign advisor'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (isError || !plan) {
    return <div className="flex flex-col items-center justify-center h-64 gap-2"><AlertTriangle className="w-8 h-8 text-amber-500" /><p className="text-muted-foreground">Failed to load wealth plan</p></div>;
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
      id: 'profile', label: 'Profile',
      content: (
        <div className="p-6 space-y-8">
          <GoalsList goals={plan.financialGoals} planCode={code!} />
          <section>
            <h3 className="font-semibold mb-3">Recommended Allocation</h3>
            <AllocationDisplay allocation={plan.recommendedAllocation} />
          </section>
          <section>
            <h3 className="font-semibold mb-3">Insurance Needs</h3>
            {plan.insuranceNeeds && Object.keys(plan.insuranceNeeds).length > 0 ? (
              <div className="card p-4 text-sm space-y-1">
                {Object.entries(plan.insuranceNeeds).map(([k, v]) => (
                  <p key={k}><span className="text-muted-foreground">{k.replace(/_/g, ' ')}:</span> <span className="font-medium">{String(v ?? '—')}</span></p>
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
      id: 'performance', label: 'Performance',
      content: <PerformanceTab planCode={code!} plan={plan} />,
    },
    {
      id: 'documents', label: 'Documents',
      content: <DocumentsTab planCode={code!} />,
    },
    {
      id: 'recommendations', label: 'Recommendations',
      content: (
        <div className="p-6 space-y-6">
          <section><h3 className="font-semibold mb-3">Estate Plan Summary</h3><div className="card p-4"><p className="text-sm whitespace-pre-wrap">{plan.estatePlanSummary || 'No estate plan summary available.'}</p></div></section>
          <section><h3 className="font-semibold mb-3">Tax Strategy</h3><div className="card p-4"><p className="text-sm whitespace-pre-wrap">{plan.taxStrategy || 'No tax strategy defined.'}</p></div></section>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={plan.planCode}
        subtitle={`${plan.planType} wealth management plan`}
        backTo="/investments/advisory"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={plan.status} size="md" />
            {plan.status === 'DRAFT' && (
              <button onClick={() => activateMut.mutate()} disabled={activateMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                {activateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Activate
              </button>
            )}
            {plan.status === 'ACTIVE' && (
              <>
                <button onClick={() => rebalanceMut.mutate()} disabled={rebalanceMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted disabled:opacity-50">
                  {rebalanceMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rebalance
                </button>
                <button onClick={() => setShowAssignAdvisor(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted">
                  <UserPlus className="w-3.5 h-3.5" /> Assign Advisor
                </button>
                <button onClick={() => { if (confirm('Close this wealth plan?')) closeMut.mutate(); }} disabled={closeMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/10 disabled:opacity-50">
                  {closeMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Close
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="card p-6"><InfoGrid items={infoItems} columns={4} /></div>
        <div className="card overflow-hidden"><TabsPage syncWithUrl tabs={tabs} /></div>
      </div>

      {/* Assign Advisor Dialog */}
      {showAssignAdvisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setShowAssignAdvisor(false)} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            <h3 className="text-lg font-semibold mb-4">Assign Advisor</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Advisor ID</label>
                <input value={advisorIdInput} onChange={(e) => setAdvisorIdInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter advisor ID" required />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAssignAdvisor(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => assignAdvisorMut.mutate(advisorIdInput)} disabled={assignAdvisorMut.isPending || !advisorIdInput}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                  {assignAdvisorMut.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
