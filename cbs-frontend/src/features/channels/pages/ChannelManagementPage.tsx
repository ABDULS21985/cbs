import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  Code,
  CreditCard,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Store,
  UserCheck,
  Workflow,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  useAllServicePoints,
  useChannelSessionCounts,
  useCleanupSessions,
  useRegisterServicePoint,
  useServicePointStatus,
} from '../hooks/useChannels';
import type { ChannelSessionCounts, ServicePoint, ServicePointStatusMap } from '../api/channelApi';

const CHANNEL_META: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  WEB: { icon: Globe, label: 'Web', color: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
  MOBILE: { icon: Smartphone, label: 'Mobile', color: 'text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30' },
  ATM: { icon: CreditCard, label: 'ATM', color: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
  BRANCH: { icon: Building2, label: 'Branch', color: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
  USSD: { icon: Phone, label: 'USSD', color: 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30' },
  IVR: { icon: Radio, label: 'IVR', color: 'text-cyan-700 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp', color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' },
  POS: { icon: Store, label: 'POS', color: 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30' },
  AGENT: { icon: UserCheck, label: 'Agent', color: 'text-indigo-700 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30' },
  API: { icon: Code, label: 'API', color: 'text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30' },
};

const SP_TYPE_COLORS: Record<string, string> = {
  BRANCH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ATM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  KIOSK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

type Tab = 'sessions' | 'service-points';

const TABS: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: 'sessions', label: 'Live Sessions', icon: Activity },
  { id: 'service-points', label: 'Service Points', icon: MapPin },
];

const QUICK_LINKS: Array<{
  title: string;
  description: string;
  path: string;
  icon: ElementType;
}> = [
  {
    title: 'Channel Config',
    description: 'Manage session rules, enabled channels, and policy controls.',
    path: '/channels/config',
    icon: Settings,
  },
  {
    title: 'Digital Banking',
    description: 'Review online banking services, channel products, and user touchpoints.',
    path: '/channels/digital-banking',
    icon: Smartphone,
  },
  {
    title: 'Activity Logs',
    description: 'Inspect channel events and operational activity across the network.',
    path: '/channels/activity-logs',
    icon: Workflow,
  },
];

function formatChannelLabel(channel: string): string {
  return CHANNEL_META[channel]?.label ?? channel;
}

function deriveSessionTotal(counts?: ChannelSessionCounts) {
  return Object.values(counts ?? {}).reduce((sum, count) => sum + count, 0);
}

function deriveServicePointStatus(points: ServicePoint[], statusMap?: ServicePointStatusMap) {
  return {
    online: statusMap?.online ?? points.filter((point) => point.status === 'ONLINE').length,
    offline: statusMap?.offline ?? points.filter((point) => point.status === 'OFFLINE').length,
    maintenance: statusMap?.maintenance ?? points.filter((point) => point.status === 'MAINTENANCE').length,
  };
}

function ChannelMetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
}) {
  return (
    <div className="channel-hub-kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="channel-hub-mini-icon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

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

  if (!open) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
      avgServiceTimeMinutes: form.avgServiceTimeMinutes ? parseInt(form.avgServiceTimeMinutes, 10) : null,
      status: form.status,
    });
  };

  return (
    <>
      <div className="modal-scrim fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="channel-hub-modal-shell max-h-[90vh] w-full max-w-2xl overflow-y-auto">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Network onboarding</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Register Service Point</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a branch, ATM, kiosk, or agent point using the live service-point contract.
              </p>
            </div>
            <button onClick={onClose} className="rounded-2xl border p-2 text-muted-foreground transition-colors hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Name *</label>
                <input
                  required
                  className="field-control channel-hub-field-input"
                  value={form.servicePointName}
                  onChange={(event) => setForm((current) => ({ ...current, servicePointName: event.target.value }))}
                  placeholder="e.g. Lekki Branch"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Type *</label>
                <select
                  className="field-control channel-hub-field-input"
                  value={form.servicePointType}
                  onChange={(event) => setForm((current) => ({ ...current, servicePointType: event.target.value }))}
                >
                  <option value="BRANCH">Branch</option>
                  <option value="ATM">ATM</option>
                  <option value="KIOSK">Kiosk</option>
                  <option value="AGENT">Agent</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Status</label>
                <select
                  className="field-control channel-hub-field-input"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Max Concurrent Customers
                </label>
                <input
                  type="number"
                  min={1}
                  className="field-control channel-hub-field-input"
                  value={form.maxConcurrentCustomers}
                  onChange={(event) => setForm((current) => ({ ...current, maxConcurrentCustomers: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Avg Service Time (min)
                </label>
                <input
                  type="number"
                  min={1}
                  className="field-control channel-hub-field-input"
                  value={form.avgServiceTimeMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, avgServiceTimeMinutes: event.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Device ID</label>
                <input
                  className="field-control channel-hub-field-input"
                  value={form.deviceId}
                  onChange={(event) => setForm((current) => ({ ...current, deviceId: event.target.value }))}
                  placeholder="Optional device identifier"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="channel-hub-check-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.staffRequired}
                  onChange={(event) => setForm((current) => ({ ...current, staffRequired: event.target.checked }))}
                />
                <div>
                  <p className="text-sm font-medium">Staff Required</p>
                  <p className="text-xs text-muted-foreground">Indicates whether a staffed operator is required at this point.</p>
                </div>
              </label>

              <label className="channel-hub-check-row cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAccessible}
                  onChange={(event) => setForm((current) => ({ ...current, isAccessible: event.target.checked }))}
                />
                <div>
                  <p className="text-sm font-medium">Accessible</p>
                  <p className="text-xs text-muted-foreground">Marks the service point as accessible for customer support needs.</p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Register
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

interface LiveSessionsTabProps {
  counts?: ChannelSessionCounts;
  isLoading: boolean;
  dataUpdatedAt: number;
  isFetching: boolean;
  onRefresh: () => void;
}

function LiveSessionsTab({ counts, isLoading, dataUpdatedAt, isFetching, onRefresh }: LiveSessionsTabProps) {
  const { mutate: cleanup, isPending: cleaning } = useCleanupSessions();

  const total = deriveSessionTotal(counts);
  const populatedChannels = Object.values(counts ?? {}).filter((count) => count > 0).length;
  const silentChannels = Math.max(Object.keys(CHANNEL_META).length - populatedChannels, 0);

  const sessionCards = useMemo(
    () =>
      Object.entries(CHANNEL_META)
        .map(([channel, meta]) => {
          const count = counts?.[channel] ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          return { channel, count, share, ...meta };
        })
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    [counts, total],
  );

  const handleCleanup = () => {
    cleanup(undefined, {
      onSuccess: (data) => toast.success(`${data.expired ?? 0} expired sessions cleaned`),
      onError: () => toast.error('Cleanup failed'),
    });
  };

  return (
    <div className="space-y-6">
      <section className="channel-hub-section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Live Channel Sessions</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {total.toLocaleString()} total active — refreshes every 60s
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoleGuard roles="CBS_ADMIN">
              <Button variant="outline" size="sm" onClick={handleCleanup} disabled={cleaning}>
                {cleaning ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                Cleanup Expired
              </Button>
            </RoleGuard>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
              {isFetching ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="channel-hub-stat-tile">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total Active</p>
            <p className="mt-3 text-2xl font-semibold">{total.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Current open sessions across all supported channels.</p>
          </div>
          <div className="channel-hub-stat-tile">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Channels With Traffic</p>
            <p className="mt-3 text-2xl font-semibold">{populatedChannels.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Channels currently carrying live customer activity.</p>
          </div>
          <div className="channel-hub-stat-tile">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Silent Channels</p>
            <p className="mt-3 text-2xl font-semibold">{silentChannels.toLocaleString()}</p>
            <p className="mt-2 text-xs text-muted-foreground">Channels with no active session footprint right now.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {sessionCards.map(({ channel, count, share, icon: Icon, label, color }) => (
              <article
                key={channel}
                className={cn(
                  'channel-hub-channel-card',
                  count > 0 ? 'channel-hub-channel-card-live' : 'channel-hub-channel-card-idle',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{channel}</p>
                    </div>
                  </div>
                  <StatusBadge status={count > 0 ? 'ACTIVE' : 'OFFLINE'} />
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-money text-3xl font-semibold tracking-tight">{count.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{share}% of active traffic</p>
                  </div>
                  <span className={cn('text-xs font-medium', count > 0 ? 'text-green-600' : 'text-red-500')}>
                    {count > 0 ? 'Active' : 'No sessions'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="channel-hub-progress-track">
                    <div className="channel-hub-progress-fill" style={{ width: `${Math.max(share, count > 0 ? 10 : 0)}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {dataUpdatedAt > 0 ? (
          <p className="mt-4 text-[10px] text-muted-foreground">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </section>
    </div>
  );
}

interface ServicePointsTabProps {
  points: ServicePoint[];
  isLoading: boolean;
  statusMap?: ServicePointStatusMap;
}

function ServicePointsTab({ points, isLoading, statusMap }: ServicePointsTabProps) {
  const navigate = useNavigate();
  const { mutate: register, isPending: registering } = useRegisterServicePoint();
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');

  const derivedStatus = deriveServicePointStatus(points, statusMap);

  const filteredPoints = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return points;
    }

    return points.filter((point) =>
      [
        point.servicePointCode,
        point.servicePointName,
        point.servicePointType,
        point.status,
        point.deviceId ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [points, search]);

  const accessibleCount = points.filter((point) => point.isAccessible).length;
  const staffedCount = points.filter((point) => point.staffRequired).length;
  const averageCapacity = points.length > 0
    ? Math.round(points.reduce((sum, point) => sum + point.maxConcurrentCustomers, 0) / points.length)
    : 0;

  const dominantType = useMemo(() => {
    const typeCounts = points.reduce((counts, point) => {
      counts.set(point.servicePointType, (counts.get(point.servicePointType) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
    return Array.from(typeCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  }, [points]);

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
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ChannelMetricCard
            label="Total Points"
            value={points.length.toLocaleString()}
            helper="Physical and assisted service points registered in the channel network."
            icon={MapPin}
          />
          <ChannelMetricCard
            label="Online"
            value={derivedStatus.online.toLocaleString()}
            helper="Service points currently marked online and available for customer flow."
            icon={CheckCircle2}
          />
          <ChannelMetricCard
            label="Offline"
            value={derivedStatus.offline.toLocaleString()}
            helper="Points currently unavailable due to outage, closure, or downtime."
            icon={XCircle}
          />
          <ChannelMetricCard
            label="Maintenance"
            value={derivedStatus.maintenance.toLocaleString()}
            helper="Points reserved for maintenance or operational intervention."
            icon={Settings}
          />
        </div>

        <aside className="channel-hub-note-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Network posture</p>
          <div className="mt-4 space-y-3">
            <div className="channel-hub-side-row">
              <span className="text-sm text-muted-foreground">Dominant type</span>
              <span className="font-semibold">{dominantType ?? '—'}</span>
            </div>
            <div className="channel-hub-side-row">
              <span className="text-sm text-muted-foreground">Accessible points</span>
              <span className="font-semibold">{accessibleCount.toLocaleString()}</span>
            </div>
            <div className="channel-hub-side-row">
              <span className="text-sm text-muted-foreground">Staffed points</span>
              <span className="font-semibold">{staffedCount.toLocaleString()}</span>
            </div>
            <div className="channel-hub-side-row">
              <span className="text-sm text-muted-foreground">Avg capacity</span>
              <span className="font-semibold">{averageCapacity.toLocaleString()}</span>
            </div>
          </div>
        </aside>
      </div>

      <section className="channel-hub-section-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Service Point Network</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Review the live service-point registry, status posture, and operational capacity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="channel-hub-search-shell">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="channel-hub-search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code, name, type, status, or device"
              />
            </div>

            <RoleGuard roles="CBS_ADMIN">
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Register Service Point
              </Button>
            </RoleGuard>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="channel-hub-table-shell mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Code', 'Name', 'Type', 'Status', 'Capacity', 'Staff', 'Accessible', ''].map((header) => (
                    <th
                      key={header || '_action'}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPoints.map((point) => (
                  <tr
                    key={point.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/channels/service-points/${point.id}`)}
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs">{point.servicePointCode}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{point.servicePointName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          SP_TYPE_COLORS[point.servicePointType] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {point.servicePointType}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={point.status} dot />
                    </td>
                    <td className="px-5 py-4 font-money text-sm">{point.maxConcurrentCustomers}</td>
                    <td className="px-5 py-4">
                      {point.staffRequired ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {point.isAccessible ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}

                {filteredPoints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      {points.length === 0 ? 'No service points registered.' : 'No service points match this filter.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RegisterSPDialog open={showDialog} onClose={() => setShowDialog(false)} onSubmit={handleRegister} isPending={registering} />
    </div>
  );
}

export function ChannelManagementPage() {
  useEffect(() => {
    document.title = 'Channel Management | CBS';
  }, []);

  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('sessions');

  const sessionCountsQuery = useChannelSessionCounts();
  const servicePointsQuery = useAllServicePoints();
  const servicePointStatusQuery = useServicePointStatus();

  const counts = sessionCountsQuery.data;
  const points = servicePointsQuery.data ?? [];
  const totalSessions = deriveSessionTotal(counts);
  const servicePointStatus = deriveServicePointStatus(points, servicePointStatusQuery.data);
  const activeChannels = Object.values(counts ?? {}).filter((count) => count > 0).length;
  const accessiblePoints = points.filter((point) => point.isAccessible).length;
  const topChannel = useMemo(
    () =>
      Object.entries(counts ?? {}).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null,
    [counts],
  );
  const avgCapacity = points.length > 0
    ? Math.round(points.reduce((sum, point) => sum + point.maxConcurrentCustomers, 0) / points.length)
    : 0;

  return (
    <div className="page-container space-y-6">
      <section className="channel-hub-hero-shell">
        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="channel-hub-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Live channel telemetry
              </div>
              <div className="channel-hub-chip">
                <Workflow className="h-3.5 w-3.5 text-primary" />
                Service-point operations
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2.65rem]">
                Channel Management
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                Monitor active sessions across all channels and manage physical/virtual service points.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ChannelMetricCard
                label="Total Active Sessions"
                value={totalSessions.toLocaleString()}
                helper="Current live traffic across all customer channels."
                icon={Activity}
              />
              <ChannelMetricCard
                label="Channels With Traffic"
                value={activeChannels.toLocaleString()}
                helper="Channel rails carrying sessions right now."
                icon={Globe}
              />
              <ChannelMetricCard
                label="Online Service Points"
                value={servicePointStatus.online.toLocaleString()}
                helper="Branches, ATMs, kiosks, and agents currently online."
                icon={MapPin}
              />
              <ChannelMetricCard
                label="Accessible Points"
                value={accessiblePoints.toLocaleString()}
                helper="Customer-accessible service points from the live registry."
                icon={CheckCircle2}
              />
            </div>
          </div>

          <aside className="channel-hub-sidebar-shell">
            <div className="space-y-4">
              <div className="channel-hub-side-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Operational posture</p>
                <div className="mt-4 space-y-3">
                  <div className="channel-hub-side-row">
                    <span className="text-sm text-muted-foreground">Top active channel</span>
                    <span className="font-semibold">{topChannel ? formatChannelLabel(topChannel) : '—'}</span>
                  </div>
                  <div className="channel-hub-side-row">
                    <span className="text-sm text-muted-foreground">Avg point capacity</span>
                    <span className="font-semibold">{avgCapacity.toLocaleString()}</span>
                  </div>
                  <div className="channel-hub-side-row">
                    <span className="text-sm text-muted-foreground">Maintenance points</span>
                    <span className="font-semibold">{servicePointStatus.maintenance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="channel-hub-side-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Control surface</p>
                <div className="mt-4 space-y-2">
                  {QUICK_LINKS.map(({ title, description, path, icon: Icon }) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => navigate(path)}
                      className="channel-hub-quick-link"
                    >
                      <div className="flex items-start gap-3">
                        <div className="channel-hub-mini-icon h-10 w-10">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="channel-hub-workspace-shell">
        <div className="channel-hub-banner">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Operational workspace</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Run channel traffic and service-point operations from one view</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Switch between session telemetry and service-point network management using the same live backend feed.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn('channel-hub-tab-button', tab === id && 'channel-hub-tab-button-active')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  <span className="channel-hub-tab-count">
                    {id === 'sessions' ? totalSessions.toLocaleString() : points.length.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="channel-hub-content-shell">
          {tab === 'sessions' ? (
            <LiveSessionsTab
              counts={counts}
              isLoading={sessionCountsQuery.isLoading}
              dataUpdatedAt={sessionCountsQuery.dataUpdatedAt}
              isFetching={sessionCountsQuery.isFetching}
              onRefresh={() => {
                void sessionCountsQuery.refetch();
              }}
            />
          ) : (
            <ServicePointsTab
              points={points}
              isLoading={servicePointsQuery.isLoading || servicePointStatusQuery.isLoading}
              statusMap={servicePointStatusQuery.data}
            />
          )}
        </div>
      </section>
    </div>
  );
}
