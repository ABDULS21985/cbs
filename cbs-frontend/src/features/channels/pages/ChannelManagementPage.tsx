import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Loader2,
  XCircle,
  Activity,
  Settings,
  Globe,
  Smartphone,
  CreditCard,
  Building2,
  Phone,
  Radio,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  useChannelSessionCounts,
  useAllServicePoints,
  useServicePointStatus,
  useRegisterServicePoint,
  useCleanupSessions,
} from '../hooks/useChannels';
import type { ServicePoint } from '../api/channelApi';

// ─── Channel Icons ────────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  WEB: { icon: Globe, label: 'Web', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MOBILE: { icon: Smartphone, label: 'Mobile', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ATM: { icon: CreditCard, label: 'ATM', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  BRANCH: { icon: Building2, label: 'Branch', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  USSD: { icon: Phone, label: 'USSD', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  IVR: { icon: Radio, label: 'IVR', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
};

const SP_TYPE_COLORS: Record<string, string> = {
  BRANCH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ATM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  KIOSK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ─── Register Service Point Dialog ────────────────────────────────────────────

interface RegisterSPDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Omit<ServicePoint, 'id' | 'servicePointCode'>) => void;
  isPending: boolean;
}

function RegisterSPDialog({ open, onClose, onSubmit, isPending }: RegisterSPDialogProps) {
  const [form, setForm] = useState({
    servicePointName: '',
    servicePointType: 'BRANCH',
    locationId: '',
    deviceId: '',
    isAccessible: false,
    staffRequired: true,
    assignedStaffId: '',
    maxConcurrentCustomers: '1',
    avgServiceTimeMinutes: '',
    status: 'ONLINE',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      servicePointName: form.servicePointName,
      servicePointType: form.servicePointType,
      locationId: form.locationId ? parseInt(form.locationId, 10) : null,
      deviceId: form.deviceId || null,
      supportedServices: null,
      operatingHours: null,
      isAccessible: form.isAccessible,
      staffRequired: form.staffRequired,
      assignedStaffId: form.assignedStaffId || null,
      maxConcurrentCustomers: parseInt(form.maxConcurrentCustomers, 10) || 1,
      avgServiceTimeMinutes: form.avgServiceTimeMinutes
        ? parseInt(form.avgServiceTimeMinutes, 10)
        : null,
      status: form.status,
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
            <h2 className="text-base font-semibold">Register Service Point</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
              <input
                required
                className={inputCls}
                value={form.servicePointName}
                onChange={(e) => setForm((f) => ({ ...f, servicePointName: e.target.value }))}
                placeholder="e.g. Lekki Branch"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type *</label>
                <select
                  className={inputCls}
                  value={form.servicePointType}
                  onChange={(e) => setForm((f) => ({ ...f, servicePointType: e.target.value }))}
                >
                  <option value="BRANCH">Branch</option>
                  <option value="ATM">ATM</option>
                  <option value="KIOSK">Kiosk</option>
                  <option value="AGENT">Agent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Concurrent Customers</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.maxConcurrentCustomers}
                  onChange={(e) => setForm((f) => ({ ...f, maxConcurrentCustomers: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Avg Service Time (min)</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.avgServiceTimeMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, avgServiceTimeMinutes: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Device ID</label>
              <input
                className={inputCls}
                value={form.deviceId}
                onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                placeholder="Optional device identifier"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.staffRequired}
                  onChange={(e) => setForm((f) => ({ ...f, staffRequired: e.target.checked }))}
                />
                Staff Required
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAccessible}
                  onChange={(e) => setForm((f) => ({ ...f, isAccessible: e.target.checked }))}
                />
                Accessible
              </label>
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
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Register
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Live Sessions Tab ────────────────────────────────────────────────────────

function LiveSessionsTab() {
  const { data: counts, isLoading, dataUpdatedAt, refetch, isFetching } = useChannelSessionCounts();
  const { mutate: cleanup, isPending: cleaning } = useCleanupSessions();

  const total = counts ? Object.values(counts).reduce((a, b) => a + (b as number), 0) : 0;

  const handleCleanup = () => {
    cleanup(undefined, {
      onSuccess: (data) => toast.success(`${data.expired ?? 0} expired sessions cleaned`),
      onError: () => toast.error('Cleanup failed'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold">Live Channel Sessions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total.toLocaleString()} total active — refreshes every 60s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RoleGuard roles="CBS_ADMIN">
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {cleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Cleanup Expired
              </button>
            </RoleGuard>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(CHANNEL_META).map(([ch, { icon: Icon, label, color }]) => {
              const count = (counts as Record<string, number> | undefined)?.[ch] ?? 0;
              return (
                <div
                  key={ch}
                  className="rounded-xl border p-4 flex flex-col items-center gap-2 hover:bg-muted/40 transition-colors"
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <span className="text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-medium',
                      count > 0 ? 'text-green-600' : 'text-red-500',
                    )}
                  >
                    {count > 0 ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {count > 0 ? 'Active' : 'No sessions'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {dataUpdatedAt > 0 && (
          <p className="text-[10px] text-muted-foreground mt-4">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Service Points Tab ───────────────────────────────────────────────────────

function ServicePointsTab() {
  const navigate = useNavigate();
  const { data: points = [], isLoading } = useAllServicePoints();
  const { data: statusMap } = useServicePointStatus();
  const { mutate: register, isPending: registering } = useRegisterServicePoint();
  const [showDialog, setShowDialog] = useState(false);

  const online = statusMap?.online ?? points.filter((p) => p.status === 'ONLINE').length;
  const offline = statusMap?.offline ?? points.filter((p) => p.status === 'OFFLINE').length;
  const maintenance =
    statusMap?.maintenance ?? points.filter((p) => p.status === 'MAINTENANCE').length;

  const handleRegister = (payload: Omit<ServicePoint, 'id' | 'servicePointCode'>) => {
    register(payload, {
      onSuccess: () => {
        toast.success('Service point registered');
        setShowDialog(false);
      },
      onError: () => toast.error('Registration failed'),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Points" value={points.length} format="number" icon={MapPin} loading={isLoading} />
        <StatCard label="Online" value={online} format="number" icon={CheckCircle2} loading={isLoading} />
        <StatCard label="Offline" value={offline} format="number" icon={XCircle} loading={isLoading} />
        <StatCard label="Maintenance" value={maintenance} format="number" icon={Settings} loading={isLoading} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Service Points</h3>
          <RoleGuard roles="CBS_ADMIN">
            <button
              onClick={() => setShowDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register Service Point
            </button>
          </RoleGuard>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Code', 'Name', 'Type', 'Status', 'Capacity', 'Staff', 'Accessible', ''].map(
                    (h) => (
                      <th
                        key={h || '_action'}
                        className="text-left px-5 py-3 text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {points.map((sp) => (
                  <tr
                    key={sp.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/channels/service-points/${sp.id}`)}
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs">{sp.servicePointCode}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{sp.servicePointName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          SP_TYPE_COLORS[sp.servicePointType] ??
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {sp.servicePointType}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={sp.status} dot />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-sm">
                      {sp.maxConcurrentCustomers}
                    </td>
                    <td className="px-5 py-3">
                      {sp.staffRequired ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {sp.isAccessible ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
                {points.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No service points registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RegisterSPDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={handleRegister}
        isPending={registering}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'sessions' | 'service-points';

const TABS: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: 'sessions', label: 'Live Sessions', icon: Activity },
  { id: 'service-points', label: 'Service Points', icon: MapPin },
];

export function ChannelManagementPage() {
  const [tab, setTab] = useState<Tab>('sessions');

  return (
    <>
      <PageHeader
        title="Channel Management"
        subtitle="Monitor active sessions across all channels and manage physical/virtual service points."
      />
      <div className="page-container space-y-6">
        <div className="flex items-center gap-1 border-b">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'sessions' && <LiveSessionsTab />}
        {tab === 'service-points' && <ServicePointsTab />}
      </div>
    </>
  );
}
