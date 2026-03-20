import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { Layers3, Users, Plus, X, BarChart3, AlertTriangle, Eye, Pencil } from 'lucide-react';
import {
  useCustomerSegments, useSegmentAnalytics, useCreateSegment,
} from '../hooks/useCustomers';
import { SegmentDistributionChart } from '../components/segmentation/SegmentDistributionChart';
import { SegmentComparisonTable } from '../components/segmentation/SegmentComparisonTable';
import type { CustomerSegment, CreateSegmentPayload } from '../types/customer';
import { toast } from 'sonner';

const SEGMENT_TYPES = ['DEMOGRAPHIC', 'BEHAVIORAL', 'VALUE_BASED', 'PRODUCT', 'LIFECYCLE', 'RISK'];

// ── Create Segment Dialog ────────────────────────────────────────────────────

function CreateSegmentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateSegment();
  const [form, setForm] = useState<CreateSegmentPayload>({
    code: '', name: '', description: '', segmentType: 'VALUE_BASED', priority: 5, colorCode: '#3b82f6',
  });

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Create Segment</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ ...form, code: form.code.toUpperCase() }, {
              onSuccess: () => { toast.success('Segment created'); onClose(); },
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Code *</label>
              <input className="w-full mt-1 input uppercase" placeholder="PREMIUM" value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} required />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <select className="w-full mt-1 input" value={form.segmentType} onChange={(e) => update('segmentType', e.target.value)}>
                {SEGMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name *</label>
            <input className="w-full mt-1 input" placeholder="Segment name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea className="w-full mt-1 input" rows={2} placeholder="Segment description" value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Priority</label>
              <input type="number" min={1} max={100} className="w-full mt-1 input" value={form.priority} onChange={(e) => update('priority', parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.colorCode || '#3b82f6'} onChange={(e) => update('colorCode', e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                <input className="flex-1 input" value={form.colorCode || ''} onChange={(e) => update('colorCode', e.target.value)} placeholder="#3b82f6" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Creating...' : 'Create Segment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Segment Card ─────────────────────────────────────────────────────────────

function SegmentCard({
  segment,
  analytics,
  onView,
  onEdit,
}: {
  segment: CustomerSegment;
  analytics?: { customerCount: number; totalBalance: number; avgBalance: number };
  onView: () => void;
  onEdit?: () => void;
}) {
  const color = segment.colorCode || '#6b7280';

  return (
    <div
      className="rounded-xl border bg-card p-5 hover:shadow-sm transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{segment.name}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{segment.code}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={segment.segmentType} />
          {!segment.isActive && <StatusBadge status="INACTIVE" />}
        </div>
      </div>

      {segment.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{segment.description}</p>
      )}

      {analytics && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Customers</p>
            <p className="text-sm font-bold tabular-nums">{analytics.customerCount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total Bal</p>
            <p className="text-sm font-bold tabular-nums">{formatMoneyCompact(analytics.totalBalance)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Avg Bal</p>
            <p className="text-sm font-bold tabular-nums">{formatMoneyCompact(analytics.avgBalance)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Priority: {segment.priority}</span>
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button onClick={onEdit} className="text-xs px-2 py-1 rounded hover:bg-muted transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
          )}
          <button onClick={onView} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SegmentationPage() {
  const navigate = useNavigate();
  const { data: segments = [], isLoading: segmentsLoading } = useCustomerSegments();
  const { data: analytics = [], isLoading: analyticsLoading } = useSegmentAnalytics();
  const [showCreate, setShowCreate] = useState(false);

  const totalCustomers = analytics.reduce((s, a) => s + a.customerCount, 0);
  const totalBalance = analytics.reduce((s, a) => s + a.totalBalance, 0);
  const largest = analytics.length > 0 ? analytics.reduce((a, b) => a.customerCount > b.customerCount ? a : b) : null;
  const unsegmented = 0; // Would come from analytics endpoint

  const analyticsMap = new Map(analytics.map((a) => [a.code, a]));

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
        {/* Analytics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Segments" value={segments.length} format="number" icon={Layers3} loading={segmentsLoading} />
          <StatCard label="Customers Segmented" value={totalCustomers} format="number" icon={Users} loading={analyticsLoading} />
          <StatCard
            label="Largest Segment"
            value={largest ? `${largest.name} (${largest.customerCount.toLocaleString()})` : '--'}
            loading={analyticsLoading}
          />
          <StatCard label="Total Balance" value={totalBalance} format="money" compact icon={BarChart3} loading={analyticsLoading} />
          <StatCard label="Unsegmented" value={unsegmented} format="number" icon={AlertTriangle} loading={analyticsLoading} />
        </div>

        {/* Distribution Charts */}
        <SegmentDistributionChart data={analytics} isLoading={analyticsLoading} />

        {/* Segment Cards Grid */}
        <div>
          <p className="text-sm font-medium mb-3">
            Segments ({segments.length})
          </p>
          {segmentsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : segments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <Layers3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No segments configured. Create your first segment to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {segments.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  analytics={analyticsMap.get(segment.code)}
                  onView={() => navigate(`/customers/segments/${segment.code}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <SegmentComparisonTable data={analytics} isLoading={analyticsLoading} />
      </div>

      {showCreate && <CreateSegmentDialog onClose={() => setShowCreate(false)} />}
    </>
  );
}
