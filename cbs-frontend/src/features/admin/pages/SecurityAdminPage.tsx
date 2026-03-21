import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, TabsPage, EmptyState, ConfirmDialog } from '@/components/shared';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import {
  Shield, Key, Eye, AlertTriangle, Lock, Fingerprint,
  Plus, RotateCw, Trash2, CheckCircle, XCircle,
  Activity, FileWarning, Database, Loader2,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  securityAdminApi,
  type SecurityOverview,
  type AbacPolicy,
  type MfaEnrollment,
  type EncryptionKey,
  type SecurityEvent,
  type SiemRule,
  type MaskingPolicy,
  type PiiField,
} from '../api/securityAdminApi';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const KEYS = {
  overview: ['security-admin', 'overview'],
  abac: ['security-admin', 'abac'],
  mfa: ['security-admin', 'mfa'],
  keys: ['security-admin', 'keys'],
  events: ['security-admin', 'events'],
  siem: ['security-admin', 'siem'],
  masking: ['security-admin', 'masking'],
  pii: ['security-admin', 'pii'],
};

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: overview, isLoading } = useQuery({
    queryKey: KEYS.overview,
    queryFn: () => securityAdminApi.getOverview(),
    staleTime: 30_000,
  });

  if (isLoading || !overview) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Roles" value={overview.activeRoles} format="number" icon={Shield} />
        <StatCard label="Permissions" value={overview.totalPermissions} format="number" icon={Key} />
        <StatCard label="ABAC Policies" value={overview.abacPolicies} format="number" icon={Lock} />
        <StatCard label="MFA Enrollments" value={overview.activeMfaEnrollments} format="number" icon={Fingerprint} />
        <StatCard label="Encryption Keys" value={overview.activeKeys} format="number" icon={Key} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Security Events" value={overview.securityEvents} format="number" icon={Activity} />
        <StatCard label="Unacknowledged" value={overview.unacknowledgedEvents} format="number" icon={AlertTriangle} />
        <StatCard label="Critical Events" value={overview.criticalEvents} format="number" icon={FileWarning} />
        <StatCard label="SIEM Rules" value={overview.siemRules} format="number" icon={Eye} />
        <StatCard label="Masking Policies" value={overview.maskingPolicies} format="number" icon={Database} />
      </div>
    </div>
  );
}

// ─── ABAC Tab ────────────────────────────────────────────────────────────────

function AbacTab() {
  const qc = useQueryClient();
  const { data: policies = [], isLoading } = useQuery({ queryKey: KEYS.abac, queryFn: () => securityAdminApi.getAbacPolicies() });
  const deleteMut = useMutation({
    mutationFn: (id: number) => securityAdminApi.deleteAbacPolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.abac }),
  });

  const columns: ColumnDef<AbacPolicy>[] = [
    { accessorKey: 'policyName', header: 'Policy Name', cell: ({ getValue }) => <span className="font-medium text-sm">{String(getValue())}</span> },
    { accessorKey: 'resource', header: 'Resource' },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'effect', header: 'Effect', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'priority', header: 'Priority', cell: ({ getValue }) => <span className="tabular-nums">{String(getValue())}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => <StatusBadge status={getValue() ? 'ACTIVE' : 'INACTIVE'} /> },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="text-xs text-muted-foreground truncate max-w-48 block">{String(getValue() ?? '—')}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <button onClick={() => deleteMut.mutate(row.original.id)} disabled={deleteMut.isPending}
          className="text-muted-foreground hover:text-red-600 p-1 disabled:opacity-50" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return <DataTable columns={columns} data={policies} isLoading={isLoading} enableGlobalFilter />;
}

// ─── MFA Tab ─────────────────────────────────────────────────────────────────

function MfaTab() {
  const qc = useQueryClient();
  const { data: enrollments = [], isLoading } = useQuery({ queryKey: KEYS.mfa, queryFn: () => securityAdminApi.getMfaEnrollments() });
  const suspendMut = useMutation({ mutationFn: (id: number) => securityAdminApi.suspendMfaEnrollment(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.mfa }) });
  const revokeMut = useMutation({ mutationFn: (id: number) => securityAdminApi.revokeMfaEnrollment(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.mfa }) });
  const activateMut = useMutation({ mutationFn: (id: number) => securityAdminApi.activateMfaEnrollment(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.mfa }) });

  const columns: ColumnDef<MfaEnrollment>[] = [
    { accessorKey: 'userId', header: 'User ID', cell: ({ getValue }) => <span className="font-mono text-xs">#{String(getValue())}</span> },
    { accessorKey: 'mfaMethod', header: 'Method', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'isPrimary', header: 'Primary', cell: ({ getValue }) => getValue() ? <CheckCircle className="w-4 h-4 text-green-600" /> : <span className="text-xs text-muted-foreground">No</span> },
    { accessorKey: 'isVerified', header: 'Verified', cell: ({ getValue }) => getValue() ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-400" /> },
    { accessorKey: 'failureCount', header: 'Failures', cell: ({ getValue }) => <span className="tabular-nums">{String(getValue())}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'lastUsedAt', header: 'Last Used', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() ? formatRelative(String(getValue())) : '—'}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        const e = row.original;
        return (
          <div className="flex gap-1">
            {e.status === 'ACTIVE' && (
              <button onClick={() => suspendMut.mutate(e.id)} className="text-xs px-2 py-0.5 rounded border hover:bg-amber-50 text-amber-700" disabled={suspendMut.isPending}>Suspend</button>
            )}
            {e.status === 'SUSPENDED' && (
              <button onClick={() => activateMut.mutate(e.id)} className="text-xs px-2 py-0.5 rounded border hover:bg-green-50 text-green-700" disabled={activateMut.isPending}>Activate</button>
            )}
            {e.status !== 'REVOKED' && (
              <button onClick={() => revokeMut.mutate(e.id)} className="text-xs px-2 py-0.5 rounded border hover:bg-red-50 text-red-700" disabled={revokeMut.isPending}>Revoke</button>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={enrollments} isLoading={isLoading} enableGlobalFilter />;
}

// ─── Encryption Keys Tab ─────────────────────────────────────────────────────

function EncryptionKeysTab() {
  const qc = useQueryClient();
  const { data: keys = [], isLoading } = useQuery({ queryKey: KEYS.keys, queryFn: () => securityAdminApi.getEncryptionKeys() });
  const rotateMut = useMutation({ mutationFn: (id: number) => securityAdminApi.rotateKey(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.keys }) });
  const destroyMut = useMutation({ mutationFn: (id: number) => securityAdminApi.destroyKey(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.keys }) });

  const columns: ColumnDef<EncryptionKey>[] = [
    { accessorKey: 'keyAlias', header: 'Alias', cell: ({ getValue }) => <span className="font-medium text-sm">{String(getValue())}</span> },
    { accessorKey: 'keyId', header: 'Key ID', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { accessorKey: 'keyType', header: 'Type' },
    { accessorKey: 'purpose', header: 'Purpose', cell: ({ getValue }) => <span className="text-xs">{String(getValue()).replace(/_/g, ' ')}</span> },
    { accessorKey: 'algorithm', header: 'Algorithm', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { accessorKey: 'keySizeBits', header: 'Bits', cell: ({ getValue }) => <span className="tabular-nums">{String(getValue())}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'rotationIntervalDays', header: 'Rotation', cell: ({ getValue }) => <span className="text-xs tabular-nums">{String(getValue())}d</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{formatRelative(String(getValue()))}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        const k = row.original;
        return (
          <div className="flex gap-1">
            {k.status === 'ACTIVE' && (
              <button onClick={() => rotateMut.mutate(k.id)} className="text-muted-foreground hover:text-primary p-1" title="Rotate" disabled={rotateMut.isPending}>
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            {k.status !== 'DESTROYED' && (
              <button onClick={() => destroyMut.mutate(k.id)} className="text-muted-foreground hover:text-red-600 p-1" title="Destroy" disabled={destroyMut.isPending}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={keys} isLoading={isLoading} enableGlobalFilter />;
}

// ─── Security Events Tab ─────────────────────────────────────────────────────

function SecurityEventsTab() {
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(0);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [...KEYS.events, category, page],
    queryFn: () => securityAdminApi.getSecurityEvents({ category: category || undefined, page, size: 30 }),
    staleTime: 15_000,
  });

  const ackMut = useMutation({
    mutationFn: (id: number) => securityAdminApi.acknowledgeEvent(id, 'admin'),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.events }),
  });

  const events = data?.content ?? [];

  const CATEGORIES = ['', 'AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'CONFIGURATION_CHANGE', 'PRIVILEGE_ESCALATION', 'ANOMALY', 'POLICY_VIOLATION', 'INCIDENT'];

  const columns: ColumnDef<SecurityEvent>[] = [
    { accessorKey: 'eventType', header: 'Event Type', cell: ({ getValue }) => <span className="text-sm font-medium">{String(getValue())}</span> },
    { accessorKey: 'eventCategory', header: 'Category', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'severity', header: 'Severity', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'username', header: 'User', cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'ipAddress', header: 'IP', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'actionTaken', header: 'Action', cell: ({ getValue }) => getValue() ? <StatusBadge status={String(getValue())} /> : <span className="text-xs text-muted-foreground">—</span> },
    { accessorKey: 'threatScore', header: 'Threat', cell: ({ getValue }) => {
      const score = Number(getValue() ?? 0);
      return <span className={`text-xs font-bold tabular-nums ${score >= 70 ? 'text-red-600' : score >= 40 ? 'text-amber-600' : 'text-green-600'}`}>{score}</span>;
    }},
    { accessorKey: 'isAcknowledged', header: 'Ack', cell: ({ getValue }) => getValue() ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" /> },
    { accessorKey: 'createdAt', header: 'Time', cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{formatRelative(String(getValue()))}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        if (row.original.isAcknowledged) return null;
        return (
          <button onClick={() => ackMut.mutate(row.original.id)} className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90" disabled={ackMut.isPending}>
            Ack
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}
          className="px-3 py-1.5 text-sm border rounded-lg bg-background">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
        {data && (
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {data.totalPages} ({data.totalElements} events)
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-50">Prev</button>
          <button disabled={!data || page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
      <DataTable columns={columns} data={events} isLoading={isLoading} />
    </div>
  );
}

// ─── SIEM Rules Tab ──────────────────────────────────────────────────────────

function SiemRulesTab() {
  const qc = useQueryClient();
  const { data: rules = [], isLoading } = useQuery({ queryKey: KEYS.siem, queryFn: () => securityAdminApi.getSiemRules() });
  const toggleMut = useMutation({ mutationFn: (id: number) => securityAdminApi.toggleSiemRule(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.siem }) });

  const columns: ColumnDef<SiemRule>[] = [
    { accessorKey: 'ruleName', header: 'Rule Name', cell: ({ getValue }) => <span className="font-medium text-sm">{String(getValue())}</span> },
    { accessorKey: 'ruleType', header: 'Type', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'timeWindowMinutes', header: 'Window', cell: ({ getValue }) => <span className="tabular-nums text-xs">{String(getValue())}m</span> },
    { accessorKey: 'severityOutput', header: 'Severity', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'actionOnTrigger', header: 'Action', cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => <StatusBadge status={getValue() ? 'ACTIVE' : 'INACTIVE'} /> },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="text-xs text-muted-foreground truncate max-w-48 block">{String(getValue() ?? '—')}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <button onClick={() => toggleMut.mutate(row.original.id)} disabled={toggleMut.isPending}
          className="text-xs px-2 py-0.5 rounded border hover:bg-muted disabled:opacity-50">
          {row.original.isActive ? 'Disable' : 'Enable'}
        </button>
      ),
    },
  ];

  return <DataTable columns={columns} data={rules} isLoading={isLoading} enableGlobalFilter />;
}

// ─── Masking & PII Tab ───────────────────────────────────────────────────────

function MaskingTab() {
  const { data: policies = [], isLoading: loadingPolicies } = useQuery({ queryKey: KEYS.masking, queryFn: () => securityAdminApi.getMaskingPolicies() });
  const { data: piiFields = [], isLoading: loadingPii } = useQuery({ queryKey: KEYS.pii, queryFn: () => securityAdminApi.getPiiRegistry() });

  const policyColumns: ColumnDef<MaskingPolicy>[] = [
    { accessorKey: 'policyName', header: 'Policy', cell: ({ getValue }) => <span className="font-medium text-sm">{String(getValue())}</span> },
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'fieldName', header: 'Field', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { accessorKey: 'maskingStrategy', header: 'Strategy', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'maskPattern', header: 'Pattern', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '—')}</span> },
    { accessorKey: 'appliesToRoles', header: 'Roles', cell: ({ getValue }) => {
      const roles = getValue() as string[] | null;
      return roles ? <span className="text-xs">{roles.join(', ')}</span> : <span className="text-xs text-muted-foreground">—</span>;
    }},
    { accessorKey: 'isActive', header: 'Active', cell: ({ getValue }) => <StatusBadge status={getValue() ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  const piiColumns: ColumnDef<PiiField>[] = [
    { accessorKey: 'entityType', header: 'Entity' },
    { accessorKey: 'fieldName', header: 'Field', cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue())}</span> },
    { accessorKey: 'piiCategory', header: 'Category', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'sensitivityLevel', header: 'Sensitivity', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
    { accessorKey: 'encryptionRequired', header: 'Encrypted', cell: ({ getValue }) => getValue() ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" /> },
    { accessorKey: 'defaultMaskingStrategy', header: 'Default Mask', cell: ({ getValue }) => <span className="text-xs">{String(getValue())}</span> },
    { accessorKey: 'retentionDays', header: 'Retention', cell: ({ getValue }) => <span className="text-xs tabular-nums">{getValue() ? `${getValue()}d` : '—'}</span> },
    { accessorKey: 'gdprLawfulBasis', header: 'GDPR Basis', cell: ({ getValue }) => <span className="text-xs">{String(getValue() ?? '—')}</span> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-3">Masking Policies ({policies.length})</h3>
        <DataTable columns={policyColumns} data={policies} isLoading={loadingPolicies} enableGlobalFilter />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">PII Field Registry ({piiFields.length})</h3>
        <DataTable columns={piiColumns} data={piiFields} isLoading={loadingPii} enableGlobalFilter />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function SecurityAdminPage() {
  return (
    <>
      <PageHeader
        title="Security Administration"
        subtitle="RBAC, ABAC policies, MFA enrollment management, encryption keys, SIEM events, and data masking"
      />
      <div className="page-container">
        <TabsPage
          syncWithUrl
          tabs={[
            { id: 'overview', label: 'Overview', content: <OverviewTab /> },
            { id: 'abac', label: 'ABAC Policies', content: <AbacTab /> },
            { id: 'mfa', label: 'MFA Enrollments', content: <MfaTab /> },
            { id: 'keys', label: 'Encryption Keys', content: <EncryptionKeysTab /> },
            { id: 'events', label: 'Security Events', content: <SecurityEventsTab /> },
            { id: 'siem', label: 'SIEM Rules', content: <SiemRulesTab /> },
            { id: 'masking', label: 'Data Masking & PII', content: <MaskingTab /> },
          ]}
        />
      </div>
    </>
  );
}
