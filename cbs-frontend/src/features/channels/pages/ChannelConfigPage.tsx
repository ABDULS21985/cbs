import { useState, useMemo } from 'react';
import {
  Globe,
  Smartphone,
  CreditCard,
  Building2,
  Phone,
  Radio,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  X,
  RefreshCw,
  MessageCircle,
  Store,
  UserCheck,
  Code,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useChannelConfigs, useSaveChannelConfig, useChannelSessionCounts, useCleanupSessions, useChannelSessions, useEndChannelSession } from '../hooks/useChannels';
import { useHandoffSession, useCreateSession } from '../hooks/useChannelsExt';
import type { ChannelConfig, ChannelSession } from '../api/channelApi';

// ─── Channel Icons ────────────────────────────────────────────────────────────

const CHANNEL_META: Record<string, { icon: typeof Globe; label: string; color: string }> = {
  WEB: { icon: Globe, label: 'Web', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MOBILE: { icon: Smartphone, label: 'Mobile', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ATM: { icon: CreditCard, label: 'ATM', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  BRANCH: { icon: Building2, label: 'Branch', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  USSD: { icon: Phone, label: 'USSD', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  IVR: { icon: Radio, label: 'IVR', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  POS: { icon: Store, label: 'POS', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  AGENT: { icon: UserCheck, label: 'Agent', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  API: { icon: Code, label: 'API', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
};

// ─── Edit Config Dialog ───────────────────────────────────────────────────────

interface EditConfigDialogProps {
  config: ChannelConfig;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Partial<ChannelConfig>) => void;
  isPending: boolean;
}

function EditConfigDialog({ config, open, onClose, onSave, isPending }: EditConfigDialogProps) {
  const [form, setForm] = useState({
    displayName: config.displayName,
    isEnabled: config.isEnabled,
    isActive: config.isActive,
    sessionTimeoutSecs: String(config.sessionTimeoutSecs),
    maxTransferAmount: config.maxTransferAmount != null ? String(config.maxTransferAmount) : '',
    dailyLimit: config.dailyLimit != null ? String(config.dailyLimit) : '',
    operatingHours: config.operatingHours,
    maintenanceWindow: config.maintenanceWindow ?? '',
    featuresEnabled: config.featuresEnabled.join(', '),
    transactionTypes: config.transactionTypes.join(', '),
  });

  if (!open) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: config.id,
      channel: config.channel,
      displayName: form.displayName,
      isEnabled: form.isEnabled,
      isActive: form.isActive,
      sessionTimeoutSecs: parseInt(form.sessionTimeoutSecs, 10) || 300,
      maxTransferAmount: form.maxTransferAmount ? parseFloat(form.maxTransferAmount) : null,
      dailyLimit: form.dailyLimit ? parseFloat(form.dailyLimit) : null,
      operatingHours: form.operatingHours,
      maintenanceWindow: form.maintenanceWindow || null,
      featuresEnabled: form.featuresEnabled
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      transactionTypes: form.transactionTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-card">
            <h2 className="text-base font-semibold">Edit Channel: {config.channel}</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
              <input
                className={inputCls}
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Session Timeout (secs)</label>
                <input
                  type="number"
                  min={60}
                  className={inputCls}
                  value={form.sessionTimeoutSecs}
                  onChange={(e) => setForm((f) => ({ ...f, sessionTimeoutSecs: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Operating Hours</label>
                <input
                  className={inputCls}
                  value={form.operatingHours}
                  onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
                  placeholder="24/7"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Transfer Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={form.maxTransferAmount}
                  onChange={(e) => setForm((f) => ({ ...f, maxTransferAmount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Daily Limit</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  value={form.dailyLimit}
                  onChange={(e) => setForm((f) => ({ ...f, dailyLimit: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Maintenance Window</label>
              <input
                className={inputCls}
                value={form.maintenanceWindow}
                onChange={(e) => setForm((f) => ({ ...f, maintenanceWindow: e.target.value }))}
                placeholder="e.g. 02:00-04:00"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Features Enabled (comma-separated)</label>
              <input
                className={inputCls}
                value={form.featuresEnabled}
                onChange={(e) => setForm((f) => ({ ...f, featuresEnabled: e.target.value }))}
                placeholder="TRANSFER, PAYMENT, BALANCE"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Transaction Types (comma-separated)</label>
              <input
                className={inputCls}
                value={form.transactionTypes}
                onChange={(e) => setForm((f) => ({ ...f, transactionTypes: e.target.value }))}
                placeholder="CREDIT, DEBIT"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isEnabled}
                  onClick={() => setForm((f) => ({ ...f, isEnabled: !f.isEnabled }))}
                  className={cn(
                    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    form.isEnabled ? 'bg-green-500' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      form.isEnabled ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={cn(
                    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    form.isActive ? 'bg-primary' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      form.isActive ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
                Active
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
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Create Session Dialog ────────────────────────────────────────────────────

interface CreateSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: {
    channel: string;
    customerId?: number;
    deviceId?: string;
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
  }) => void;
  isPending: boolean;
}

function CreateSessionDialog({ open, onClose, onSubmit, isPending }: CreateSessionDialogProps) {
  const [form, setForm] = useState({
    channel: 'WEB',
    customerId: '',
    deviceId: '',
    deviceType: '',
    ipAddress: '',
    userAgent: '',
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      channel: form.channel,
      customerId: form.customerId ? parseInt(form.customerId, 10) : undefined,
      deviceId: form.deviceId || undefined,
      deviceType: form.deviceType || undefined,
      ipAddress: form.ipAddress || undefined,
      userAgent: form.userAgent || undefined,
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
            <h2 className="text-base font-semibold">Create Channel Session</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Channel *</label>
              <select
                className={inputCls}
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
              >
                {['WEB', 'MOBILE', 'ATM', 'BRANCH', 'USSD', 'IVR', 'WHATSAPP', 'POS', 'AGENT', 'API'].map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Device ID</label>
                <input
                  className={inputCls}
                  value={form.deviceId}
                  onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Device Type</label>
                <input
                  className={inputCls}
                  value={form.deviceType}
                  onChange={(e) => setForm((f) => ({ ...f, deviceType: e.target.value }))}
                  placeholder="e.g. MOBILE, DESKTOP"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">IP Address</label>
              <input
                className={inputCls}
                value={form.ipAddress}
                onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
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
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Session
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Handoff Dialog ──────────────────────────────────────────────────────────

interface HandoffDialogProps {
  session: ChannelSession;
  open: boolean;
  onClose: () => void;
  onSubmit: (params: { sessionId: string; targetChannel: string; deviceId?: string; ipAddress?: string }) => void;
  isPending: boolean;
}

function HandoffDialog({ session, open, onClose, onSubmit, isPending }: HandoffDialogProps) {
  const [targetChannel, setTargetChannel] = useState('WEB');
  const [deviceId, setDeviceId] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  if (!open) return null;

  const channels = ['WEB', 'MOBILE', 'ATM', 'BRANCH', 'USSD', 'IVR', 'WHATSAPP', 'POS', 'AGENT', 'API'].filter(
    (ch) => ch !== session.channel,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sessionId: session.sessionId,
      targetChannel,
      deviceId: deviceId || undefined,
      ipAddress: ipAddress || undefined,
    });
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">Handoff Session</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground">
              Transferring session <span className="font-mono font-medium">{session.sessionId}</span> from{' '}
              <span className="font-semibold">{session.channel}</span>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Channel *</label>
              <select
                className={inputCls}
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value)}
              >
                {channels.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Device ID</label>
              <input
                className={inputCls}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">IP Address</label>
              <input
                className={inputCls}
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
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
                Handoff
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ─── Live Sessions Panel ──────────────────────────────────────────────────────

function LiveSessionsPanel() {
  const [sessionPage, setSessionPage] = useState(0);
  const pageSize = 20;
  const { data: counts, isLoading, refetch, isFetching, dataUpdatedAt } = useChannelSessionCounts();
  const { data: sessions = [], isLoading: sessionsLoading } = useChannelSessions({ page: sessionPage, size: pageSize });
  const { mutate: cleanup, isPending: cleaning } = useCleanupSessions();
  const { mutate: endSession } = useEndChannelSession();
  const { mutate: handoffSession, isPending: handingOff } = useHandoffSession();
  const { mutate: createSession, isPending: creatingSession } = useCreateSession();
  const [handoffTarget, setHandoffTarget] = useState<ChannelSession | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);

  const total = counts ? Object.values(counts).reduce((a, b) => a + (b as number), 0) : 0;

  const handleCleanup = () => {
    cleanup(undefined, {
      onSuccess: (data) => toast.success(`${data.expired ?? 0} expired sessions cleaned up`),
      onError: () => toast.error('Cleanup failed'),
    });
  };

  const handleEndSession = (sessionId: string) => {
    endSession(sessionId, {
      onSuccess: () => toast.success('Session ended'),
      onError: () => toast.error('Failed to end session'),
    });
  };

  const handleHandoff = (params: { sessionId: string; targetChannel: string; deviceId?: string; ipAddress?: string }) => {
    handoffSession(params, {
      onSuccess: () => {
        toast.success(`Session handed off to ${params.targetChannel}`);
        setHandoffTarget(null);
      },
      onError: () => toast.error('Handoff failed'),
    });
  };

  const handleCreateSession = (params: Parameters<typeof createSession>[0]) => {
    createSession(params, {
      onSuccess: () => {
        toast.success('Session created');
        setShowCreateSession(false);
      },
      onError: () => toast.error('Failed to create session'),
    });
  };

  return (
    <div className="space-y-5">
      {/* Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(CHANNEL_META).map(([ch, { icon: Icon, label, color }]) => {
          const count = (counts as Record<string, number> | undefined)?.[ch] ?? 0;
          return (
            <div key={ch} className="rounded-xl border bg-card p-4 flex flex-col items-center gap-2">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', color)}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <span className="text-2xl font-bold tabular-nums">{isLoading ? '—' : count}</span>
              <span className={cn('flex items-center gap-1 text-[10px] font-medium', count > 0 ? 'text-green-600' : 'text-red-500')}>
                {count > 0 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {count > 0 ? 'Active' : 'None'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Session List */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Active Sessions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{total} total across all channels</p>
          </div>
          <div className="flex items-center gap-2">
            <RoleGuard roles={['CBS_ADMIN', 'CBS_OFFICER', 'PORTAL_USER']}>
              <button
                onClick={() => setShowCreateSession(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Create Session
              </button>
            </RoleGuard>
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
        {sessionsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
            <Activity className="w-8 h-8 mb-2 opacity-40" />
            No active sessions
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Session ID', 'Customer', 'Channel', 'Device', 'IP Address', 'Started', 'Last Activity', 'Status', 'Actions'].map(
                    (h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((s: ChannelSession) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{s.sessionId}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{s.customerId ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {s.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.deviceType || '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{s.ipAddress || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.startedAt ? formatDateTime(s.startedAt) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.lastActivityAt ? formatDateTime(s.lastActivityAt) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={s.status} dot />
                    </td>
                    <td className="px-4 py-2.5">
                      {s.status === 'ACTIVE' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHandoffTarget(s)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Handoff
                          </button>
                          <button
                            onClick={() => handleEndSession(s.sessionId)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            End
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sessions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2 border-t">
            <p className="text-xs text-muted-foreground">
              Page {sessionPage + 1} — showing {sessions.length} sessions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSessionPage((p) => Math.max(0, p - 1))}
                disabled={sessionPage === 0}
                className="px-2.5 py-1 rounded border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setSessionPage((p) => p + 1)}
                disabled={sessions.length < pageSize}
                className="px-2.5 py-1 rounded border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {dataUpdatedAt > 0 && (
          <p className="text-[10px] text-muted-foreground px-5 py-2 border-t">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {handoffTarget && (
        <HandoffDialog
          session={handoffTarget}
          open={!!handoffTarget}
          onClose={() => setHandoffTarget(null)}
          onSubmit={handleHandoff}
          isPending={handingOff}
        />
      )}

      <CreateSessionDialog
        open={showCreateSession}
        onClose={() => setShowCreateSession(false)}
        onSubmit={handleCreateSession}
        isPending={creatingSession}
      />
    </div>
  );
}

// ─── Channel Config Tab ───────────────────────────────────────────────────────

function ChannelConfigTab() {
  const { data: configs = [], isLoading } = useChannelConfigs();
  const { mutate: saveConfig, isPending } = useSaveChannelConfig();
  const [editingConfig, setEditingConfig] = useState<ChannelConfig | null>(null);

  const enabledCount = configs.filter((c) => c.isEnabled && c.isActive).length;

  const handleSave = (updated: Partial<ChannelConfig>) => {
    saveConfig(updated, {
      onSuccess: () => {
        toast.success('Channel configuration saved');
        setEditingConfig(null);
      },
      onError: () => toast.error('Failed to save configuration'),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Channels" value={configs.length} format="number" icon={Settings} loading={isLoading} />
        <StatCard label="Enabled" value={enabledCount} format="number" icon={CheckCircle2} loading={isLoading} />
        <StatCard label="Disabled" value={configs.length - enabledCount} format="number" icon={XCircle} loading={isLoading} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Channel Configuration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure limits, timeouts, features, and operating parameters per channel
          </p>
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
                  {[
                    'Channel',
                    'Display Name',
                    'Timeout (s)',
                    'Max Transfer',
                    'Daily Limit',
                    'Operating Hours',
                    'Maintenance',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {configs.map((cfg) => {
                  const meta = CHANNEL_META[cfg.channel];
                  const Icon = meta?.icon ?? Settings;
                  const color = meta?.color ?? '';
                  return (
                    <tr key={cfg.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-mono text-xs font-medium">{cfg.channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{cfg.displayName}</td>
                      <td className="px-4 py-3 tabular-nums text-sm">{cfg.sessionTimeoutSecs}s</td>
                      <td className="px-4 py-3 text-sm">
                        {cfg.maxTransferAmount != null ? formatMoney(cfg.maxTransferAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {cfg.dailyLimit != null ? formatMoney(cfg.dailyLimit) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{cfg.operatingHours}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {cfg.maintenanceWindow ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {cfg.isEnabled && cfg.isActive ? (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleGuard roles="CBS_ADMIN">
                          <button
                            onClick={() => setEditingConfig(cfg)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
                          >
                            <Settings className="w-3 h-3" />
                            Edit
                          </button>
                        </RoleGuard>
                      </td>
                    </tr>
                  );
                })}
                {configs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No channel configurations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingConfig && (
        <EditConfigDialog
          config={editingConfig}
          open={!!editingConfig}
          onClose={() => setEditingConfig(null)}
          onSave={handleSave}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'sessions' | 'config';

const TABS: Array<{ id: Tab; label: string; icon: typeof Activity }> = [
  { id: 'sessions', label: 'Live Sessions', icon: Activity },
  { id: 'config', label: 'Channel Config', icon: Settings },
];

export function ChannelConfigPage() {
  const [tab, setTab] = useState<Tab>('sessions');

  return (
    <>
      <PageHeader
        title="Channel Configuration"
        subtitle="Monitor active sessions, configure channel limits, timeouts, and feature flags."
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

        {tab === 'sessions' && <LiveSessionsPanel />}
        {tab === 'config' && <ChannelConfigTab />}
      </div>
    </>
  );
}
