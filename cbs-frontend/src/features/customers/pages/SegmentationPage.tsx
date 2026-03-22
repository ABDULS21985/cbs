import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatMoneyCompact } from '@/lib/formatters';
import type { LucideIcon } from 'lucide-react';
import {
  Layers3, Users, Plus, X, BarChart3, Eye,
  TrendingUp, Activity, Star, Pencil, Trash2, Play,
} from 'lucide-react';
import {
  useCustomerSegments, useSegmentAnalytics, useCreateSegment,
  useUpdateSegment, useDeleteSegment, useEvaluateSegment,
} from '../hooks/useCustomers';
import { SegmentDistributionChart } from '../components/segmentation/SegmentDistributionChart';
import { SegmentComparisonTable } from '../components/segmentation/SegmentComparisonTable';
import type { CustomerSegment, CreateSegmentPayload, SegmentRule } from '../types/customer';
import { toast } from 'sonner';

// Must match backend SegmentType enum: RULE_BASED, ML_DRIVEN, MANUAL, HYBRID
const SEGMENT_TYPES = ['RULE_BASED', 'ML_DRIVEN', 'MANUAL', 'HYBRID'] as const;
type SegmentTypeValue = typeof SEGMENT_TYPES[number];

const SEGMENT_TYPE_CFG: Record<string, { color: string; label: string }> = {
  RULE_BASED: { color: '#3B82F6', label: 'Rule-Based' },
  ML_DRIVEN:  { color: '#8B5CF6', label: 'ML-Driven'  },
  MANUAL:     { color: '#F59E0B', label: 'Manual'     },
  HYBRID:     { color: '#22C55E', label: 'Hybrid'     },
};

// All RuleOperator values from backend
const RULE_OPERATORS = [
  { value: 'EQUALS',          label: '= equals'         },
  { value: 'NOT_EQUALS',      label: '≠ not equals'     },
  { value: 'GREATER_THAN',    label: '> greater than'   },
  { value: 'LESS_THAN',       label: '< less than'      },
  { value: 'GREATER_OR_EQUAL',label: '>= ≥'             },
  { value: 'LESS_OR_EQUAL',   label: '<= ≤'             },
  { value: 'CONTAINS',        label: 'contains'         },
  { value: 'NOT_CONTAINS',    label: 'not contains'     },
  { value: 'STARTS_WITH',     label: 'starts with'      },
  { value: 'ENDS_WITH',       label: 'ends with'        },
  { value: 'IN',              label: 'in (csv list)'    },
  { value: 'NOT_IN',          label: 'not in (csv list)'},
  { value: 'BETWEEN',         label: 'between'          },
  { value: 'IS_NULL',         label: 'is null'          },
  { value: 'IS_NOT_NULL',     label: 'is not null'      },
];

// ── Segment Type Badge ─────────────────────────────────────────────────────────

function SegmentTypeBadge({ type }: { type: string }) {
  const cfg = SEGMENT_TYPE_CFG[type] || { color: '#6b7280', label: type.replace(/_/g, ' ') };
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="mt-3">
        <p className="stat-label">{label}</p>
        {loading ? (
          <div className="h-7 w-20 rounded-lg bg-white/10 animate-pulse mt-2" />
        ) : (
          <p className="stat-value" style={{ color }}>{value}</p>
        )}
        {sub && <p className="stat-sublabel">{sub}</p>}
      </div>
    </div>
  );
}

// ── Rule Builder ──────────────────────────────────────────────────────────────

function RuleBuilder({ rules, onChange }: { rules: SegmentRule[]; onChange: (r: SegmentRule[]) => void }) {
  const addRule = () =>
    onChange([...rules, { fieldName: '', operator: 'EQUALS', fieldValue: '', logicalGroup: 0, isActive: true }]);
  const update = (i: number, patch: Partial<SegmentRule>) =>
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rules.filter((_, idx) => idx !== i));
  const noValue = (op: string) => op === 'IS_NULL' || op === 'IS_NOT_NULL';
  const needsTo = (op: string) => op === 'BETWEEN';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rules</p>
        <button type="button" onClick={addRule} className="text-[11px] text-primary hover:underline">+ Add Rule</button>
      </div>
      {rules.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">No rules — segment will be assigned manually.</p>
      )}
      {rules.map((rule, i) => (
        <div key={i} className="rounded-lg border p-2.5 space-y-2 bg-muted/30 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {i > 0 && (
              <select
                className="field-control text-xs w-16"
                value={rule.logicalGroup ?? 0}
                title="Same group = AND; different group = OR"
                onChange={(e) => update(i, { logicalGroup: parseInt(e.target.value) })}
              >
                <option value={0}>AND</option>
                <option value={1}>OR</option>
              </select>
            )}
            <input
              className="field-control text-xs flex-1 min-w-28"
              placeholder="Field (e.g. customerType, riskRating)"
              value={rule.fieldName}
              onChange={(e) => update(i, { fieldName: e.target.value })}
              required
            />
            <select
              className="field-control text-xs w-36"
              value={rule.operator}
              onChange={(e) => update(i, { operator: e.target.value })}
            >
              {RULE_OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
            </select>
            {!noValue(rule.operator) && (
              <input
                className="field-control text-xs flex-1 min-w-24"
                placeholder={rule.operator === 'IN' || rule.operator === 'NOT_IN' ? 'val1,val2,...' : 'Value'}
                value={rule.fieldValue}
                onChange={(e) => update(i, { fieldValue: e.target.value })}
              />
            )}
            {needsTo(rule.operator) && (
              <input
                className="field-control text-xs w-24"
                placeholder="To value"
                value={rule.fieldValueTo ?? ''}
                onChange={(e) => update(i, { fieldValueTo: e.target.value })}
              />
            )}
            <button type="button" onClick={() => remove(i)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Shared Segment Form ───────────────────────────────────────────────────────

type SegmentFormValues = {
  code: string; name: string; description: string;
  segmentType: SegmentTypeValue; priority: number;
  isActive: boolean; colorCode: string; rules: SegmentRule[];
};

function SegmentFormDialog({
  title, initial, codeReadOnly, onClose, onSubmit, isPending,
}: {
  title: string; initial: SegmentFormValues; codeReadOnly?: boolean;
  onClose: () => void; onSubmit: (d: SegmentFormValues) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<SegmentFormValues>(initial);
  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center modal-scrim py-8 overflow-y-auto">
      <div className="gloss-panel rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(6,182,212,0.15)' }}>
            <Layers3 className="w-4 h-4" style={{ color: '#06B6D4' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <p className="text-[11px] text-muted-foreground">Define segment metadata and rules</p>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Code *</label>
              <input className="w-full mt-1 field-control uppercase font-mono" placeholder="PREMIUM"
                value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required readOnly={codeReadOnly} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type *</label>
              <select className="w-full mt-1 field-control" value={form.segmentType} onChange={(e) => set('segmentType', e.target.value)}>
                {SEGMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name *</label>
            <input className="w-full mt-1 field-control" placeholder="Segment name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea className="w-full mt-1 field-control" rows={2} placeholder="Segment description" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</label>
              <input type="number" min={1} max={999} className="w-full mt-1 field-control" value={form.priority} onChange={(e) => set('priority', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.colorCode || '#3b82f6'} onChange={(e) => set('colorCode', e.target.value)} className="w-9 h-9 rounded-lg border border-input cursor-pointer" />
                <input className="flex-1 field-control font-mono text-xs" value={form.colorCode || ''} onChange={(e) => set('colorCode', e.target.value)} placeholder="#3b82f6" />
              </div>
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="rounded" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active</span>
              </label>
            </div>
          </div>
          {(form.segmentType === 'RULE_BASED' || form.segmentType === 'HYBRID') && (
            <RuleBuilder rules={form.rules} onChange={(r) => set('rules', r)} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Saving…' : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteSegmentDialog({
  segment, onClose, onConfirm, isPending,
}: { segment: CustomerSegment; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-scrim">
      <div className="gloss-panel rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <h2 className="text-base font-semibold mb-2">Delete Segment</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Delete <strong>{segment.name}</strong> ({segment.code})? All customer assignments will be removed.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Segment Dialog ──────────────────────────────────────────────────────

function CreateSegmentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateSegment();
  const handleSubmit = (data: SegmentFormValues) => {
    create.mutate(
      { code: data.code, name: data.name, description: data.description || undefined,
        segmentType: data.segmentType, priority: data.priority, isActive: data.isActive,
        colorCode: data.colorCode || undefined, rules: data.rules.length > 0 ? data.rules : undefined },
      { onSuccess: () => { toast.success('Segment created'); onClose(); },
        onError: (err: Error) => toast.error(err.message || 'Failed to create segment') },
    );
  };
  return (
    <SegmentFormDialog
      title="Create Segment"
      initial={{ code: '', name: '', description: '', segmentType: 'RULE_BASED', priority: 50, isActive: true, colorCode: '#3b82f6', rules: [] }}
      onClose={onClose}
      onSubmit={handleSubmit}
      isPending={create.isPending}
    />
  );
}

// ── Segment Card ───────────────────────────────────────────────────────────────

function SegmentCard({
  segment,
  analytics,
  totalCustomers,
  onView,
  onEdit,
  onDelete,
  onEvaluate,
}: {
  segment: CustomerSegment;
  analytics?: { customerCount: number; totalBalance: number; avgBalance: number };
  totalCustomers: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEvaluate: () => void;
}) {
  const segColor = segment.colorCode || '#6b7280';
  const pct = totalCustomers > 0 && analytics
    ? (analytics.customerCount / totalCustomers) * 100
    : 0;

  return (
    <div
      className="gloss-panel surface-hover rounded-2xl p-5 cursor-pointer group"
      style={{ borderLeft: `4px solid ${segColor}` }}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: `${segColor}18` }}
          >
            <Layers3 className="w-4 h-4" style={{ color: segColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight leading-tight">{segment.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-0.5">{segment.code}</p>
          </div>
        </div>
        <SegmentTypeBadge type={segment.segmentType} />
      </div>

      {/* Description */}
      {segment.description && (
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{segment.description}</p>
      )}

      {/* Stat mini-cells */}
      {analytics ? (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Customers', value: analytics.customerCount.toLocaleString() },
            { label: 'Total Bal', value: formatMoneyCompact(analytics.totalBalance) },
            { label: 'Avg Bal',   value: formatMoneyCompact(analytics.avgBalance)   },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg p-2 text-center"
              style={{ backgroundColor: `${segColor}0f` }}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: segColor }}>{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[68px] mb-4" />
      )}

      {/* Portfolio share bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Portfolio Share</span>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: segColor }}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: segColor }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: segment.isActive ? '#22C55E' : '#EF4444' }}
          />
          <span className="text-[10px] text-muted-foreground">{segment.isActive ? 'Active' : 'Inactive'}</span>
          <span className="text-[10px] text-muted-foreground mx-1">·</span>
          <Star className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">P{segment.priority}</span>
        </div>
        <div className="flex items-center gap-1">
          {(segment.segmentType === 'RULE_BASED' || segment.segmentType === 'HYBRID') && (
            <button onClick={(e) => { e.stopPropagation(); onEvaluate(); }}
              title="Run rule evaluation for all customers"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground">
              <Play className="w-3 h-3" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Edit segment"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete segment"
            className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors text-destructive">
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
            style={{ backgroundColor: `${segColor}18`, color: segColor }}
          >
            <Eye className="w-3 h-3" />
            View
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SegmentationPage() {
  const navigate = useNavigate();
  const { data: segments = [], isLoading: segmentsLoading } = useCustomerSegments();
  const { data: analytics = [], isLoading: analyticsLoading } = useSegmentAnalytics();
  const updateMutation  = useUpdateSegment();
  const deleteMutation  = useDeleteSegment();
  const evaluateMutation = useEvaluateSegment();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget,   setEditTarget]   = useState<CustomerSegment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerSegment | null>(null);

  const totalCustomers = analytics.reduce((s, a) => s + a.customerCount, 0);
  const totalBalance   = analytics.reduce((s, a) => s + a.totalBalance, 0);
  const largest        = analytics.length > 0
    ? analytics.reduce((a, b) => a.customerCount > b.customerCount ? a : b)
    : null;
  const activeSegments = segments.filter((s) => s.isActive).length;
  const avgBalance     = totalCustomers > 0 ? totalBalance / totalCustomers : 0;

  const analyticsMap = new Map(analytics.map((a) => [a.code, a]));

  function handleEdit(data: SegmentFormValues) {
    if (!editTarget) return;
    updateMutation.mutate(
      { code: editTarget.code, name: data.name, description: data.description || undefined,
        segmentType: data.segmentType, priority: data.priority, isActive: data.isActive,
        colorCode: data.colorCode || undefined, rules: data.rules },
      { onSuccess: () => { toast.success('Segment updated'); setEditTarget(null); },
        onError: (err: Error) => toast.error(err.message || 'Update failed') },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.code, {
      onSuccess: () => { toast.success('Segment deleted'); setDeleteTarget(null); },
      onError: (err: Error) => toast.error(err.message || 'Delete failed'),
    });
  }

  function handleEvaluate(segment: CustomerSegment) {
    evaluateMutation.mutate(segment.code, {
      onSuccess: (res) => toast.success(`Evaluation complete — ${res.newAssignments} new assignments`),
      onError: (err: Error) => toast.error(err.message || 'Evaluation failed'),
    });
  }

  return (
    <>
      <PageHeader
        title="Customer Segmentation"
        subtitle="Analytics dashboard, segment rules, and campaign targeting"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> Create Segment
          </button>
        }
      />

      <div className="page-container space-y-6">

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Total Segments"
            value={segments.length}
            sub={`${activeSegments} active`}
            icon={Layers3}
            color="#06B6D4"
            loading={segmentsLoading}
          />
          <KpiCard
            label="Customers Segmented"
            value={totalCustomers.toLocaleString()}
            icon={Users}
            color="#3B82F6"
            loading={analyticsLoading}
          />
          <KpiCard
            label="Largest Segment"
            value={largest ? largest.name : '—'}
            sub={largest ? `${largest.customerCount.toLocaleString()} customers` : undefined}
            icon={Activity}
            color="#8B5CF6"
            loading={analyticsLoading}
          />
          <KpiCard
            label="Total Balance"
            value={formatMoneyCompact(totalBalance)}
            icon={BarChart3}
            color="#22C55E"
            loading={analyticsLoading}
          />
          <KpiCard
            label="Avg Balance / Customer"
            value={formatMoneyCompact(avgBalance)}
            icon={TrendingUp}
            color="#F59E0B"
            loading={analyticsLoading}
          />
        </div>

        {/* Distribution Charts */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Distribution Overview
          </p>
          <SegmentDistributionChart data={analytics} isLoading={analyticsLoading} />
        </div>

        {/* Segment Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Segments — {segments.length} configured
            </p>
            <div className="hidden sm:flex items-center gap-4">
              {Object.entries(SEGMENT_TYPE_CFG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {segmentsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : segments.length === 0 ? (
            <div className="gloss-panel rounded-2xl p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Layers3 className="w-5 h-5 text-muted-foreground opacity-40" />
              </div>
              <p className="text-sm text-muted-foreground">No segments configured.</p>
              <p className="text-xs text-muted-foreground mt-1 opacity-70">
                Create your first segment to get started.
              </p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-xs inline-flex">
                <Plus className="w-3.5 h-3.5" /> Create Segment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {segments.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  analytics={analyticsMap.get(segment.code)}
                  totalCustomers={totalCustomers}
                  onView={() => navigate(`/customers/segments/${segment.code}`)}
                  onEdit={() => setEditTarget(segment)}
                  onDelete={() => setDeleteTarget(segment)}
                  onEvaluate={() => handleEvaluate(segment)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Segment Analytics Matrix
          </p>
          <SegmentComparisonTable data={analytics} isLoading={analyticsLoading} />
        </div>

      </div>

      {showCreate && <CreateSegmentDialog onClose={() => setShowCreate(false)} />}

      {editTarget && (
        <SegmentFormDialog
          title="Edit Segment"
          codeReadOnly
          initial={{
            code: editTarget.code,
            name: editTarget.name,
            description: editTarget.description || '',
            segmentType: (editTarget.segmentType as SegmentTypeValue) || 'RULE_BASED',
            priority: editTarget.priority,
            isActive: editTarget.isActive,
            colorCode: editTarget.colorCode || '#3b82f6',
            rules: [],
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          isPending={updateMutation.isPending}
        />
      )}

      {deleteTarget && (
        <DeleteSegmentDialog
          segment={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isPending={deleteMutation.isPending}
        />
      )}
    </>
  );
}
