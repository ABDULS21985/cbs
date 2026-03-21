import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Activity,
  BarChart3,
  Users,
  Clock,
  Star,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  ArrowLeft,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { cn } from '@/lib/utils';
import {
  useAllServicePoints,
  useServicePointMetrics,
  useStartInteraction,
  useEndInteraction,
} from '../hooks/useChannels';
import type { ServicePointInteraction } from '../api/channelApi';

// ─── Start Interaction Dialog ─────────────────────────────────────────────────

interface StartInteractionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ServicePointInteraction>) => void;
  isPending: boolean;
}

function StartInteractionDialog({ open, onClose, onSubmit, isPending }: StartInteractionDialogProps) {
  const [form, setForm] = useState({
    customerId: '',
    interactionType: 'WALK_IN',
    channelUsed: 'BRANCH',
    staffAssisted: true,
    staffId: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      customerId: form.customerId ? parseInt(form.customerId, 10) : null,
      interactionType: form.interactionType,
      channelUsed: form.channelUsed,
      staffAssisted: form.staffAssisted,
      staffId: form.staffId || null,
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card">
            <h2 className="text-base font-semibold">Start Customer Interaction</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer ID</label>
              <input
                type="number"
                className={inputCls}
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Interaction Type *</label>
                <select
                  className={inputCls}
                  value={form.interactionType}
                  onChange={(e) => setForm((f) => ({ ...f, interactionType: e.target.value }))}
                >
                  <option value="WALK_IN">Walk-In</option>
                  <option value="APPOINTMENT">Appointment</option>
                  <option value="TRANSACTION">Transaction</option>
                  <option value="INQUIRY">Inquiry</option>
                  <option value="COMPLAINT">Complaint</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel</label>
                <select
                  className={inputCls}
                  value={form.channelUsed}
                  onChange={(e) => setForm((f) => ({ ...f, channelUsed: e.target.value }))}
                >
                  <option value="BRANCH">Branch</option>
                  <option value="ATM">ATM</option>
                  <option value="KIOSK">Kiosk</option>
                  <option value="AGENT">Agent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Staff ID</label>
              <input
                className={inputCls}
                value={form.staffId}
                onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
                placeholder="Optional staff identifier"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.staffAssisted}
                onChange={(e) => setForm((f) => ({ ...f, staffAssisted: e.target.checked }))}
              />
              Staff Assisted
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Start Interaction
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── End Interaction Dialog ───────────────────────────────────────────────────

interface EndInteractionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (outcome: string, satisfactionScore?: number) => void;
  isPending: boolean;
}

function EndInteractionDialog({ open, onClose, onSubmit, isPending }: EndInteractionDialogProps) {
  const [outcome, setOutcome] = useState('COMPLETED');
  const [satisfaction, setSatisfaction] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(outcome, satisfaction ? parseInt(satisfaction, 10) : undefined);
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">End Interaction</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Outcome *</label>
              <select
                className={inputCls}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="COMPLETED">Completed</option>
                <option value="ABANDONED">Abandoned</option>
                <option value="ESCALATED">Escalated</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Satisfaction (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                className={inputCls}
                value={satisfaction}
                onChange={(e) => setSatisfaction(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                End Interaction
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'ONLINE':
      return <Wifi className="w-5 h-5 text-green-600" />;
    case 'OFFLINE':
      return <WifiOff className="w-5 h-5 text-red-500" />;
    case 'MAINTENANCE':
      return <Wrench className="w-5 h-5 text-amber-500" />;
    default:
      return <Activity className="w-5 h-5 text-muted-foreground" />;
  }
}

const SP_TYPE_COLORS: Record<string, string> = {
  BRANCH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ATM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  KIOSK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ServicePointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const servicePointId = parseInt(id ?? '0', 10);

  const { data: allPoints = [], isLoading: pointsLoading } = useAllServicePoints();
  const { data: metrics, isLoading: metricsLoading } = useServicePointMetrics(servicePointId || undefined);
  const { mutate: startInteraction, isPending: starting } = useStartInteraction();
  const { mutate: endInteraction, isPending: ending } = useEndInteraction();

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  const servicePoint = useMemo(
    () => allPoints.find((sp) => sp.id === servicePointId),
    [allPoints, servicePointId],
  );

  const handleStartInteraction = (data: Partial<ServicePointInteraction>) => {
    startInteraction(
      { servicePointId, interaction: data },
      {
        onSuccess: () => {
          toast.success('Interaction started');
          setShowStartDialog(false);
        },
        onError: () => toast.error('Failed to start interaction'),
      },
    );
  };

  const handleEndInteraction = (outcome: string, satisfactionScore?: number) => {
    endInteraction(
      { servicePointId, outcome, satisfactionScore },
      {
        onSuccess: () => {
          toast.success('Interaction ended');
          setShowEndDialog(false);
        },
        onError: () => toast.error('Failed to end interaction'),
      },
    );
  };

  if (pointsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!servicePoint) {
    return (
      <>
        <PageHeader title="Service Point Not Found" subtitle="The requested service point does not exist." />
        <div className="page-container">
          <button
            onClick={() => navigate('/channels')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Channels
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={servicePoint.servicePointName}
        subtitle={`Service Point ${servicePoint.servicePointCode}`}
        backTo="/channels"
      />
      <div className="page-container space-y-6">
        {/* Header info + actions */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <StatusIcon status={servicePoint.status} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-semibold">{servicePoint.servicePointName}</h2>
                  <StatusBadge status={servicePoint.status} dot />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{servicePoint.servicePointCode}</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      SP_TYPE_COLORS[servicePoint.servicePointType] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {servicePoint.servicePointType}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStartDialog(true)}
                disabled={servicePoint.status !== 'ONLINE'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Start Interaction
              </button>
              <button
                onClick={() => setShowEndDialog(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                <XCircle className="w-4 h-4" />
                End Interaction
              </button>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Max Capacity" value={servicePoint.maxConcurrentCustomers} format="number" icon={Users} />
          <StatCard
            label="Avg Service Time"
            value={servicePoint.avgServiceTimeMinutes ?? 0}
            format="number"
            icon={Clock}
          />
          <StatCard
            label="Active Interactions"
            value={metrics?.activeInteractions ?? 0}
            format="number"
            icon={Activity}
            loading={metricsLoading}
          />
          <StatCard
            label="Total Interactions"
            value={metrics?.totalInteractions ?? 0}
            format="number"
            icon={BarChart3}
            loading={metricsLoading}
          />
          <StatCard
            label="Utilization"
            value={metrics?.utilizationPct != null ? `${metrics.utilizationPct.toFixed(1)}%` : '—'}
            icon={BarChart3}
            loading={metricsLoading}
          />
          <StatCard
            label="Avg Satisfaction"
            value={metrics?.avgSatisfaction != null ? metrics.avgSatisfaction.toFixed(1) : '—'}
            icon={Star}
            loading={metricsLoading}
          />
        </div>

        {/* Properties */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold">Service Point Properties</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {[
              { label: 'Code', value: servicePoint.servicePointCode },
              { label: 'Name', value: servicePoint.servicePointName },
              { label: 'Type', value: servicePoint.servicePointType },
              { label: 'Status', value: servicePoint.status },
              { label: 'Device ID', value: servicePoint.deviceId ?? '—' },
              { label: 'Location ID', value: servicePoint.locationId?.toString() ?? '—' },
              { label: 'Max Concurrent Customers', value: String(servicePoint.maxConcurrentCustomers) },
              { label: 'Avg Service Time (min)', value: servicePoint.avgServiceTimeMinutes?.toString() ?? '—' },
              {
                label: 'Staff Required',
                value: servicePoint.staffRequired ? 'Yes' : 'No',
                icon: servicePoint.staffRequired ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                ),
              },
              {
                label: 'Accessible',
                value: servicePoint.isAccessible ? 'Yes' : 'No',
                icon: servicePoint.isAccessible ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                ),
              },
              { label: 'Assigned Staff', value: servicePoint.assignedStaffId ?? '—' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-card px-5 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                  {icon}
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Detail */}
        {metrics && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-semibold">Performance Metrics</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time computed from interaction history</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Avg Duration</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {metrics.avgDurationSeconds > 0
                      ? `${Math.round(metrics.avgDurationSeconds / 60)}m`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Satisfaction</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {metrics.avgSatisfaction > 0 ? `${metrics.avgSatisfaction.toFixed(1)}/5` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Utilization</p>
                  <p className="text-2xl font-bold tabular-nums">{metrics.utilizationPct.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Active Now</p>
                  <p className="text-2xl font-bold tabular-nums">{metrics.activeInteractions}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <StartInteractionDialog
        open={showStartDialog}
        onClose={() => setShowStartDialog(false)}
        onSubmit={handleStartInteraction}
        isPending={starting}
      />

      <EndInteractionDialog
        open={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onSubmit={handleEndInteraction}
        isPending={ending}
      />
    </>
  );
}
