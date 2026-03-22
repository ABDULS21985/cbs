import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Shield, ShieldAlert, AlertTriangle, Eye, FileWarning, Bell, ArrowUpRight,
  CheckCircle, XCircle, Plus, Loader2, X, Search, Activity,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatRelative, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useAmlAlerts, useAmlActiveRules, useAmlDashboard, useAmlStats,
  useAmlStrs, useAmlCtrs,
  useCreateAmlRule, useToggleAmlRule, useAssignAmlAlert, useEscalateAmlAlert,
  useFileSar, useDismissAmlAlert, useFileStr,
} from '../hooks/useAml';
import type {
  AmlAlert, AmlAlertStatus, AmlRuleCategory, AmlSeverity, AmlRule, CreateAmlRulePayload, FileStrPayload,
} from '../types/aml';

// ── Constants ───────────────────────────────────────────────────────────────

const ALL_STATUSES: AmlAlertStatus[] = ['NEW', 'UNDER_REVIEW', 'ESCALATED', 'SAR_FILED', 'FALSE_POSITIVE', 'CLOSED', 'ARCHIVED'];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ESCALATED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SAR_FILED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  CLOSED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white animate-pulse',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const CATEGORY_COLORS: Record<string, string> = {
  STRUCTURING: 'bg-red-50 text-red-700 dark:bg-red-900/20', VELOCITY: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20',
  LARGE_CASH: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20', ROUND_AMOUNT: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20',
  HIGH_RISK_COUNTRY: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20', PEP: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20',
  DORMANT_REACTIVATION: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20', UNUSUAL_PATTERN: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20',
  LAYERING: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20', RAPID_MOVEMENT: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20',
  CUSTOM: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20',
};

const PIE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280', '#10b981', '#94a3b8'];

const RULE_CATEGORIES: { value: AmlRuleCategory; label: string; desc: string }[] = [
  { value: 'STRUCTURING', label: 'Structuring', desc: 'Multiple near-threshold transactions to avoid reporting' },
  { value: 'VELOCITY', label: 'Velocity', desc: 'High volume of transactions in short period' },
  { value: 'LARGE_CASH', label: 'Large Cash', desc: 'Single large cash transaction exceeding threshold' },
  { value: 'ROUND_AMOUNT', label: 'Round Amount', desc: 'Multiple round-amount transactions' },
  { value: 'HIGH_RISK_COUNTRY', label: 'High Risk Country', desc: 'Transactions involving high-risk jurisdictions' },
  { value: 'PEP', label: 'PEP', desc: 'Transactions by Politically Exposed Persons' },
  { value: 'DORMANT_REACTIVATION', label: 'Dormant Reactivation', desc: 'Large transaction on long-dormant account' },
  { value: 'UNUSUAL_PATTERN', label: 'Unusual Pattern', desc: 'Transaction pattern deviating from profile' },
  { value: 'LAYERING', label: 'Layering', desc: 'Complex transaction chains to obscure fund origin' },
  { value: 'RAPID_MOVEMENT', label: 'Rapid Movement', desc: 'Funds moved in and out rapidly' },
  { value: 'CUSTOM', label: 'Custom', desc: 'Custom rule with manual configuration' },
];

// ── Pipeline Flow ───────────────────────────────────────────────────────────

function AlertPipeline({ stats, activeStatus, onSelect }: { stats: Record<string, number>; activeStatus: string; onSelect: (s: string) => void }) {
  const stages = [
    { key: 'NEW', label: 'New', color: 'border-red-300 bg-red-50 dark:bg-red-900/20' },
    { key: 'UNDER_REVIEW', label: 'Review', color: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' },
    { key: 'ESCALATED', label: 'Escalated', color: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' },
    { key: 'SAR_FILED', label: 'SAR Filed', color: 'border-purple-300 bg-purple-50 dark:bg-purple-900/20' },
    { key: 'FALSE_POSITIVE', label: 'False +ve', color: 'border-gray-300 bg-gray-50 dark:bg-gray-800/30' },
    { key: 'CLOSED', label: 'Closed', color: 'border-green-300 bg-green-50 dark:bg-green-900/20' },
  ];
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {stages.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <button onClick={() => onSelect(s.key)}
            className={cn('rounded-lg border-2 px-4 py-2.5 text-center transition-all min-w-[90px]', s.color,
              activeStatus === s.key && 'ring-2 ring-primary ring-offset-1 shadow-md')}>
            <div className="text-lg font-bold">{stats[s.key] ?? 0}</div>
            <div className="text-[10px] font-medium">{s.label}</div>
          </button>
          {i < stages.length - 1 && <div className="w-6 h-0.5 bg-border flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function AmlDashboardPage() {
  useEffect(() => { document.title = 'AML/CFT Monitoring | CBS'; }, []);
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showFileStr, setShowFileStr] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ id: number } | null>(null);
  const [assignTo, setAssignTo] = useState('');

  // Data
  const { data: dashboard, isError: dashboardError } = useAmlDashboard();
  const { data: stats, isError: statsError } = useAmlStats();
  const { data: alerts = [], isLoading: alertsLoading, isError: alertsError } = useAmlAlerts(statusFilter ? { status: statusFilter } : undefined);
  const { data: rules = [], isLoading: rulesLoading, isError: rulesError } = useAmlActiveRules();
  const { data: strs = [], isError: strsError } = useAmlStrs();
  const { data: ctrs = [], isError: ctrsError } = useAmlCtrs();

  // Mutations
  const createRule = useCreateAmlRule();
  const toggleRule = useToggleAmlRule();
  const assignAlert = useAssignAmlAlert();
  const escalateAlert = useEscalateAmlAlert();
  const fileSar = useFileSar();
  const dismissAlert = useDismissAmlAlert();
  const fileStr = useFileStr();

  // Rule form
  const [ruleForm, setRuleForm] = useState<Partial<CreateAmlRulePayload>>({
    ruleCategory: 'STRUCTURING', severity: 'HIGH', thresholdPeriodHours: 24, currencyCode: 'NGN',
    applicableCustomerTypes: ['ALL'], applicableChannels: ['ALL'], ruleConfig: {},
  });

  // STR form
  const [strForm, setStrForm] = useState<FileStrPayload>({
    customerId: 0, suspiciousActivity: '', reportingOfficer: 'ADMIN',
  });

  // Critical alert count
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && (a.status === 'NEW' || a.status === 'ESCALATED'));
  const byStatus = stats?.byStatus ?? {};

  // Alert table columns
  const alertColumns = useMemo<ColumnDef<AmlAlert, unknown>[]>(() => [
    { accessorKey: 'alertRef', header: 'Alert Ref', cell: ({ row }) => (
      <button onClick={e => { e.stopPropagation(); navigate(`/compliance/aml/alerts/${row.original.id}`); }}
        className={cn('font-mono text-xs font-medium hover:underline', row.original.severity === 'CRITICAL' ? 'text-red-600' : 'text-primary')}>
        {row.original.alertRef}
      </button>
    )},
    { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', SEVERITY_COLORS[row.original.severity])}>
        {row.original.severity}
      </span>
    )},
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => <span className="text-sm font-medium">{row.original.customerName}</span> },
    { accessorKey: 'ruleName', header: 'Rule', cell: ({ row }) => <span className="text-xs truncate max-w-[150px] block" title={row.original.ruleName}>{row.original.ruleName}</span> },
    { accessorKey: 'ruleCategory', header: 'Category', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium', CATEGORY_COLORS[row.original.ruleCategory] || CATEGORY_COLORS.CUSTOM)}>
        {row.original.ruleCategory}
      </span>
    )},
    { accessorKey: 'triggerAmount', header: 'Amount', cell: ({ row }) => (
      <span className={cn('text-sm font-mono', row.original.triggerAmount > 100000 ? 'font-bold text-red-600 dark:text-red-400' : '')}>
        {formatMoney(row.original.triggerAmount)}
      </span>
    )},
    { accessorKey: 'assignedTo', header: 'Assigned', cell: ({ row }) => row.original.assignedTo
      ? <span className="text-xs">{row.original.assignedTo}</span>
      : <span className="text-xs italic text-red-500">Unassigned</span>
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[row.original.status])}>
        {row.original.status.replace(/_/g, ' ')}
      </span>
    )},
    { accessorKey: 'createdAt', header: 'Age', cell: ({ row }) => {
      const age = formatRelative(row.original.createdAt);
      const hours = (Date.now() - new Date(row.original.createdAt).getTime()) / 3600000;
      return <span className={cn('text-xs', hours > 24 && row.original.status === 'NEW' ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>{age}</span>;
    }},
  ], [navigate]);

  const fc = 'w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <>
      <PageHeader title="AML/CFT Monitoring" subtitle="Anti-Money Laundering command center"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowCreateRule(true)} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted">
              <Plus className="w-4 h-4" /> Create Rule
            </button>
            <button onClick={() => setShowFileStr(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              <FileWarning className="w-4 h-4" /> File STR
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {(dashboardError || statsError || alertsError || rulesError || strsError || ctrsError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            One or more AML datasets could not be loaded from the backend.
          </div>
        )}
        {/* Critical alert banner */}
        {criticalAlerts.length > 0 && (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20 px-5 py-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">{criticalAlerts.length} CRITICAL AML alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention</p>
                <p className="text-xs text-red-600/80 mt-0.5">Regulatory obligation: respond within 24 hours</p>
              </div>
            </div>
            <button onClick={() => setStatusFilter('NEW')} className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700">View Now</button>
          </div>
        )}

        {/* Dashboard stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => setStatusFilter('NEW')} className="text-left"><StatCard label="New Alerts" value={dashboardError ? '--' : dashboard?.newAlerts ?? 0} format="number" icon={Bell} loading={!dashboard && !dashboardError} /></button>
          <button onClick={() => setStatusFilter('UNDER_REVIEW')} className="text-left"><StatCard label="Under Review" value={dashboardError ? '--' : dashboard?.underReview ?? 0} format="number" icon={Eye} loading={!dashboard && !dashboardError} /></button>
          <button onClick={() => setStatusFilter('ESCALATED')} className="text-left"><StatCard label="Escalated" value={dashboardError ? '--' : dashboard?.escalated ?? 0} format="number" icon={ArrowUpRight} loading={!dashboard && !dashboardError} /></button>
          <button onClick={() => setStatusFilter('SAR_FILED')} className="text-left"><StatCard label="SAR Filed" value={dashboardError ? '--' : dashboard?.sarFiled ?? 0} format="number" icon={FileWarning} loading={!dashboard && !dashboardError} /></button>
        </div>

        {/* Pipeline */}
        <AlertPipeline stats={byStatus} activeStatus={statusFilter} onSelect={s => setStatusFilter(statusFilter === s ? '' : s)} />

        {/* Tabs */}
        <TabsPage syncWithUrl tabs={[
          { id: 'alerts', label: 'Alerts', content: (
            <div className="p-4 space-y-4">
              {alertsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  AML alerts could not be loaded from the backend.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStatusFilter('')} className={cn('px-3 py-1 text-xs font-medium rounded-lg border', !statusFilter ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>All</button>
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1 text-xs font-medium rounded-lg border', statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>{s.replace(/_/g, ' ')}</button>
                ))}
              </div>
              <DataTable columns={alertColumns} data={alerts} isLoading={alertsLoading} enableGlobalFilter enableExport exportFilename="aml-alerts" pageSize={15}
                onRowClick={row => navigate(`/compliance/aml/alerts/${row.id}`)} emptyMessage="No alerts found" />
            </div>
          )},

          { id: 'rules', label: 'Rules', content: (
            <div className="p-4">
              {rulesError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  AML rules could not be loaded from the backend.
                </div>
              )}
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 border-b">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Rule Name</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Severity</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Threshold</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Count</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Period (h)</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Active</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {(rules as AmlRule[]).map(r => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{r.ruleCode}</td>
                        <td className="px-4 py-3 font-medium">{r.ruleName}</td>
                        <td className="px-4 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium', CATEGORY_COLORS[r.ruleCategory])}>{r.ruleCategory}</span></td>
                        <td className="px-4 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', SEVERITY_COLORS[r.severity])}>{r.severity}</span></td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(r.thresholdAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.thresholdCount}</td>
                        <td className="px-4 py-3 text-right font-mono">{r.thresholdPeriodHours}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleRule.mutate(r.id)} className={cn('w-10 h-5 rounded-full transition-colors relative', r.isActive ? 'bg-primary' : 'bg-gray-300')}>
                            <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', r.isActive ? 'left-5' : 'left-0.5')} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )},

          { id: 'str', label: 'STR/SAR Filing', content: (
            <div className="p-4">
              {strsError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  STR filings could not be loaded from the backend.
                </div>
              )}
              <DataTable columns={[
                { accessorKey: 'sarReference', header: 'STR Ref', cell: ({ row }) => <span className="font-mono text-xs">{(row.original as AmlAlert).sarReference ?? '—'}</span> },
                { accessorKey: 'customerName', header: 'Customer' },
                { accessorKey: 'description', header: 'Activity', cell: ({ row }) => <span className="text-xs max-w-[200px] block truncate">{(row.original as AmlAlert).description ?? '—'}</span> },
                { accessorKey: 'triggerAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono">{formatMoney((row.original as AmlAlert).triggerAmount ?? 0)}</span> },
                { accessorKey: 'resolvedBy', header: 'Officer', cell: ({ row }) => <span className="text-xs">{(row.original as AmlAlert).resolvedBy ?? '—'}</span> },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={(row.original as AmlAlert).status ?? ''} /> },
              ] as ColumnDef<AmlAlert, unknown>[]} data={strs} enableGlobalFilter emptyMessage="No STRs filed" />
            </div>
          )},

          { id: 'ctr', label: 'CTR', content: (
            <div className="p-4">
              {ctrsError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  CTR data could not be loaded from the backend.
                </div>
              )}
              <DataTable columns={[
                { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <span className="text-xs">{formatDate((row.original as AmlAlert).createdAt ?? '')}</span> },
                { accessorKey: 'customerName', header: 'Customer' },
                { accessorKey: 'triggerAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono font-bold">{formatMoney((row.original as AmlAlert).triggerAmount ?? 0)}</span> },
                { accessorKey: 'alertRef', header: 'Alert Ref', cell: ({ row }) => <span className="font-mono text-xs">{(row.original as AmlAlert).alertRef}</span> },
                { accessorKey: 'triggerCount', header: 'Txn Count' },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={(row.original as AmlAlert).status ?? ''} /> },
              ] as ColumnDef<AmlAlert, unknown>[]} data={ctrs} enableGlobalFilter emptyMessage="No CTRs" />
            </div>
          )},

          { id: 'analytics', label: 'Analytics', content: (
            <div className="p-4 space-y-6">
              {statsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  AML analytics could not be loaded from the backend.
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="text-sm font-semibold mb-4">Alerts by Category</h3>
                  {stats?.byStatus ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={Object.entries(stats.byStatus).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} className="fill-muted-foreground" />
                        <Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>}
                </div>
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="text-sm font-semibold mb-4">Alerts by Status</h3>
                  {stats?.byStatus ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={Object.entries(stats.byStatus).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {Object.keys(stats.byStatus).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>}
                </div>
              </div>
            </div>
          )},
        ]} />
      </div>

      {/* ── Create Rule Dialog ────────────────────────────────────────────── */}
      {showCreateRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowCreateRule(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 rounded-xl bg-background border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-base font-semibold">Create AML Rule</h2>
              <button onClick={() => setShowCreateRule(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Rule Name *</label>
                <input value={ruleForm.ruleName ?? ''} onChange={e => setRuleForm(p => ({ ...p, ruleName: e.target.value }))} className={fc} /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Category *</label>
                <select value={ruleForm.ruleCategory} onChange={e => setRuleForm(p => ({ ...p, ruleCategory: e.target.value as AmlRuleCategory }))} className={fc}>
                  {RULE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label} — {c.desc}</option>)}
                </select></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea value={ruleForm.description ?? ''} onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))} rows={3} className={fc} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Threshold Amount</label>
                  <input type="number" value={ruleForm.thresholdAmount ?? ''} onChange={e => setRuleForm(p => ({ ...p, thresholdAmount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Threshold Count</label>
                  <input type="number" value={ruleForm.thresholdCount ?? ''} onChange={e => setRuleForm(p => ({ ...p, thresholdCount: Number(e.target.value) }))} className={cn(fc, 'font-mono')} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Period (hours)</label>
                  <input type="number" value={ruleForm.thresholdPeriodHours ?? ''} onChange={e => setRuleForm(p => ({ ...p, thresholdPeriodHours: Number(e.target.value) }))} className={cn(fc, 'font-mono')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Severity</label>
                  <select value={ruleForm.severity} onChange={e => setRuleForm(p => ({ ...p, severity: e.target.value as AmlSeverity }))} className={fc}>
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <select value={ruleForm.currencyCode} onChange={e => setRuleForm(p => ({ ...p, currencyCode: e.target.value }))} className={fc}>
                    {['NGN', 'USD', 'EUR', 'GBP', 'KES'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setShowCreateRule(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => createRule.mutate(ruleForm as CreateAmlRulePayload, { onSuccess: () => { toast.success('AML rule created'); setShowCreateRule(false); } })}
                  disabled={!ruleForm.ruleName || createRule.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                  {createRule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Create Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── File STR Dialog ───────────────────────────────────────────────── */}
      {showFileStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 modal-scrim" onClick={() => setShowFileStr(false)} />
          <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-background border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-semibold text-red-700">File Suspicious Transaction Report</h2>
              <button onClick={() => setShowFileStr(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Customer ID *</label>
                  <input type="number" value={strForm.customerId || ''} onChange={e => setStrForm(p => ({ ...p, customerId: Number(e.target.value) }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Account ID</label>
                  <input type="number" value={strForm.accountId ?? ''} onChange={e => setStrForm(p => ({ ...p, accountId: Number(e.target.value) || undefined }))} className={fc} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Transaction Ref</label>
                  <input value={strForm.transactionRef ?? ''} onChange={e => setStrForm(p => ({ ...p, transactionRef: e.target.value }))} className={fc} /></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Amount</label>
                  <input type="number" step="0.01" value={strForm.amount ?? ''} onChange={e => setStrForm(p => ({ ...p, amount: Number(e.target.value) || undefined }))} className={cn(fc, 'font-mono')} /></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Suspicious Activity * <span className="text-muted-foreground">(min 50 chars)</span></label>
                <textarea value={strForm.suspiciousActivity} onChange={e => setStrForm(p => ({ ...p, suspiciousActivity: e.target.value }))} rows={5} className={fc}
                  placeholder="Describe the suspicious activity in detail including patterns observed, amounts, dates, and counterparties" />
                <p className="text-xs text-muted-foreground">{strForm.suspiciousActivity.length}/50 characters minimum</p>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => setShowFileStr(false)} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
                <button onClick={() => fileStr.mutate(strForm, { onSuccess: () => { toast.success('STR filed successfully'); setShowFileStr(false); } })}
                  disabled={!strForm.customerId || strForm.suspiciousActivity.length < 50 || fileStr.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                  {fileStr.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileWarning className="w-4 h-4" />} File STR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
