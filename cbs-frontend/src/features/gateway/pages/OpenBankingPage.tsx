import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatRelative } from '@/lib/formatters';
import {
  Key, Shield, FileCheck, AlertTriangle, Plus, X, Copy, Check,
  Eye, Ban, CheckCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import type { ApiClientRegistration, OpenBankingConsent } from '../types/integration';
import {
  useApiClients, useRegisterApiClient, useDeactivateApiClient,
  useOpenBankingConsents, useCreateConsent, useAuthoriseConsent, useRevokeConsent,
} from '../hooks/useGatewayData';
import { toast } from 'sonner';

const SCOPES = ['accounts:read', 'accounts:write', 'payments:read', 'payments:initiate', 'balances:read', 'transactions:read', 'consents:manage'];
const clientTypeColors: Record<string, string> = {
  TPP: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AGGREGATOR: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PARTNER: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INTERNAL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};
const consentTypeColors: Record<string, string> = {
  AISP: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PISP: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CBPII: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 font-mono text-xs hover:text-primary" title="Copy">
      {text.length > 20 ? text.slice(0, 18) + '...' : text}
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-40" />}
    </button>
  );
}

// ── Register Client Dialog ───────────────────────────────────────────────────

function RegisterClientDialog({ onClose }: { onClose: () => void }) {
  const register = useRegisterApiClient();
  const [apiKeyResult, setApiKeyResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: '', clientType: 'TPP' as const, oauthClientId: '',
    redirectUris: [''], allowedScopes: ['accounts:read'] as string[],
    allowedEndpoints: '', rateLimitPerSecond: 10, rateLimitPerDay: 10000,
    apiVersion: 'v2', contactName: '', contactEmail: '',
  });
  const update = (f: string, v: unknown) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = () => {
    const generatedKey = crypto.randomUUID();
    register.mutate({
      data: {
        clientName: form.clientName, clientType: form.clientType,
        oauthClientId: form.oauthClientId || undefined,
        redirectUris: form.redirectUris.filter(Boolean),
        allowedScopes: form.allowedScopes,
        allowedEndpoints: form.allowedEndpoints.split(',').map((s) => s.trim()).filter(Boolean),
        rateLimitPerSecond: form.rateLimitPerSecond, rateLimitPerDay: form.rateLimitPerDay,
        apiVersion: form.apiVersion, contactName: form.contactName, contactEmail: form.contactEmail,
      },
      apiKey: generatedKey,
    }, {
      onSuccess: () => {
        setApiKeyResult(generatedKey);
      },
    });
  };

  if (apiKeyResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">API Client Registered</h2>
          <div className="rounded-lg bg-muted p-4 mb-3">
            <p className="text-xs text-muted-foreground mb-1">API Key</p>
            <p className="font-mono text-sm font-bold break-all select-all">{apiKeyResult}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(apiKeyResult); toast.success('Copied'); }} className="flex items-center gap-2 mx-auto mb-3 btn-secondary">
            <Copy className="w-4 h-4" /> Copy Key
          </button>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
            <p className="text-xs text-red-700 dark:text-red-400 font-medium">This key will only be shown once. Store it securely.</p>
          </div>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Register API Client</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Client Name *</label><input className="w-full mt-1 input" value={form.clientName} onChange={(e) => update('clientName', e.target.value)} required /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Client Type</label><select className="w-full mt-1 input" value={form.clientType} onChange={(e) => update('clientType', e.target.value)}><option>TPP</option><option>AGGREGATOR</option><option>PARTNER</option><option>INTERNAL</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">OAuth Client ID</label><input className="w-full mt-1 input" value={form.oauthClientId} onChange={(e) => update('oauthClientId', e.target.value)} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">API Version</label><select className="w-full mt-1 input" value={form.apiVersion} onChange={(e) => update('apiVersion', e.target.value)}><option>v1</option><option>v2</option></select></div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Allowed Scopes</label>
            <div className="flex flex-wrap gap-2 mt-1">{SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={form.allowedScopes.includes(scope)} onChange={(e) => update('allowedScopes', e.target.checked ? [...form.allowedScopes, scope] : form.allowedScopes.filter((s) => s !== scope))} className="rounded" />{scope}
              </label>
            ))}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Rate Limit /sec</label><input type="number" className="w-full mt-1 input" value={form.rateLimitPerSecond} onChange={(e) => update('rateLimitPerSecond', parseInt(e.target.value) || 0)} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Rate Limit /day</label><input type="number" className="w-full mt-1 input" value={form.rateLimitPerDay} onChange={(e) => update('rateLimitPerDay', parseInt(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Contact Name</label><input className="w-full mt-1 input" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Contact Email</label><input className="w-full mt-1 input" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={!form.clientName || register.isPending} className="btn-primary">{register.isPending ? 'Registering...' : 'Register Client'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Consent Dialog ────────────────────────────────────────────────────

function CreateConsentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateConsent();
  const { data: clients = [] } = useApiClients();
  const PERMISSIONS = ['ReadAccountsBasic', 'ReadAccountsDetail', 'ReadBalances', 'ReadTransactionsBasic', 'ReadTransactionsDetail', 'ReadStatementsBasic', 'ReadStatementsDetail', 'CreateDomesticPayment', 'CreateInternationalPayment'];
  const [form, setForm] = useState({ clientId: '', customerId: 0, consentType: 'AISP' as const, permissions: ['ReadAccountsBasic'] as string[], accountIds: '' as string, validityMinutes: 1440 });
  const update = (f: string, v: unknown) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Create Consent</h2>
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-muted-foreground">Client</label><select className="w-full mt-1 input" value={form.clientId} onChange={(e) => update('clientId', e.target.value)}><option value="">Select client...</option>{clients.map((c) => <option key={c.clientId} value={c.clientId}>{c.clientName}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-muted-foreground">Customer ID *</label><input type="number" className="w-full mt-1 input" value={form.customerId || ''} onChange={(e) => update('customerId', parseInt(e.target.value) || 0)} required /></div>
            <div><label className="text-sm font-medium text-muted-foreground">Consent Type</label><select className="w-full mt-1 input" value={form.consentType} onChange={(e) => update('consentType', e.target.value)}><option value="AISP">AISP — Account Information</option><option value="PISP">PISP — Payment Initiation</option><option value="CBPII">CBPII — Confirmation of Funds</option></select></div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Permissions</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">{PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={form.permissions.includes(p)} onChange={(e) => update('permissions', e.target.checked ? [...form.permissions, p] : form.permissions.filter((x) => x !== p))} className="rounded" />{p}
              </label>
            ))}</div>
          </div>
          <div><label className="text-sm font-medium text-muted-foreground">Validity (minutes)</label><input type="number" className="w-full mt-1 input" value={form.validityMinutes} onChange={(e) => update('validityMinutes', parseInt(e.target.value) || 1440)} /><p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(form.validityMinutes / 60)} hours</p></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => create.mutate({ clientId: form.clientId, customerId: form.customerId, consentType: form.consentType, permissions: form.permissions, accountIds: form.accountIds ? form.accountIds.split(',').map(Number) : undefined, validityMinutes: form.validityMinutes }, { onSuccess: () => { toast.success('Consent created'); onClose(); } })} disabled={create.isPending || !form.clientId || !form.customerId} className="btn-primary">{create.isPending ? 'Creating...' : 'Create Consent'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── API Clients Tab ──────────────────────────────────────────────────────────

function ApiClientsTab({ onRegister }: { onRegister: () => void }) {
  const { data: clients = [], isLoading } = useApiClients();
  const deactivate = useDeactivateApiClient();

  const columns: ColumnDef<ApiClientRegistration, any>[] = [
    { accessorKey: 'clientId', header: 'Client ID', cell: ({ row }) => <CopyText text={row.original.clientId} /> },
    { accessorKey: 'clientName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.clientName}</span> },
    { accessorKey: 'clientType', header: 'Type', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', clientTypeColors[row.original.clientType])}>{row.original.clientType}</span> },
    { accessorKey: 'allowedScopes', header: 'Scopes', cell: ({ row }) => { const s = row.original.allowedScopes; return <span className="text-xs">{s.slice(0, 3).join(', ')}{s.length > 3 ? ` +${s.length - 3}` : ''}</span>; } },
    { id: 'rateLimit', header: 'Rate', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.rateLimitPerSecond}/s, {row.original.rateLimitPerDay.toLocaleString()}/d</span> },
    {
      id: 'usage', header: 'Usage',
      cell: ({ row }) => { const pct = row.original.rateLimitPerDay > 0 ? (row.original.dailyRequestCount / row.original.rateLimitPerDay) * 100 : 0; return (
        <div className="flex items-center gap-1.5 min-w-[80px]"><div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-[10px] tabular-nums w-8 text-right">{pct.toFixed(0)}%</span></div>
      ); },
    },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} dot /> },
    { accessorKey: 'expiresAt', header: 'Expires', cell: ({ row }) => { const d = Math.ceil((new Date(row.original.expiresAt).getTime() - Date.now()) / 86400_000); return <span className={cn('text-xs tabular-nums', d < 30 && 'text-red-600 font-medium')}>{formatDate(row.original.expiresAt)}</span>; } },
    {
      id: 'actions', header: '',
      cell: ({ row }) => row.original.isActive ? (
        <button onClick={() => deactivate.mutate(row.original.clientId, { onSuccess: () => toast.success('Client deactivated') })} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"><Ban className="w-3 h-3" /></button>
      ) : null,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end"><button onClick={onRegister} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> Register Client</button></div>
      <DataTable columns={columns} data={clients} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="api-clients" emptyMessage="No API clients registered" />
    </div>
  );
}

// ── Consents Tab ─────────────────────────────────────────────────────────────

function ConsentsTab() {
  const { data: consents = [], isLoading } = useOpenBankingConsents();
  const authorise = useAuthoriseConsent();
  const revoke = useRevokeConsent();
  const [showCreate, setShowCreate] = useState(false);

  const columns: ColumnDef<OpenBankingConsent, any>[] = [
    { accessorKey: 'consentId', header: 'Consent ID', cell: ({ row }) => <CopyText text={row.original.consentId} /> },
    { accessorKey: 'clientName', header: 'Client', cell: ({ row }) => <span className="text-sm font-medium">{row.original.clientName}</span> },
    { accessorKey: 'customerId', header: 'Customer', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.customerId}</span> },
    { accessorKey: 'consentType', header: 'Type', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', consentTypeColors[row.original.consentType])}>{row.original.consentType}</span> },
    { accessorKey: 'permissions', header: 'Permissions', cell: ({ row }) => { const p = row.original.permissions; return <span className="text-xs">{p.slice(0, 2).join(', ')}{p.length > 2 ? ` +${p.length - 2}` : ''}</span>; } },
    { accessorKey: 'accountIds', header: 'Accounts', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.accountIds.length || 'All'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
    { accessorKey: 'expiresAt', header: 'Expires', cell: ({ row }) => { const d = Math.ceil((new Date(row.original.expiresAt).getTime() - Date.now()) / 86400_000); return <span className={cn('text-xs tabular-nums', d < 7 && row.original.status === 'AUTHORISED' && 'text-red-600 font-medium')}>{formatDate(row.original.expiresAt)}</span>; } },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'AWAITING_AUTHORISATION' && <button onClick={() => authorise.mutate({ consentId: row.original.consentId, customerId: row.original.customerId }, { onSuccess: () => toast.success('Consent authorised') })} className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Authorise</button>}
          {row.original.status === 'AUTHORISED' && <button onClick={() => revoke.mutate(row.original.consentId, { onSuccess: () => toast.success('Consent revoked') })} className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Revoke</button>}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end"><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> Create Consent</button></div>
      <DataTable columns={columns} data={consents} isLoading={isLoading} enableGlobalFilter emptyMessage="No consents" />
      {showCreate && <CreateConsentDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ── Rate Limiting Tab ────────────────────────────────────────────────────────

function RateLimitingTab() {
  const { data: clients = [], isLoading } = useApiClients();

  const sorted = useMemo(() =>
    [...clients].sort((a, b) => b.dailyRequestCount - a.dailyRequestCount),
  [clients]);

  const chartData = sorted.slice(0, 10).map((c) => ({
    name: c.clientName.length > 12 ? c.clientName.slice(0, 10) + '...' : c.clientName,
    requests: c.dailyRequestCount,
    limit: c.rateLimitPerDay,
  }));

  const columns: ColumnDef<ApiClientRegistration, any>[] = [
    { accessorKey: 'clientName', header: 'Client', cell: ({ row }) => <span className="text-sm font-medium">{row.original.clientName}</span> },
    { accessorKey: 'dailyRequestCount', header: 'Requests Today', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{row.original.dailyRequestCount.toLocaleString()}</span> },
    { accessorKey: 'rateLimitPerDay', header: 'Daily Limit', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.rateLimitPerDay.toLocaleString()}</span> },
    {
      id: 'usage', header: 'Usage %',
      cell: ({ row }) => { const pct = row.original.rateLimitPerDay > 0 ? (row.original.dailyRequestCount / row.original.rateLimitPerDay) * 100 : 0; return (
        <div className="flex items-center gap-1.5 min-w-[100px]"><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={cn('h-full rounded-full', pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-xs tabular-nums w-10 text-right">{pct.toFixed(1)}%</span></div>
      ); },
    },
    { accessorKey: 'rateLimitPerSecond', header: 'Per Sec', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.rateLimitPerSecond}/s</span> },
    {
      id: 'status', header: 'Status',
      cell: ({ row }) => { const pct = row.original.rateLimitPerDay > 0 ? (row.original.dailyRequestCount / row.original.rateLimitPerDay) * 100 : 0; return <StatusBadge status={pct >= 100 ? 'LIMITED' : pct >= 80 ? 'WARNING' : 'OK'} dot />; },
    },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="surface-card p-4">
        <p className="text-sm font-medium mb-3">Daily Requests by Client (Top 10)</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ fontSize: 12 }} /><Bar dataKey="requests" name="Requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} /></BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={columns} data={sorted} isLoading={isLoading} enableGlobalFilter emptyMessage="No clients" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function OpenBankingPage() {
  const [showRegister, setShowRegister] = useState(false);
  const { data: clients = [] } = useApiClients();
  const { data: consents = [] } = useOpenBankingConsents();

  const activeClients = clients.filter((c) => c.isActive).length;
  const activeConsents = consents.filter((c) => c.status === 'AUTHORISED').length;
  const rateLimited = clients.filter((c) => c.rateLimitPerDay > 0 && c.dailyRequestCount >= c.rateLimitPerDay).length;

  return (
    <>
      <PageHeader title="Open Banking & API Management" subtitle="API client registration, consent management, and rate limiting" actions={<button onClick={() => setShowRegister(true)} className="flex items-center gap-2 btn-primary"><Plus className="w-4 h-4" /> Register Client</button>} />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Clients" value={clients.length} format="number" icon={Key} />
          <StatCard label="Active Clients" value={activeClients} format="number" icon={Shield} />
          <StatCard label="Total Consents" value={consents.length} format="number" icon={FileCheck} />
          <StatCard label="Active Consents" value={activeConsents} format="number" icon={CheckCircle} />
          <StatCard label="Rate Limited" value={rateLimited} format="number" icon={AlertTriangle} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={[
            { id: 'clients', label: 'API Clients', content: <ApiClientsTab onRegister={() => setShowRegister(true)} /> },
            { id: 'consents', label: 'Consents', badge: consents.filter((c) => c.status === 'AWAITING_AUTHORISATION').length || undefined, content: <ConsentsTab /> },
            { id: 'rate-limits', label: 'Rate Limiting', badge: rateLimited > 0 ? rateLimited : undefined, content: <RateLimitingTab /> },
          ]} />
        </div>
      </div>
      {showRegister && <RegisterClientDialog onClose={() => setShowRegister(false)} />}
    </>
  );
}
