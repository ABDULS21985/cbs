import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, ChevronDown, ChevronRight, Building2, DollarSign, AlertTriangle, Layers } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  useProjectFacilities,
  useFacilityMilestones,
  useCreateProjectFacility,
  useCompleteMilestone,
} from '../hooks/useAdvisory';
import type {
  ProjectFacility,
  ProjectFinanceStatus,
  ProjectMilestone,
} from '../api/advisoryApi';

// ─── Expanded milestone rows ──────────────────────────────────────────────────

function MilestonePanel({ facilityCode }: { facilityCode: string }) {
  const { data: milestones = [], isLoading } = useFacilityMilestones(facilityCode);
  const complete = useCompleteMilestone();
  const [completing, setCompleting] = useState<string | null>(null);
  const [form, setForm] = useState({ completionDate: '', notes: '' });

  if (isLoading) {
    return (
      <div className="p-4 animate-pulse space-y-2">
        {[1, 2].map((i) => <div key={i} className="h-8 bg-muted rounded" />)}
      </div>
    );
  }

  if (milestones.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No milestones defined.</p>;
  }

  return (
    <div className="p-4 bg-muted/30 border-t">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Milestones</h4>
      <div className="space-y-2">
        {milestones.map((m) => (
          <div key={m.code} className="flex items-center gap-4 p-3 rounded-lg bg-background border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.completionCriteria}</p>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              Planned: {formatDate(m.plannedDate)}
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {m.completionDate ? formatDate(m.completionDate) : 'Pending'}
            </div>
            <StatusBadge status={m.status} dot />
            {m.status === 'PENDING' && (
              <button
                onClick={() => setCompleting(m.code)}
                className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
              >
                Complete
              </button>
            )}
          </div>
        ))}
      </div>

      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-sm">Complete Milestone</h3>
            <label className="block text-xs font-medium">
              Completion Date
              <input
                type="date"
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.completionDate}
                onChange={(e) => setForm((f) => ({ ...f, completionDate: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Notes
              <textarea
                rows={3}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background resize-none"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => { setCompleting(null); setForm({ completionDate: '', notes: '' }); }}
                className="px-3 py-1.5 rounded border text-sm"
              >
                Cancel
              </button>
              <button
                disabled={complete.isPending}
                onClick={() => {
                  complete.mutate(
                    { milestoneCode: completing, payload: { completionDate: form.completionDate, notes: form.notes } },
                    { onSuccess: () => { setCompleting(null); setForm({ completionDate: '', notes: '' }); } },
                  );
                }}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {complete.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Project Dialog ───────────────────────────────────────────────────────

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateProjectFacility();
  const [form, setForm] = useState({
    projectName: '',
    sponsor: '',
    sector: '',
    totalCost: '',
    currency: 'USD',
    debtAmount: '',
    equityAmount: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        projectName: form.projectName,
        sponsor: form.sponsor,
        sector: form.sector,
        totalCost: Number(form.totalCost),
        currency: form.currency,
        debtAmount: Number(form.debtAmount),
        equityAmount: Number(form.equityAmount),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-xl border shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="font-semibold">New Project Finance Facility</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium">
            Project Name
            <input
              required
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
              value={form.projectName}
              onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">
              Sponsor
              <input
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.sponsor}
                onChange={(e) => setForm((f) => ({ ...f, sponsor: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Sector
              <input
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                placeholder="e.g. ENERGY"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">
              Total Cost
              <input
                type="number"
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.totalCost}
                onChange={(e) => setForm((f) => ({ ...f, totalCost: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Currency
              <input
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">
              Debt Amount
              <input
                type="number"
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.debtAmount}
                onChange={(e) => setForm((f) => ({ ...f, debtAmount: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium">
              Equity Amount
              <input
                type="number"
                required
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                value={form.equityAmount}
                onChange={(e) => setForm((f) => ({ ...f, equityAmount: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded border text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="px-4 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUSES: ProjectFinanceStatus[] = ['PIPELINE', 'ACTIVE', 'MONITORING', 'COMPLETED', 'DISTRESSED'];

export function ProjectFinancePage() {
  const [filterStatus, setFilterStatus] = useState<ProjectFinanceStatus | undefined>(undefined);
  const [filterSector, setFilterSector] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: facilities = [], isLoading } = useProjectFacilities(filterStatus);

  const sectors = [...new Set(facilities.map((f) => f.sector))];
  const filtered = facilities.filter((f) => !filterSector || f.sector === filterSector);

  const totalDebt = facilities.reduce((s, f) => s + (f.debtAmount || 0), 0);
  const totalEquity = facilities.reduce((s, f) => s + (f.equityAmount || 0), 0);
  const atRisk = facilities.filter((f) => f.status === 'DISTRESSED').length;

  const columns: ColumnDef<ProjectFacility, any>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {expanded === row.original.code
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </span>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-primary">{row.original.code}</span>
      ),
    },
    { accessorKey: 'projectName', header: 'Project Name' },
    {
      accessorKey: 'sector',
      header: 'Sector',
      cell: ({ row }) => <StatusBadge status={row.original.sector} />,
    },
    { accessorKey: 'sponsor', header: 'Sponsor' },
    {
      accessorKey: 'totalCost',
      header: 'Total Cost',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.totalCost, row.original.currency)}</span>
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'milestonesCompleted',
      header: 'Progress',
      cell: ({ row }) => {
        const { milestonesCompleted, milestonesTotal } = row.original;
        const pct = milestonesTotal > 0 ? Math.round((milestonesCompleted / milestonesTotal) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="bg-muted rounded-full h-2 w-20">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{milestonesCompleted}/{milestonesTotal}</span>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Project Finance"
        subtitle="Infrastructure & project finance facilities with milestone tracking"
      />
      <div className="page-container space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Projects" value={facilities.filter((f) => f.status === 'ACTIVE').length} format="number" icon={Building2} loading={isLoading} />
          <StatCard label="Total Debt" value={totalDebt} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Total Equity" value={totalEquity} format="money" compact icon={Layers} loading={isLoading} />
          <StatCard label="Projects at Risk" value={atRisk} format="number" icon={AlertTriangle} loading={isLoading} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border px-3 py-1.5 text-sm bg-background"
            value={filterStatus ?? ''}
            onChange={(e) => setFilterStatus((e.target.value as ProjectFinanceStatus) || undefined)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="rounded-lg border px-3 py-1.5 text-sm bg-background"
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="ml-auto">
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="project-facilities"
          emptyMessage="No project facilities found"
          onRowClick={(row) =>
            setExpanded((v) => (v === row.code ? null : row.code))
          }
        />

        {/* Inline expanded milestone panel */}
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
