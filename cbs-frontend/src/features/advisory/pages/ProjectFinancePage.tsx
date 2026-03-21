import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, ChevronDown, ChevronRight, Building2, DollarSign, AlertTriangle, Layers, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  useAllProjectFacilities,
  useFacilityMilestones,
  useCreateProjectFacility,
  useCompleteMilestone,
  useAddMilestone,
} from '../hooks/useAdvisory';
import type {
  ProjectFacility,
  ProjectType,
  MilestoneType,
  CreateProjectFacilityPayload,
  AddMilestonePayload,
} from '../api/advisoryApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'POWER_GENERATION', label: 'Power Generation' },
  { value: 'RENEWABLE_ENERGY', label: 'Renewable Energy' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'MINING', label: 'Mining' },
  { value: 'TELECOM', label: 'Telecom' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'WATER', label: 'Water' },
  { value: 'OIL_GAS', label: 'Oil & Gas' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
];

const MILESTONE_TYPES: { value: MilestoneType; label: string }[] = [
  { value: 'CONDITION_PRECEDENT', label: 'Condition Precedent' },
  { value: 'DISBURSEMENT_CONDITION', label: 'Disbursement Condition' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'COMPLETION_TEST', label: 'Completion Test' },
  { value: 'COVENANT_TEST', label: 'Covenant Test' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'REGULATORY', label: 'Regulatory' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
];

const STATUS_LABELS: Record<string, string> = {
  APPRAISAL: 'Appraisal', APPROVED: 'Approved', SIGNED: 'Signed',
  DISBURSING: 'Disbursing', CONSTRUCTION: 'Construction', OPERATING: 'Operating',
  AMORTIZING: 'Amortizing', MATURED: 'Matured', RESTRUCTURED: 'Restructured', DEFAULTED: 'Defaulted',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'JPY', 'CHF'];

const COUNTRY_RISK = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
const ENV_CATEGORIES = ['A', 'B', 'C', 'FI'];

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

// ─── Expanded milestone rows ──────────────────────────────────────────────────

function MilestonePanel({ facilityCode }: { facilityCode: string }) {
  const { data: milestones = [], isLoading } = useFacilityMilestones(facilityCode);
  const complete = useCompleteMilestone();
  const addMilestone = useAddMilestone();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Partial<AddMilestonePayload>>({});

  if (isLoading) {
    return (
      <div className="p-4 animate-pulse space-y-2">
        {[1, 2].map((i) => <div key={i} className="h-8 bg-muted rounded" />)}
      </div>
    );
  }

  function handleComplete(milestoneCode: string) {
    complete.mutate(milestoneCode, {
      onSuccess: () => toast.success('Milestone completed'),
      onError: () => toast.error('Failed to complete milestone'),
    });
  }

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.milestoneName || !addForm.milestoneType || !addForm.dueDate) {
      toast.error('Fill in all required fields');
      return;
    }
    addMilestone.mutate(
      { code: facilityCode, payload: addForm as AddMilestonePayload },
      {
        onSuccess: () => { toast.success('Milestone added'); setShowAdd(false); setAddForm({}); },
        onError: () => toast.error('Failed to add milestone'),
      },
    );
  }

  return (
    <div className="p-4 bg-muted/30 border-t">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</h4>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Add Milestone
        </button>
      </div>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones defined.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.milestoneCode} className="flex items-center gap-4 p-3 rounded-lg bg-background border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.milestoneName}</p>
                <p className="text-xs text-muted-foreground">{m.milestoneType} {m.description && `· ${m.description}`}</p>
                {m.disbursementLinked && m.disbursementAmount && (
                  <p className="text-xs text-blue-600">Disbursement linked: {formatMoney(m.disbursementAmount)}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                Due: {formatDate(m.dueDate)}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {m.completedDate ? formatDate(m.completedDate) : '-'}
              </div>
              <StatusBadge status={m.status} dot />
              {m.status === 'PENDING' && (
                <button
                  onClick={() => handleComplete(m.milestoneCode)}
                  disabled={complete.isPending}
                  className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Complete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <DialogBackdrop>
          <DialogTitle>Add Milestone</DialogTitle>
          <form onSubmit={handleAddMilestone} className="space-y-4">
            <Field label="Milestone Name *">
              <input className={inputCls} value={addForm.milestoneName || ''} onChange={e => setAddForm(f => ({ ...f, milestoneName: e.target.value }))} placeholder="e.g. Financial Close" />
            </Field>
            <Field label="Milestone Type *">
              <select className={selectCls} value={addForm.milestoneType || ''} onChange={e => setAddForm(f => ({ ...f, milestoneType: e.target.value as MilestoneType }))}>
                <option value="">Select type...</option>
                {MILESTONE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Due Date *">
              <input type="date" className={inputCls} value={addForm.dueDate || ''} onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))} required />
            </Field>
            <Field label="Description">
              <textarea className={`${inputCls} resize-none`} rows={2} value={addForm.description || ''} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="disbLink" checked={addForm.disbursementLinked || false} onChange={e => setAddForm(f => ({ ...f, disbursementLinked: e.target.checked }))} />
              <label htmlFor="disbLink" className="text-sm">Disbursement Linked</label>
            </div>
            {addForm.disbursementLinked && (
              <Field label="Disbursement Amount">
                <input type="number" min="0" step="0.01" className={inputCls} value={addForm.disbursementAmount ?? ''} onChange={e => setAddForm(f => ({ ...f, disbursementAmount: e.target.value ? Number(e.target.value) : undefined }))} />
              </Field>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowAdd(false); setAddForm({}); }} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
              <button type="submit" disabled={addMilestone.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {addMilestone.isPending ? 'Adding...' : 'Add Milestone'}
              </button>
            </div>
          </form>
        </DialogBackdrop>
      )}
    </div>
  );
}

// ─── New Project Dialog ───────────────────────────────────────────────────────

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateProjectFacility();
  const [form, setForm] = useState<Partial<CreateProjectFacilityPayload>>({
    currency: 'USD',
  });

  const set = (k: keyof CreateProjectFacilityPayload, v: unknown) =>
    setForm(prev => ({ ...prev, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectName || !form.projectType || !form.borrowerName || !form.country || !form.tenorMonths || form.marginBps == null) {
      toast.error('Fill in all required fields');
      return;
    }
    create.mutate(form as CreateProjectFacilityPayload, {
      onSuccess: (f) => {
        toast.success(`Facility ${f.facilityCode} created`);
        onClose();
      },
      onError: () => toast.error('Failed to create facility'),
    });
  }

  return (
    <DialogBackdrop>
      <DialogTitle>New Project Finance Facility</DialogTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Project Name *">
          <input className={inputCls} value={form.projectName || ''} onChange={e => set('projectName', e.target.value)} placeholder="Lagos Rail Mass Transit" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project Type *">
            <select className={selectCls} value={form.projectType || ''} onChange={e => set('projectType', e.target.value as ProjectType)}>
              <option value="">Select type...</option>
              {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Borrower Name *">
            <input className={inputCls} value={form.borrowerName || ''} onChange={e => set('borrowerName', e.target.value)} placeholder="SPV Holdings Ltd" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Country (ISO) *">
            <input className={inputCls} maxLength={3} value={form.country || ''} onChange={e => set('country', e.target.value.toUpperCase())} placeholder="NGA" />
          </Field>
          <Field label="Currency">
            <select className={selectCls} value={form.currency || 'USD'} onChange={e => set('currency', e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Tenor (months) *">
            <input type="number" min="1" className={inputCls} value={form.tenorMonths ?? ''} onChange={e => set('tenorMonths', e.target.value ? Number(e.target.value) : undefined)} placeholder="60" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Total Project Cost *">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.totalProjectCost ?? ''} onChange={e => set('totalProjectCost', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Debt Amount *">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.debtAmount ?? ''} onChange={e => set('debtAmount', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Equity Amount">
            <input type="number" min="0" step="0.01" className={inputCls} value={form.equityAmount ?? ''} onChange={e => set('equityAmount', e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Margin (bps) *">
            <input type="number" min="0" className={inputCls} value={form.marginBps ?? ''} onChange={e => set('marginBps', e.target.value ? Number(e.target.value) : undefined)} placeholder="250" />
          </Field>
          <Field label="Country Risk">
            <select className={selectCls} value={form.countryRisk || ''} onChange={e => set('countryRisk', e.target.value)}>
              <option value="">Select...</option>
              {COUNTRY_RISK.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Env. Category">
            <select className={selectCls} value={form.environmentalCategory || ''} onChange={e => set('environmentalCategory', e.target.value)}>
              <option value="">Select...</option>
              {ENV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">Cancel</button>
          <button type="submit" disabled={create.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create Facility'}
          </button>
        </div>
      </form>
    </DialogBackdrop>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectFinancePage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: facilities = [], isLoading } = useAllProjectFacilities();

  const filtered = useMemo(() => {
    let result = facilities;
    if (filterStatus) result = result.filter(f => f.status === filterStatus);
    if (filterType) result = result.filter(f => f.projectType === filterType);
    return result;
  }, [facilities, filterStatus, filterType]);

  const statuses = [...new Set(facilities.map(f => f.status))];
  const types = [...new Set(facilities.map(f => f.projectType))];

  const totalDebt = facilities.reduce((s, f) => s + (f.debtAmount || 0), 0);
  const totalEquity = facilities.reduce((s, f) => s + (f.equityAmount || 0), 0);
  const defaulted = facilities.filter(f => f.status === 'DEFAULTED').length;

  const columns: ColumnDef<ProjectFacility, unknown>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {expanded === row.original.facilityCode
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </span>
      ),
    },
    {
      accessorKey: 'facilityCode',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.facilityCode}</span>
      ),
    },
    { accessorKey: 'projectName', header: 'Project Name' },
    {
      accessorKey: 'projectType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.projectType} />,
    },
    { accessorKey: 'borrowerName', header: 'Borrower' },
    {
      accessorKey: 'totalProjectCost',
      header: 'Total Cost',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.totalProjectCost, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'debtAmount',
      header: 'Debt',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.debtAmount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'disbursedAmount',
      header: 'Disbursed',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-blue-600">{formatMoney(row.original.disbursedAmount || 0, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Project Finance"
        subtitle="Infrastructure & project finance facilities with milestone-based disbursement"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Facilities" value={facilities.length} format="number" icon={Building2} loading={isLoading} />
          <StatCard label="Total Debt" value={totalDebt} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Total Equity" value={totalEquity} format="money" compact icon={Layers} loading={isLoading} />
          <StatCard label="Defaulted" value={defaulted} format="number" icon={AlertTriangle} loading={isLoading} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filterStatus || filterType) && (
            <button onClick={() => { setFilterStatus(''); setFilterType(''); }} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear filters
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="project-facilities"
          emptyMessage="No project facilities found"
          onRowClick={(row) =>
            setExpanded(v => (v === row.facilityCode ? null : row.facilityCode))
          }
        />

        {expanded && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <MilestonePanel facilityCode={expanded} />
          </div>
        )}
      </div>

      {showNew && <NewProjectDialog onClose={() => setShowNew(false)} />}
    </>
  );
}
