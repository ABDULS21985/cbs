import { useState } from 'react';
import {
  Globe,
  Smartphone,
  CreditCard,
  Building2,
  Phone,
  Radio,
  MapPin,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Settings,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useChannelSessionCounts,
  useChannelConfigs,
  useServicePointStatus,
  useServicePointMetrics,
  useSaveChannelConfig,
  useRegisterServicePoint,
  useCleanupSessions,
} from '../hooks/useChannels';
import type { ChannelConfig, ServicePointType } from '../api/channelApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'sessions' | 'config' | 'service-points';

// ─── Channel Icons & Labels ───────────────────────────────────────────────────

const CHANNEL_META = {
  WEB: { icon: Globe, label: 'Web', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MOBILE: { icon: Smartphone, label: 'Mobile', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ATM: { icon: CreditCard, label: 'ATM', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  BRANCH: { icon: Building2, label: 'Branch', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  USSD: { icon: Phone, label: 'USSD', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  IVR: { icon: Radio, label: 'IVR', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
} as const;

const SERVICE_POINT_TYPE_COLORS: Record<ServicePointType, string> = {
  ATM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BRANCH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  KIOSK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ─── Register Service Point Dialog ────────────────────────────────────────────

interface RegisterSPDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    type: ServicePointType;
    address: string;
    lat: number;
    lng: number;
    maxCapacity: number;
  }) => void;
  isPending: boolean;
}

function RegisterSPDialog({ open, onClose, onSubmit, isPending }: RegisterSPDialogProps) {
  const [form, setForm] = useState({
    name: '',
    type: 'BRANCH' as ServicePointType,
    address: '',
    lat: '',
    lng: '',
    maxCapacity: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      type: form.type,
      address: form.address,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      maxCapacity: parseInt(form.maxCapacity, 10) || 1,
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">Register Service Point</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <input
                required
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Lekki Branch"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ServicePointType }))}
              >
                <option value="BRANCH">Branch</option>
                <option value="ATM">ATM</option>
                <option value="KIOSK">Kiosk</option>
                <option value="AGENT">Agent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
              <input
                required
                className={inputCls}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className={inputCls}
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                  placeholder="0.000000"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className={inputCls}
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                  placeholder="0.000000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Capacity</label>
              <input
                type="number"
                min={1}
                required
                className={inputCls}
                value={form.maxCapacity}
                onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
                placeholder="50"
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

  const channels = Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>;
  const total = counts
    ? channels.reduce((acc, ch) => acc + (counts[ch] ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Channel Session Bars */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold">Live Channel Sessions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total.toLocaleString()} total active sessions — refreshes every 60s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => cleanup()}
              disabled={cleaning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {cleaning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Cleanup Expired
            </button>
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
            {channels.map((ch) => {
              const { icon: Icon, label, color } = CHANNEL_META[ch];
              const count = counts?.[ch] ?? 0;
              const isUp = count > 0;
              return (
                <div key={ch} className="rounded-xl border p-4 flex flex-col items-center gap-2 hover:bg-muted/40 transition-colors">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  <span className="text-2xl font-bold tabular-nums">{count.toLocaleString()}</span>
                  <span className={cn('flex items-center gap-1 text-[10px] font-medium', isUp ? 'text-green-600' : 'text-red-500')}>
                    {isUp ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {isUp ? 'Active' : 'No sessions'}
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

// ─── Channel Config Tab ───────────────────────────────────────────────────────

function ChannelConfigTab() {
  const { data: configs = [], isLoading } = useChannelConfigs();
  const { mutate: saveConfig, isPending } = useSaveChannelConfig();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<ChannelConfig>>({});

  const startEdit = (cfg: ChannelConfig) => {
    setEditingId(cfg.id);
    setEditValues({ ...cfg });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSave = (cfg: ChannelConfig) => {
    saveConfig({ ...cfg, ...editValues }, {
      onSuccess: () => {
        setEditingId(null);
        setEditValues({});
      },
    });
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Channel Configuration</h3>
        <p className="text-xs text-muted-foreground">Manage per-channel session limits and timeouts</p>
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
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Channel</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Max Sessions</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Timeout (s)</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Maintenance Window</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Enabled</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {configs.map((cfg) => {
                const isEditing = editingId === cfg.id;
                const meta = CHANNEL_META[cfg.channelType as keyof typeof CHANNEL_META];
                const Icon = meta?.icon ?? Settings;
                const color = meta?.color ?? '';
                return (
                  <tr key={cfg.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-medium">{cfg.channelType}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          className="w-24 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={editValues.maxSessions ?? ''}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, maxSessions: parseInt(e.target.value, 10) }))
                          }
                        />
                      ) : (
                        <span className="tabular-nums">{cfg.maxSessions.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={60}
                          className="w-24 rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={editValues.timeout ?? ''}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, timeout: parseInt(e.target.value, 10) }))
                          }
                        />
                      ) : (
                        <span className="tabular-nums">{cfg.timeout}s</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {cfg.maintenanceWindow ? (
                        <span className="text-xs text-muted-foreground">
                          {cfg.maintenanceWindow.startTime}–{cfg.maintenanceWindow.endTime}
                          {cfg.maintenanceWindow.days?.length
                            ? ` (${cfg.maintenanceWindow.days.join(', ')})`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={!isEditing}
                        onClick={() =>
                          isEditing &&
                          setEditValues((v) => ({ ...v, enabled: !v.enabled }))
                        }
                        className={cn(
                          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                          (isEditing ? editValues.enabled : cfg.enabled)
                            ? 'bg-green-500'
                            : 'bg-muted',
                          !isEditing && 'cursor-default',
                        )}
                        aria-label="Toggle enabled"
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                            (isEditing ? editValues.enabled : cfg.enabled)
                              ? 'translate-x-4'
                              : 'translate-x-0',
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSave(cfg)}
                            disabled={isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(cfg)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {configs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No channel configurations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Service Points Tab ───────────────────────────────────────────────────────

function ServicePointsTab() {
  const { data: points = [], isLoading } = useServicePointStatus();
  const { data: metrics = [] } = useServicePointMetrics();
  const { mutate: register, isPending: registering } = useRegisterServicePoint();
  const [showDialog, setShowDialog] = useState(false);

  const total = points.length;
  const active = points.filter((p) => p.status === 'ACTIVE').length;
  const maintenance = points.filter((p) => p.status === 'MAINTENANCE').length;
  const avgQueue =
    metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.avgWaitTime, 0) / metrics.length)
      : 0;

  const summaryCards = [
    { label: 'Total Points', value: total, color: 'text-foreground' },
    { label: 'Active', value: active, color: 'text-green-600' },
    { label: 'Under Maintenance', value: maintenance, color: 'text-amber-600' },
    { label: 'Avg Queue Wait', value: `${avgQueue}m`, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold mt-1 tabular-nums', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Service Points</h3>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Service Point
          </button>
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {points.map((sp) => {
                  const utilization =
                    sp.maxCapacity > 0
                      ? Math.round((sp.currentLoad / sp.maxCapacity) * 100)
                      : 0;
                  const utilizationColor =
                    utilization >= 90
                      ? 'bg-red-500'
                      : utilization >= 70
                        ? 'bg-amber-500'
                        : 'bg-green-500';
                  return (
                    <tr key={sp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">{sp.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            SERVICE_POINT_TYPE_COLORS[sp.type],
                          )}
                        >
                          {sp.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-muted-foreground text-xs">{sp.address}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium',
                            sp.status === 'ACTIVE'
                              ? 'text-green-600'
                              : sp.status === 'MAINTENANCE'
                                ? 'text-amber-600'
                                : 'text-muted-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              sp.status === 'ACTIVE'
                                ? 'bg-green-500'
                                : sp.status === 'MAINTENANCE'
                                  ? 'bg-amber-500'
                                  : 'bg-gray-400',
                            )}
                          />
                          {sp.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[80px]">
                            <div
                              className={cn('h-full rounded-full transition-all', utilizationColor)}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {utilization}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {points.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
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
        onSubmit={(payload) =>
          register(payload, { onSuccess: () => setShowDialog(false) })
        }
        isPending={registering}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: 'sessions', label: 'Live Sessions', icon: Activity },
  { id: 'config', label: 'Channel Config', icon: Settings },
  { id: 'service-points', label: 'Service Points', icon: MapPin },
];

export function ChannelManagementPage() {
  const [tab, setTab] = useState<Tab>('sessions');

  return (
    <>
      <PageHeader
        title="Channel Management"
        subtitle="Monitor active sessions, configure channel limits, and manage service points."
      />
      <div className="page-container space-y-6">
        {/* Tab Bar */}
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
        {tab === 'config' && <ChannelConfigTab />}
        {tab === 'service-points' && <ServicePointsTab />}
      </div>
    </>
  );
}
