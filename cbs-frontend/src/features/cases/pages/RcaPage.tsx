import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  ShieldCheck,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FormSection } from '@/components/shared/FormSection';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { caseApi } from '../api/caseApi';
import { rootCauseAnalysisApi } from '../api/rootCauseApi';
import type { CaseRootCauseAnalysis, CorrectiveActionPayload } from '../types/rootCause';
import { formatDateTime } from '@/lib/formatters';

const ANALYSIS_METHODS: { value: CaseRootCauseAnalysis['analysisMethod']; label: string }[] = [
  { value: 'FIVE_WHY', label: '5 Why Analysis' },
  { value: 'FISHBONE', label: 'Fishbone (Ishikawa)' },
  { value: 'FAULT_TREE', label: 'Fault Tree Analysis' },
  { value: 'PARETO', label: 'Pareto Analysis' },
  { value: 'OTHER', label: 'Other' },
];

const ROOT_CAUSE_CATEGORIES: { value: CaseRootCauseAnalysis['rootCauseCategory']; label: string }[] = [
  { value: 'PROCESS', label: 'Process' },
  { value: 'SYSTEM', label: 'System / Technology' },
  { value: 'PEOPLE', label: 'People / Training' },
  { value: 'THIRD_PARTY', label: 'Third Party' },
  { value: 'POLICY', label: 'Policy / Regulation' },
  { value: 'ENVIRONMENT', label: 'Environment' },
];

const REPUTATIONAL_IMPACTS: { value: CaseRootCauseAnalysis['reputationalImpact']; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

function CorrectiveActionForm({
  onAdd,
  isPending,
}: {
  onAdd: (data: CorrectiveActionPayload) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<CorrectiveActionPayload>({
    action: '',
    owner: '',
    dueDate: '',
    priority: 'MEDIUM',
  });

  const set = (key: keyof CorrectiveActionPayload, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const submit = () => {
    if (!form.action.trim() || !form.owner.trim() || !form.dueDate) return;
    onAdd(form);
    setForm({ action: '', owner: '', dueDate: '', priority: 'MEDIUM' });
  };

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add Corrective Action</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Action</label>
          <input
            value={form.action}
            onChange={(e) => set('action', e.target.value)}
            placeholder="Describe the corrective action..."
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Owner</label>
          <input value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Responsible party" className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Due Date</label>
          <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>
      <button
        onClick={submit}
        disabled={!form.action.trim() || !form.owner.trim() || !form.dueDate || isPending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" /> Add Action
      </button>
    </div>
  );
}

function CreateRcaForm({
  caseId,
  onCreated,
}: {
  caseId: number;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<Partial<CaseRootCauseAnalysis>>({
    caseId,
    analysisMethod: 'FIVE_WHY',
    rootCauseCategory: 'PROCESS',
    reputationalImpact: 'LOW',
    regulatoryImplication: false,
    customersAffected: 1,
    financialImpact: 0,
    problemStatement: '',
    rootCauseSubCategory: '',
    rootCauseDescription: '',
    lessonsLearned: '',
    analystName: '',
  });

  const set = (key: keyof CaseRootCauseAnalysis, value: unknown) =>
    setForm((p) => ({ ...p, [key]: value }));

  const createMutation = useMutation({
    mutationFn: () => rootCauseAnalysisApi.create(form),
    onSuccess: () => { toast.success('RCA created'); onCreated(); },
    onError: () => toast.error('Failed to create RCA'),
  });

  return (
    <div className="space-y-6">
      <FormSection title="Analysis Setup">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Analysis Method</label>
            <select
              value={form.analysisMethod}
              onChange={(e) => set('analysisMethod', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              {ANALYSIS_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Analyst Name</label>
            <input
              value={form.analystName ?? ''}
              onChange={(e) => set('analystName', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="Your name"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Problem Statement</label>
          <textarea
            value={form.problemStatement ?? ''}
            onChange={(e) => set('problemStatement', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Clearly describe the problem..."
          />
        </div>
      </FormSection>

      <FormSection title="Root Cause">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={form.rootCauseCategory}
              onChange={(e) => set('rootCauseCategory', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              {ROOT_CAUSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Sub-Category</label>
            <input
              value={form.rootCauseSubCategory ?? ''}
              onChange={(e) => set('rootCauseSubCategory', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              placeholder="e.g. Inadequate validation"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
          <textarea
            value={form.rootCauseDescription ?? ''}
            onChange={(e) => set('rootCauseDescription', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Detailed root cause description..."
          />
        </div>
      </FormSection>

      <FormSection title="Impact Assessment">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Customers Affected</label>
            <input
              type="number"
              min={1}
              value={form.customersAffected ?? 1}
              onChange={(e) => set('customersAffected', Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Financial Impact (₦)</label>
            <input
              type="number"
              min={0}
              value={form.financialImpact ?? 0}
              onChange={(e) => set('financialImpact', Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reputational Impact</label>
            <select
              value={form.reputationalImpact}
              onChange={(e) => set('reputationalImpact', e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              {REPUTATIONAL_IMPACTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="regImpl"
              checked={form.regulatoryImplication ?? false}
              onChange={(e) => set('regulatoryImplication', e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="regImpl" className="text-sm">Regulatory Implication</label>
          </div>
        </div>
      </FormSection>

      <FormSection title="Lessons & Preventive Actions">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Lessons Learned</label>
          <textarea
            value={form.lessonsLearned ?? ''}
            onChange={(e) => set('lessonsLearned', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Key learnings from this incident..."
          />
        </div>
      </FormSection>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => createMutation.mutate()}
          disabled={
            !form.problemStatement?.trim() ||
            !form.rootCauseDescription?.trim() ||
            !form.analystName?.trim() ||
            createMutation.isPending
          }
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating RCA…' : 'Create RCA'}
        </button>
      </div>
    </div>
  );
}

export function RcaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ['cases', 'detail', id],
    queryFn: () => caseApi.getById(id!),
    enabled: !!id,
  });

  const { data: rca, isLoading: rcaLoading, refetch: refetchRca } = useQuery({
    queryKey: ['cases', 'rca', caseData?.id],
    queryFn: () => rootCauseAnalysisApi.getByCaseId(caseData!.id),
    enabled: !!caseData?.id,
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: () => rootCauseAnalysisApi.complete(rca!.rcaCode),
    onSuccess: () => { toast.success('RCA marked complete'); queryClient.invalidateQueries({ queryKey: ['cases', 'rca'] }); },
    onError: () => toast.error('Failed to complete RCA'),
  });

  const validateMutation = useMutation({
    mutationFn: () => rootCauseAnalysisApi.validate(rca!.rcaCode),
    onSuccess: () => { toast.success('RCA validated'); queryClient.invalidateQueries({ queryKey: ['cases', 'rca'] }); },
    onError: () => toast.error('Failed to validate RCA'),
  });

  const addActionMutation = useMutation({
    mutationFn: (data: CorrectiveActionPayload) => rootCauseAnalysisApi.addCorrectiveAction(rca!.rcaCode, data),
    onSuccess: () => { toast.success('Corrective action added'); queryClient.invalidateQueries({ queryKey: ['cases', 'rca'] }); },
    onError: () => toast.error('Failed to add corrective action'),
  });

  const isLoading = caseLoading || rcaLoading;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Root Cause Analysis" />
        <div className="page-container"><div className="animate-pulse h-96 bg-muted rounded-lg" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`RCA — Case ${caseData?.caseNumber ?? id}`}
        subtitle={caseData?.subject}
        actions={
          <button
            onClick={() => navigate(`/cases/${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Case
          </button>
        }
      />
      <div className="page-container space-y-6">
        {!rca && !showCreate && (
          <div className="rounded-xl border bg-card p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No Root Cause Analysis</p>
              <p className="text-sm text-muted-foreground mt-1">
                No RCA has been initiated for this case yet.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Start RCA
            </button>
          </div>
        )}

        {!rca && showCreate && (
          <CreateRcaForm
            caseId={caseData!.id}
            onCreated={() => { setShowCreate(false); refetchRca(); }}
          />
        )}

        {rca && (
          <>
            {/* RCA Summary */}
            <div className="rounded-xl border bg-card p-5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">RCA Code</p>
                  <p className="font-mono font-semibold">{rca.rcaCode}</p>
                </div>
                <StatusBadge status={rca.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Analysis Method</p>
                  <p className="text-sm mt-0.5">{rca.analysisMethod.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Analyst</p>
                  <p className="text-sm mt-0.5">{rca.analystName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Analysis Date</p>
                  <p className="text-sm mt-0.5">{formatDateTime(rca.analysisDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Root Cause Category</p>
                  <p className="text-sm mt-0.5">{rca.rootCauseCategory.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Sub-Category</p>
                  <p className="text-sm mt-0.5">{rca.rootCauseSubCategory || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Reputational Impact</p>
                  <p className="text-sm mt-0.5">{rca.reputationalImpact}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Problem Statement</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{rca.problemStatement}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Root Cause Description</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{rca.rootCauseDescription}</p>
              </div>
              {rca.lessonsLearned && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Lessons Learned</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{rca.lessonsLearned}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Customers Affected</p>
                  <p className="text-lg font-semibold font-mono mt-0.5">{rca.customersAffected.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Financial Impact</p>
                  <p className="text-lg font-semibold font-mono mt-0.5">₦{rca.financialImpact.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Regulatory</p>
                  <p className="mt-0.5">
                    {rca.regulatoryImplication ? (
                      <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                        <AlertCircle className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Workflow actions */}
              {rca.status !== 'VALIDATED' && (
                <div className="flex gap-2 pt-2 border-t">
                  {rca.status !== 'COMPLETED' && rca.status !== 'VALIDATED' && (
                    <button
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {completeMutation.isPending ? 'Completing…' : 'Mark Complete'}
                    </button>
                  )}
                  {rca.status === 'COMPLETED' && (
                    <button
                      onClick={() => validateMutation.mutate()}
                      disabled={validateMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {validateMutation.isPending ? 'Validating…' : 'Validate RCA'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Corrective Actions */}
            <FormSection title="Corrective Actions">
              {Object.keys(rca.correctiveActions ?? {}).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No corrective actions added yet.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {Object.entries(rca.correctiveActions).map(([key, action]) => (
                    <div key={key} className="flex items-start gap-3 rounded-lg border p-3">
                      <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm">{JSON.stringify(action)}</div>
                    </div>
                  ))}
                </div>
              )}
              {rca.status !== 'VALIDATED' && (
                <CorrectiveActionForm
                  onAdd={(data) => addActionMutation.mutate(data)}
                  isPending={addActionMutation.isPending}
                />
              )}
            </FormSection>

            {/* Preventive Actions */}
            {Object.keys(rca.preventiveActions ?? {}).length > 0 && (
              <FormSection title="Preventive Actions">
                <div className="space-y-2">
                  {Object.entries(rca.preventiveActions).map(([key, action]) => (
                    <div key={key} className="flex items-start gap-3 rounded-lg border p-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm">{JSON.stringify(action)}</div>
                    </div>
                  ))}
                </div>
              </FormSection>
            )}
          </>
        )}

        <div className="flex items-center justify-between pt-2">
          <Link
            to="/cases/rca-dashboard"
            className="text-sm text-primary hover:underline"
          >
            View RCA Dashboard →
          </Link>
        </div>
      </div>
    </>
  );
}
