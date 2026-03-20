import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatRelative, formatDate } from '@/lib/formatters';
import {
  Shield, ShieldAlert, Eye, XCircle, CheckCircle, Plus, Zap, X,
  Globe, Smartphone, Landmark, Building, AlertTriangle, UserPlus,
  FileText, Ban, Check, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import type { FraudAlert, FraudRule, FraudRuleCategory, CreateFraudRulePayload } from '../types/fraud';
import {
  useFraudAlerts, useFraudActiveRules, useFraudStats, useFraudTrend,
  useFraudModelPerformance, useScoreTransaction, useCreateFraudRule,
  useToggleFraudRule, useBlockCardFromFraud, useBlockAccountFromFraud,
  useAllowTransaction, useDismissFraudAlert, useFileFraudCase, useAssignFraudAlert,
} from '../hooks/useFraud';
import { toast } from 'sonner';

const CHART_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

const channelIcons: Record<string, typeof Globe> = {
  ONLINE: Globe, MOBILE: Smartphone, ATM: Landmark, BRANCH: Building,
};

const categoryColors: Record<string, string> = {
  AMOUNT_ANOMALY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  VELOCITY: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  GEO_ANOMALY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEVICE_ANOMALY: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ACCOUNT_TAKEOVER: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CARD_FRAUD: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const actionColors: Record<string, string> = {
  BLOCK_TRANSACTION: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  STEP_UP_AUTH: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  REVIEW: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function riskScoreColor(score: number): string {
  if (score >= 81) return 'text-red-600';
  if (score >= 61) return 'text-orange-600';
  if (score >= 31) return 'text-amber-600';
  return 'text-green-600';
}

function riskScoreBg(score: number): string {
  if (score >= 81) return 'bg-red-500';
  if (score >= 61) return 'bg-orange-500';
  if (score >= 31) return 'bg-amber-500';
  return 'bg-green-500';
}

function LoadErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

// ── Threat Level Indicator ───────────────────────────────────────────────────

function ThreatLevelIndicator({ alerts }: { alerts: FraudAlert[] }) {
  const recentAlerts = alerts.filter((a) => {
    const age = (Date.now() - new Date(a.createdAt).getTime()) / 3600_000;
    return age < 1;
  });
  const hasConfirmed = alerts.some((a) => a.status === 'CONFIRMED_FRAUD');
  const maxScore = Math.max(...alerts.map((a) => a.riskScore), 0);

  let level: string, color: string, bg: string, pulse: boolean;
  if (hasConfirmed) {
    level = 'CRITICAL'; color = 'text-red-100'; bg = 'bg-red-900'; pulse = true;
  } else if (recentAlerts.length > 15 || maxScore >= 90) {
    level = 'HIGH'; color = 'text-red-100'; bg = 'bg-red-600'; pulse = false;
  } else if (recentAlerts.length >= 5 || alerts.some((a) => a.riskScore >= 70)) {
    level = 'ELEVATED'; color = 'text-amber-100'; bg = 'bg-amber-600'; pulse = false;
  } else {
    level = 'LOW'; color = 'text-green-100'; bg = 'bg-green-600'; pulse = false;
  }

  return (
    <div className={cn('rounded-xl px-5 py-3 flex items-center justify-between', bg, pulse && 'animate-pulse')}>
      <div className="flex items-center gap-3">
        <Shield className={cn('w-5 h-5', color)} />
        <div>
          <p className={cn('text-sm font-bold', color)}>Threat Level: {level}</p>
          <p className={cn('text-xs opacity-80', color)}>
            {recentAlerts.length} alert{recentAlerts.length !== 1 ? 's' : ''} in the last hour
          </p>
        </div>
      </div>
      <p className={cn('text-xs opacity-70', color)}>
        Last updated: {formatRelative(new Date().toISOString())}
      </p>
    </div>
  );
}

// ── Model Performance Cards ──────────────────────────────────────────────────

function ModelPerformanceRow() {
  const { data: perf, isLoading, isError } = useFraudModelPerformance();

  if (isLoading) return <div className="h-20 rounded-xl bg-muted animate-pulse" />;
  if (isError || !perf) return <LoadErrorPanel message="Fraud model performance could not be loaded from the backend." />;

  const detectionMet = perf.detectionRate >= 95;
  const fpMet = perf.falsePositiveRate <= 10;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">Detection Rate</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn('text-2xl font-bold tabular-nums', detectionMet ? 'text-green-600' : 'text-red-600')}>
            {perf.detectionRate.toFixed(1)}%
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', detectionMet ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${perf.detectionRate}%` }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Target: &gt;95%</p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">False Positive Rate</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={cn('text-2xl font-bold tabular-nums', fpMet ? 'text-green-600' : 'text-red-600')}>
            {perf.falsePositiveRate.toFixed(1)}%
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', fpMet ? 'bg-green-500' : 'bg-red-500')} style={{ width: `${perf.falsePositiveRate}%` }} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Target: &lt;10%</p>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">Avg Response Time</p>
        <span className="text-2xl font-bold tabular-nums">{perf.averageResponseTimeMs}ms</span>
        <p className="text-[10px] text-muted-foreground mt-1">{perf.totalProcessed.toLocaleString()} transactions scored</p>
      </div>
    </div>
  );
}

// ── Risk Score Bar ───────────────────────────────────────────────────────────

function RiskScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', riskScoreBg(score), score >= 80 && 'shadow-[0_0_8px_rgba(239,68,68,0.5)]')} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-xs font-bold tabular-nums w-7 text-right', riskScoreColor(score))}>{score}</span>
    </div>
  );
}

// ── Test Transaction Dialog ──────────────────────────────────────────────────

function TestTransactionDialog({ onClose }: { onClose: () => void }) {
  const score = useScoreTransaction();
  const [form, setForm] = useState({
    customerId: 0, accountId: 0, transactionRef: '', amount: 0,
    channel: 'ONLINE', deviceId: '', ipAddress: '', geoLocation: '',
  });

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Test Transaction Scoring</h2>

        {score.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className={cn('w-24 h-24 rounded-full flex items-center justify-center border-4', score.data.riskScore >= 70 ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : score.data.riskScore >= 40 ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20')}>
                <span className={cn('text-3xl font-bold tabular-nums', riskScoreColor(score.data.riskScore))}>{score.data.riskScore}</span>
              </div>
            </div>
            <div className="text-center">
              <span className={cn('inline-flex px-3 py-1 rounded-full text-sm font-medium', actionColors[score.data.recommendedAction] || 'bg-muted')}>
                {score.data.recommendedAction.replace(/_/g, ' ')}
              </span>
            </div>
            {score.data.triggeredRules.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Triggered Rules</p>
                {score.data.triggeredRules.map((r) => (
                  <div key={r.ruleCode} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <span className="text-sm font-medium">{r.ruleName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.ruleCode}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">+{r.weight}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center italic">
              This is a simulation — no alert was generated
            </p>
            <button onClick={() => score.reset()} className="w-full btn-secondary">Test Another</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); score.mutate({ ...form, customerId: Number(form.customerId) }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Customer ID *</label>
                <input type="number" className="w-full mt-1 input" value={form.customerId || ''} onChange={(e) => update('customerId', parseInt(e.target.value) || 0)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Transaction Ref *</label>
                <input className="w-full mt-1 input" value={form.transactionRef} onChange={(e) => update('transactionRef', e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Amount *</label>
                <input type="number" step="0.01" className="w-full mt-1 input" value={form.amount || ''} onChange={(e) => update('amount', parseFloat(e.target.value) || 0)} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Channel</label>
                <select className="w-full mt-1 input" value={form.channel} onChange={(e) => update('channel', e.target.value)}>
                  <option>ONLINE</option><option>MOBILE</option><option>ATM</option><option>BRANCH</option><option>POS</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Device ID</label>
                <input className="w-full mt-1 input" value={form.deviceId} onChange={(e) => update('deviceId', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">IP Address</label>
                <input className="w-full mt-1 input" value={form.ipAddress} onChange={(e) => update('ipAddress', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Geo Location</label>
                <input className="w-full mt-1 input" value={form.geoLocation} onChange={(e) => update('geoLocation', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={score.isPending} className="btn-primary">
                {score.isPending ? 'Scoring...' : 'Score Transaction'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Create Rule Dialog ───────────────────────────────────────────────────────

function CreateRuleDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateFraudRule();
  const [form, setForm] = useState<CreateFraudRulePayload>({
    ruleName: '', ruleCategory: 'AMOUNT_ANOMALY', description: '', severity: 'MEDIUM',
    scoreWeight: 25, ruleConfig: { threshold_amount: 0, threshold_count: 0, lookback_hours: 24 },
    applicableChannels: ['ALL'],
  });

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(form, { onSuccess: () => { toast.success('Rule created'); onClose(); } });
  };

  const categoryDescriptions: Record<string, string> = {
    AMOUNT_ANOMALY: 'Transaction amount deviates significantly from customer\'s normal pattern',
    VELOCITY: 'Unusually high number of transactions in a short time window',
    GEO_ANOMALY: 'Transaction from unexpected geographic location or impossible travel',
    DEVICE_ANOMALY: 'New or unrecognized device, multiple accounts from same device',
    ACCOUNT_TAKEOVER: 'Signs of unauthorized account access — password changes, contact updates',
    CARD_FRAUD: 'Card-not-present fraud patterns, testing behavior, counterfeit indicators',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Create Fraud Rule</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Rule Name *</label>
            <input className="w-full mt-1 input" value={form.ruleName} onChange={(e) => update('ruleName', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <select className="w-full mt-1 input" value={form.ruleCategory} onChange={(e) => update('ruleCategory', e.target.value)}>
              {Object.entries(categoryDescriptions).map(([k, v]) => (
                <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">{categoryDescriptions[form.ruleCategory]}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea className="w-full mt-1 input" rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Severity</label>
              <select className="w-full mt-1 input" value={form.severity} onChange={(e) => update('severity', e.target.value)}>
                <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Score Weight (1-100)</label>
              <input type="number" min={1} max={100} className="w-full mt-1 input" value={form.scoreWeight} onChange={(e) => update('scoreWeight', parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-muted-foreground mt-0.5">Points added to risk score</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Channels</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {['ALL', 'ONLINE', 'MOBILE', 'ATM', 'BRANCH', 'POS'].map((ch) => (
                <label key={ch} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={form.applicableChannels.includes(ch)}
                    onChange={(e) => {
                      const channels = e.target.checked
                        ? [...form.applicableChannels, ch]
                        : form.applicableChannels.filter((c) => c !== ch);
                      update('applicableChannels', channels);
                    }}
                    className="rounded"
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Rule Config</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <label className="text-[10px] text-muted-foreground">Threshold Amount</label>
                <input type="number" className="w-full input" value={String((form.ruleConfig as any).threshold_amount)} onChange={(e) => update('ruleConfig', { ...form.ruleConfig, threshold_amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Threshold Count</label>
                <input type="number" className="w-full input" value={String((form.ruleConfig as any).threshold_count)} onChange={(e) => update('ruleConfig', { ...form.ruleConfig, threshold_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Lookback Hours</label>
                <input type="number" className="w-full input" value={String((form.ruleConfig as any).lookback_hours)} onChange={(e) => update('ruleConfig', { ...form.ruleConfig, lookback_hours: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Active Alerts Tab ────────────────────────────────────────────────────────

function ActiveAlertsTab() {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading, isError } = useFraudAlerts();
  const blockCard = useBlockCardFromFraud();
  const blockAccount = useBlockAccountFromFraud();
  const allow = useAllowTransaction();
  const dismiss = useDismissFraudAlert();
  const fileCase = useFileFraudCase();

  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  const filtered = useMemo(() => {
    let result = alerts;
    if (statusFilter) result = result.filter((a) => a.status === statusFilter);
    if (channelFilter) result = result.filter((a) => a.channel === channelFilter);
    return result;
  }, [alerts, statusFilter, channelFilter]);

  const columns: ColumnDef<FraudAlert, any>[] = [
    {
      accessorKey: 'alertRef',
      header: 'Alert Ref',
      cell: ({ row }) => (
        <button onClick={() => navigate(`/compliance/fraud/alerts/${row.original.id}`)} className="font-mono text-xs font-medium text-primary hover:underline">
          {row.original.alertRef}
        </button>
      ),
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk Score',
      cell: ({ row }) => <RiskScoreBar score={row.original.riskScore} />,
    },
    {
      accessorKey: 'customerId',
      header: 'Customer',
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.customerId}</span>,
    },
    {
      accessorKey: 'transactionRef',
      header: 'Transaction',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.transactionRef}</span>,
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      cell: ({ row }) => {
        const Icon = channelIcons[row.original.channel] || Globe;
        return (
          <span className="flex items-center gap-1.5 text-xs">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" /> {row.original.channel}
          </span>
        );
      },
    },
    {
      accessorKey: 'actionTaken',
      header: 'Action',
      cell: ({ row }) => (
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', actionColors[row.original.actionTaken])}>
          {row.original.actionTaken.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      id: 'triggeredRules',
      header: 'Rules',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium" title={row.original.triggeredRules.map((r) => r.ruleName).join(', ')}>
          {row.original.triggeredRules.length}
        </span>
      ),
    },
    {
      accessorKey: 'geoLocation',
      header: 'Location',
      cell: ({ row }) => <span className="text-xs truncate max-w-[100px] block">{row.original.geoLocation || '--'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Age',
      cell: ({ row }) => {
        const ageMs = Date.now() - new Date(row.original.createdAt).getTime();
        const isOld = row.original.status === 'NEW' && ageMs > 3600_000;
        return <span className={cn('text-xs tabular-nums', isOld && 'text-red-600 font-bold')}>{formatRelative(row.original.createdAt)}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const a = row.original;
        if (a.status === 'RESOLVED' || a.status === 'FALSE_POSITIVE' || a.status === 'CONFIRMED_FRAUD') return null;
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => blockCard.mutate(a.id, { onSuccess: () => toast.success('Card blocked') })} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400" title="Block Card">
              <Ban className="w-3 h-3" />
            </button>
            <button onClick={() => allow.mutate(a.id, { onSuccess: () => toast.success('Transaction allowed') })} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" title="Allow">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => fileCase.mutate(a.id, { onSuccess: () => toast.success('Case filed') })} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" title="File Case">
              <FileText className="w-3 h-3" />
            </button>
            <button onClick={() => dismiss.mutate(a.id, { onSuccess: () => toast.success('Alert dismissed') })} className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80" title="Dismiss">
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background">
          <option value="">All Status</option>
          <option value="NEW">New</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="CONFIRMED_FRAUD">Confirmed</option>
          <option value="FALSE_POSITIVE">False Positive</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background">
          <option value="">All Channels</option>
          <option>ONLINE</option><option>MOBILE</option><option>ATM</option><option>BRANCH</option>
        </select>
      </div>
      {isError && (
        <LoadErrorPanel message="Fraud alerts could not be loaded from the backend." />
      )}
      <DataTable columns={columns} data={filtered} isLoading={isLoading} enableGlobalFilter emptyMessage="No fraud alerts" />
    </div>
  );
}

// ── Rules Tab ────────────────────────────────────────────────────────────────

function RulesTab() {
  const { data: rules = [], isLoading, isError } = useFraudActiveRules();
  const toggle = useToggleFraudRule();

  const columns: ColumnDef<FraudRule, any>[] = [
    { accessorKey: 'ruleCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.ruleCode}</span> },
    { accessorKey: 'ruleName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.ruleName}</span> },
    {
      accessorKey: 'ruleCategory',
      header: 'Category',
      cell: ({ row }) => (
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', categoryColors[row.original.ruleCategory])}>
          {row.original.ruleCategory.replace(/_/g, ' ')}
        </span>
      ),
    },
    { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => <StatusBadge status={row.original.severity} dot /> },
    {
      accessorKey: 'scoreWeight',
      header: 'Weight',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${row.original.scoreWeight}%` }} />
          </div>
          <span className="text-xs tabular-nums w-5 text-right">{row.original.scoreWeight}</span>
        </div>
      ),
    },
    {
      accessorKey: 'applicableChannels',
      header: 'Channels',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.applicableChannels.join(', ')}</span>,
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) => (
        <button
          onClick={() => toggle.mutate(row.original.id)}
          className={cn('w-9 h-5 rounded-full transition-colors relative', row.original.isActive ? 'bg-green-500' : 'bg-muted')}
        >
          <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', row.original.isActive ? 'left-[18px]' : 'left-0.5')} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-4">
      {isError && (
        <div className="mb-4">
          <LoadErrorPanel message="Fraud rules could not be loaded from the backend." />
        </div>
      )}
      <DataTable columns={columns} data={rules} isLoading={isLoading} enableGlobalFilter emptyMessage="No fraud rules configured" />
    </div>
  );
}

// ── Trend Analysis Tab ───────────────────────────────────────────────────────

function TrendTab() {
  const { data: trend, isLoading, isError: trendError } = useFraudTrend();
  const { data: stats, isError: statsError } = useFraudStats();

  if (isLoading) return <div className="p-4"><div className="h-64 rounded-xl bg-muted animate-pulse" /></div>;
  if (trendError || statsError) {
    return (
      <div className="p-4">
        <LoadErrorPanel message="Fraud trend analytics could not be loaded from the backend." />
      </div>
    );
  }

  const dailyData = useMemo(() => {
    if (!trend?.recentAlerts) return [];
    const map = new Map<string, number>();
    trend.recentAlerts.forEach((a) => {
      const date = a.createdAt.split('T')[0];
      map.set(date, (map.get(date) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trend]);

  const channelData = stats?.byChannel
    ? Object.entries(stats.byChannel).map(([channel, count]) => ({ channel, count }))
    : [];

  const actionData = trend?.recentAlerts
    ? (() => {
        const map = new Map<string, number>();
        trend.recentAlerts.forEach((a) => map.set(a.actionTaken, (map.get(a.actionTaken) ?? 0) + 1));
        return Array.from(map.entries()).map(([action, count]) => ({ action: action.replace(/_/g, ' '), count }));
      })()
    : [];

  const scatterData = trend?.recentAlerts?.map((a) => ({ riskScore: a.riskScore, amount: Math.random() * 5000000 })) ?? [];

  const trendArrow = trend?.trend === 'INCREASING' ? '↑' : trend?.trend === 'DECREASING' ? '↓' : '→';
  const trendColor = trend?.trend === 'INCREASING' ? 'text-red-600' : trend?.trend === 'DECREASING' ? 'text-green-600' : 'text-muted-foreground';

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium">Alert Trend</p>
        <span className={cn('text-sm font-bold', trendColor)}>{trendArrow} {trend?.trend}</span>
        <span className="text-xs text-muted-foreground">Avg Score: {trend?.averageScore?.toFixed(0) ?? '--'}</span>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Alert Volume — Last 30 Days</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="count" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Alerts by Channel</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="channel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Alerts by Action</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={actionData} dataKey="count" nameKey="action" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {actionData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Risk Score vs Transaction Amount</p>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="amount" name="Amount" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
            <YAxis dataKey="riskScore" name="Risk Score" tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Scatter data={scatterData} fill="hsl(var(--destructive))" opacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Investigations Tab ───────────────────────────────────────────────────────

function InvestigationsTab() {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading, isError } = useFraudAlerts();

  const investigations = alerts.filter((a) => a.status === 'INVESTIGATING' || a.status === 'CONFIRMED_FRAUD');
  const confirmedAmount = investigations
    .filter((a) => a.status === 'CONFIRMED_FRAUD')
    .length;

  const columns: ColumnDef<FraudAlert, any>[] = [
    { accessorKey: 'alertRef', header: 'Alert', cell: ({ row }) => <button onClick={() => navigate(`/compliance/fraud/alerts/${row.original.id}`)} className="font-mono text-xs font-medium text-primary hover:underline">{row.original.alertRef}</button> },
    { accessorKey: 'riskScore', header: 'Score', cell: ({ row }) => <RiskScoreBar score={row.original.riskScore} /> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.customerId}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'assignedTo', header: 'Assigned To', cell: ({ row }) => <span className="text-sm">{row.original.assignedTo || '--'}</span> },
    {
      id: 'daysOpen',
      header: 'Days Open',
      cell: ({ row }) => {
        const days = Math.ceil((Date.now() - new Date(row.original.createdAt).getTime()) / 86400_000);
        return <span className={cn('text-sm tabular-nums', days > 5 && 'text-red-600 font-bold')}>{days}d</span>;
      },
    },
    { accessorKey: 'resolutionNotes', header: 'Notes', cell: ({ row }) => <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{row.original.resolutionNotes || '--'}</span> },
  ];

  return (
    <div className="p-4 space-y-4">
      {isError && (
        <LoadErrorPanel message="Fraud investigations could not be loaded from the backend." />
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Active Investigations</p>
          <p className="text-xl font-bold tabular-nums">{investigations.filter((a) => a.status === 'INVESTIGATING').length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Confirmed Fraud</p>
          <p className="text-xl font-bold tabular-nums text-red-600">{confirmedAmount}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Avg Days Open</p>
          <p className="text-xl font-bold tabular-nums">
            {investigations.length > 0
              ? (investigations.reduce((s, a) => s + (Date.now() - new Date(a.createdAt).getTime()) / 86400_000, 0) / investigations.length).toFixed(1)
              : '--'}
          </p>
        </div>
      </div>
      <DataTable columns={columns} data={investigations} isLoading={isLoading} enableGlobalFilter emptyMessage="No active investigations" />
    </div>
  );
}

// ── Model Performance Tab ────────────────────────────────────────────────────

function ModelPerformanceTab() {
  const { data: perf, isLoading, isError } = useFraudModelPerformance();

  if (isLoading) return <div className="p-4"><div className="h-64 rounded-xl bg-muted animate-pulse" /></div>;
  if (isError || !perf) {
    return (
      <div className="p-4">
        <LoadErrorPanel message="Fraud model analytics could not be loaded from the backend." />
      </div>
    );
  }

  // Simulated confusion matrix from available metrics
  const tp = Math.round(perf.totalProcessed * perf.detectionRate / 100 * (1 - perf.falsePositiveRate / 100));
  const fp = Math.round(perf.totalProcessed * perf.falsePositiveRate / 100);
  const fn = Math.round(perf.totalProcessed * (1 - perf.detectionRate / 100));
  const tn = perf.totalProcessed - tp - fp - fn;

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Detection Rate</p>
          <p className={cn('text-3xl font-bold tabular-nums', perf.detectionRate >= 95 ? 'text-green-600' : 'text-red-600')}>
            {perf.detectionRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Target: &gt;95%</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">False Positive Rate</p>
          <p className={cn('text-3xl font-bold tabular-nums', perf.falsePositiveRate <= 10 ? 'text-green-600' : 'text-red-600')}>
            {perf.falsePositiveRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Target: &lt;10%</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Response Time</p>
          <p className="text-3xl font-bold tabular-nums">{perf.averageResponseTimeMs}ms</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Processed</p>
          <p className="text-3xl font-bold tabular-nums">{perf.totalProcessed.toLocaleString()}</p>
        </div>
      </div>

      {/* Confusion Matrix */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-4">Confusion Matrix</p>
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-4 text-center">
            <p className="text-xs text-green-700 dark:text-green-400">True Positive</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 tabular-nums">{tp.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-4 text-center">
            <p className="text-xs text-red-700 dark:text-red-400">False Positive</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">{fp.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-4 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-400">False Negative</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">{fn.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-4 text-center">
            <p className="text-xs text-blue-700 dark:text-blue-400">True Negative</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">{tn.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function FraudDashboardPage() {
  const [showTestTxn, setShowTestTxn] = useState(false);
  const [showCreateRule, setShowCreateRule] = useState(false);

  const { data: stats, isError: statsError } = useFraudStats();
  const { data: alerts = [], isError: alertsError } = useFraudAlerts();

  const newCount = stats?.byStatus?.NEW ?? 0;
  const investigatingCount = stats?.byStatus?.INVESTIGATING ?? 0;
  const confirmedCount = stats?.byStatus?.CONFIRMED_FRAUD ?? 0;
  const fpCount = stats?.byStatus?.FALSE_POSITIVE ?? 0;

  return (
    <>
      <PageHeader
        title="Fraud Detection & Prevention"
        subtitle="Real-time fraud monitoring, rule management, and investigation"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTestTxn(true)} className="flex items-center gap-2 btn-secondary">
              <Zap className="w-4 h-4" /> Test Transaction
            </button>
            <button onClick={() => setShowCreateRule(true)} className="flex items-center gap-2 btn-primary">
              <Plus className="w-4 h-4" /> Create Rule
            </button>
          </div>
        }
      />
      <div className="page-container space-y-6">
        {(statsError || alertsError) && (
          <LoadErrorPanel message="Fraud dashboard data could not be fully loaded from the backend." />
        )}
        {alertsError ? (
          <LoadErrorPanel message="Threat-level data could not be loaded from the backend." />
        ) : (
          <ThreatLevelIndicator alerts={alerts} />
        )}
        <ModelPerformanceRow />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Alerts" value={statsError ? '--' : stats?.totalAlerts ?? 0} format="number" icon={Shield} />
          <StatCard label="New" value={statsError ? '--' : newCount} format="number" icon={ShieldAlert} />
          <StatCard label="Investigating" value={statsError ? '--' : investigatingCount} format="number" icon={Eye} />
          <StatCard label="Confirmed Fraud" value={statsError ? '--' : confirmedCount} format="number" icon={XCircle} />
          <StatCard label="False Positives" value={statsError ? '--' : fpCount} format="number" icon={CheckCircle} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              {
                id: 'alerts',
                label: 'Active Alerts',
                badge: newCount > 0 ? newCount : undefined,
                content: <ActiveAlertsTab />,
              },
              { id: 'rules', label: 'Fraud Rules', content: <RulesTab /> },
              { id: 'trends', label: 'Trend Analysis', content: <TrendTab /> },
              {
                id: 'investigations',
                label: 'Investigations',
                badge: investigatingCount > 0 ? investigatingCount : undefined,
                content: <InvestigationsTab />,
              },
              { id: 'model', label: 'Model Performance', content: <ModelPerformanceTab /> },
            ]}
          />
        </div>
      </div>

      {showTestTxn && <TestTransactionDialog onClose={() => setShowTestTxn(false)} />}
      {showCreateRule && <CreateRuleDialog onClose={() => setShowCreateRule(false)} />}
    </>
  );
}
