import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney } from '@/lib/formatters';
import { LossEventTable } from '../components/oprisk/LossEventTable';
import { LossDistributionChart } from '../components/oprisk/LossDistributionChart';
import { KriCard } from '../components/oprisk/KriCard';
import { opriskApi, type LossEvent, type RcsaAssessment, type Incident } from '../api/opriskApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOSS_EVENT_CATEGORIES = [
  'INTERNAL_FRAUD',
  'EXTERNAL_FRAUD',
  'EMPLOYMENT_PRACTICES',
  'CLIENTS_PRODUCTS',
  'PHYSICAL_ASSETS',
  'BUSINESS_DISRUPTION',
  'EXECUTION_DELIVERY',
] as const;

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

// ─── Report Loss Event Modal ────────────────────────────────────────────────

interface LossEventForm {
  category: string;
  eventType: string;
  description: string;
  grossLoss: number;
  recoveryAmount: number;
  currencyCode: string;
  businessLine: string;
  department: string;
  eventDate: string;
  discoveryDate: string;
}

const INITIAL_LOSS_FORM: LossEventForm = {
  category: 'INTERNAL_FRAUD',
  eventType: '',
  description: '',
  grossLoss: 0,
  recoveryAmount: 0,
  currencyCode: 'NGN',
  businessLine: '',
  department: '',
  eventDate: '',
  discoveryDate: '',
};

function ReportLossEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LossEventForm>({ ...INITIAL_LOSS_FORM });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LossEvent>) => opriskApi.createLossEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oprisk'] });
      toast.success('Loss event reported successfully');
      setForm({ ...INITIAL_LOSS_FORM });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to report loss event');
    },
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      category: form.category,
      subCategory: form.eventType,
      description: form.description,
      grossLoss: form.grossLoss,
      recovery: form.recoveryAmount,
      currency: form.currencyCode,
      businessUnit: form.businessLine,
      eventDate: form.eventDate,
    } as Partial<LossEvent>);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Report Loss Event</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {LOSS_EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Event Type</label>
              <input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                placeholder="e.g. Unauthorized access" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the loss event..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Gross Loss *</label>
              <input type="number" required step="0.01" min="0" value={form.grossLoss || ''}
                onChange={(e) => setForm({ ...form, grossLoss: parseFloat(e.target.value) || 0 })}
                placeholder="0.00" className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recovery</label>
              <input type="number" step="0.01" min="0" value={form.recoveryAmount || ''}
                onChange={(e) => setForm({ ...form, recoveryAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00" className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input required value={form.currencyCode} maxLength={3}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Business Line</label>
              <input value={form.businessLine} onChange={(e) => setForm({ ...form, businessLine: e.target.value })}
                placeholder="e.g. Retail Banking" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Operations" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Event Date *</label>
              <input type="date" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discovery Date *</label>
              <input type="date" required value={form.discoveryDate} onChange={(e) => setForm({ ...form, discoveryDate: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Report Loss Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Report Incident Modal ──────────────────────────────────────────────────

interface IncidentForm {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  impact: string;
  assignedTo: string;
  date: string;
}

const INITIAL_INCIDENT_FORM: IncidentForm = {
  type: '',
  severity: 'MEDIUM',
  impact: '',
  assignedTo: '',
  date: '',
};

function ReportIncidentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<IncidentForm>({ ...INITIAL_INCIDENT_FORM });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Incident>) => opriskApi.createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oprisk'] });
      toast.success('Incident reported successfully');
      setForm({ ...INITIAL_INCIDENT_FORM });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to report incident');
    },
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      type: form.type,
      severity: form.severity,
      impact: form.impact,
      assignedTo: form.assignedTo,
      date: form.date,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Report Incident</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="e.g. System Outage" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentForm['severity'] })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Impact</label>
            <textarea rows={3} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}
              placeholder="Describe the impact..." className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Assigned To</label>
              <input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                placeholder="e.g. John Doe" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Report Incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Table Columns ───────────────────────────────────────────────────────────

const rcsaColumns: ColumnDef<RcsaAssessment, any>[] = [
  { accessorKey: 'department', header: 'Department' },
  { accessorKey: 'period', header: 'Period' },
  { accessorKey: 'risksIdentified', header: 'Risks' },
  { accessorKey: 'controlsAssessed', header: 'Controls' },
  { accessorKey: 'residualRiskRating', header: 'Residual Risk', cell: ({ row }) => <StatusBadge status={row.original.residualRiskRating} /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const incidentColumns: ColumnDef<Incident, any>[] = [
  { accessorKey: 'incidentNumber', header: '#', cell: ({ row }) => <span className="font-mono text-xs">{row.original.incidentNumber}</span> },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => <StatusBadge status={row.original.severity} /> },
  { accessorKey: 'impact', header: 'Impact' },
  { accessorKey: 'assignedTo', header: 'Assigned' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

// ─── Page Component ──────────────────────────────────────────────────────────

export function OperationalRiskPage() {
  const [tab, setTab] = useState<'losses' | 'kri' | 'rcsa' | 'incidents'>('losses');
  const [showLossModal, setShowLossModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['oprisk', 'stats'], queryFn: () => opriskApi.getStats() });
  const { data: lossEvents = [], isLoading } = useQuery({ queryKey: ['oprisk', 'losses'], queryFn: () => opriskApi.getLossEvents() });
  const { data: lossByCat = [] } = useQuery({ queryKey: ['oprisk', 'loss-by-cat'], queryFn: () => opriskApi.getLossByCategory() });
  const { data: kris = [] } = useQuery({ queryKey: ['oprisk', 'kris'], queryFn: () => opriskApi.getKris() });
  const { data: rcsaList = [] } = useQuery({ queryKey: ['oprisk', 'rcsa'], queryFn: () => opriskApi.getRcsaList() });
  const { data: incidents = [] } = useQuery({ queryKey: ['oprisk', 'incidents'], queryFn: () => opriskApi.getIncidents() });

  const statCards = stats ? [
    { label: 'Loss Events MTD', value: String(stats.lossEventsMtd) },
    { label: 'Total Loss', value: formatMoney(stats.totalLossMtd, stats.currency) },
    { label: 'Open Incidents', value: String(stats.openIncidents) },
    { label: 'KRIs Breached', value: String(stats.krisBreached) },
    { label: 'RCSA Due', value: String(stats.rcsaDue) },
  ] : [];

  const tabs = [
    { key: 'losses' as const, label: 'Loss Events' },
    { key: 'kri' as const, label: 'KRI Dashboard' },
    { key: 'rcsa' as const, label: 'RCSA' },
    { key: 'incidents' as const, label: 'Incidents' },
  ];

  return (
    <>
      <PageHeader title="Operational Risk" subtitle="Loss events, KRIs, RCSA, incident management"
        actions={
          <button onClick={() => setShowLossModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Report Loss Event
          </button>
        }
      />
      <div className="page-container space-y-6">
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((s) => (<div key={s.label} className="stat-card"><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>))}
          </div>
        )}

        <LossDistributionChart data={lossByCat} currency={stats?.currency || 'NGN'} />

        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'losses' && <LossEventTable data={lossEvents} isLoading={isLoading} />}
        {tab === 'kri' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kris.map((kri) => <KriCard key={kri.id} kri={kri} />)}
          </div>
        )}
        {tab === 'rcsa' && <DataTable columns={rcsaColumns} data={rcsaList} enableGlobalFilter emptyMessage="No RCSA assessments" />}
        {tab === 'incidents' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowIncidentModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Report Incident
              </button>
            </div>
            <DataTable columns={incidentColumns} data={incidents} enableGlobalFilter emptyMessage="No incidents" />
          </div>
        )}
      </div>

      <ReportLossEventModal open={showLossModal} onClose={() => setShowLossModal(false)} />
      <ReportIncidentModal open={showIncidentModal} onClose={() => setShowIncidentModal(false)} />
    </>
  );
}
