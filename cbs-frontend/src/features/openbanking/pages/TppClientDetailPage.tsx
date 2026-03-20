import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TabsPage } from '@/components/shared/TabsPage';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useTppClients, useConsents } from '../hooks/useOpenBanking';
import type { TppClientType, TppClientStatus } from '../api/openBankingApi';
import { TppScopeSelector } from '../components/tpp/TppScopeSelector';
import { TppStatusActions } from '../components/tpp/TppStatusActions';
import { ConsentTable } from '../components/consent/ConsentTable';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<TppClientType, string> = {
  TPP_AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TPP_PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TPP_BOTH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function generateUsageTrend(days = 30) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      calls: Math.floor(Math.random() * 500) + 50,
      errors: Math.floor(Math.random() * 20),
      latencyMs: Math.floor(Math.random() * 150) + 80,
    });
  }
  return data;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground min-w-[140px]">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  );
}

function SecretField({ value }: { value?: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-sm text-muted-foreground">Not available</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">
        {show ? value : '•'.repeat(Math.min(value.length, 28))}
      </span>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow(s => !s)}
        title={show ? 'Hide' : 'Show'}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function TppClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: clients = [], isLoading } = useTppClients();
  const client = useMemo(() => clients.find(c => String(c.id) === id), [clients, id]);

  const { data: allConsents = [], isLoading: consentsLoading } = useConsents();
  const clientConsents = useMemo(
    () => allConsents.filter(c => c.tppClientId === client?.id),
    [allConsents, client],
  );

  const usageTrend = useMemo(() => generateUsageTrend(30), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">TPP Client not found.</p>
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => navigate('/open-banking')}
        >
          ← Back to TPP Clients
        </button>
      </div>
    );
  }

  const totalCalls = usageTrend.reduce((s, d) => s + d.calls, 0);
  const totalErrors = usageTrend.reduce((s, d) => s + d.errors, 0);
  const avgLatency = Math.round(usageTrend.reduce((s, d) => s + d.latencyMs, 0) / usageTrend.length);
  const activeConsents = clientConsents.filter(c => c.status === 'AUTHORISED').length;

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Client Details */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Client Details</h3>
              <div>
                <InfoRow label="Client Name">{client.name}</InfoRow>
                <InfoRow label="Client ID">
                  <span className="font-mono text-xs">{client.clientId}</span>
                </InfoRow>
                <InfoRow label="Redirect URI">
                  <span className="font-mono text-xs break-all">{client.redirectUri}</span>
                </InfoRow>
                <InfoRow label="Client Type">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_STYLES[client.clientType])}>
                    {client.clientType}
                  </span>
                </InfoRow>
                <InfoRow label="Status">
                  <StatusBadge status={client.status} />
                </InfoRow>
                <InfoRow label="Registered">{formatDate(client.registeredAt)}</InfoRow>
              </div>
            </div>

            {/* Approved Scopes */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" /> Approved Scopes
              </h3>
              <TppScopeSelector value={client.scopes} readOnly />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'consents',
      label: 'Consents',
      badge: clientConsents.length,
      content: (
        <div className="p-6">
          {consentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : clientConsents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No consents for this client yet.
            </p>
          ) : (
            <ConsentTable
              consents={clientConsents}
              onAuthorise={() => {}}
              onRevoke={() => {}}
            />
          )}
        </div>
      ),
    },
    {
      id: 'usage',
      label: 'API Usage',
      content: (
        <div className="p-6 space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Request Volume (30 days)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usageTrend}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="calls" stroke="#3b82f6" fill="url(#callsGrad)" name="Calls" />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fill="none" strokeDasharray="3 3" name="Errors" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Response Latency (ms)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={usageTrend.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="latencyMs" fill="#f59e0b" name="Latency (ms)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ),
    },
    {
      id: 'credentials',
      label: 'Credentials',
      content: (
        <div className="p-6">
          <div className="rounded-lg border bg-card p-4 max-w-lg">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" /> OAuth2 Credentials
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Client ID</p>
                <div className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  <code className="text-sm font-mono flex-1">{client.clientId}</code>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => { navigator.clipboard.writeText(client.clientId); toast.success('Copied'); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Client Secret</p>
                <div className="p-2 rounded border bg-muted/30">
                  <SecretField value={client.clientSecret} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Redirect URI</p>
                <div className="p-2 rounded border bg-muted/30">
                  <code className="text-sm font-mono break-all">{client.redirectUri}</code>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Approved Scopes</p>
                <div className="flex flex-wrap gap-1.5">
                  {client.scopes.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded-full border text-xs font-mono bg-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        subtitle={`TPP Client · ${client.clientType}`}
        backTo="/open-banking"
        actions={<TppStatusActions client={client} />}
      />

      {/* Status Strip */}
      <div className="px-6">
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-muted/30">
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_STYLES[client.clientType])}>
            {client.clientType}
          </span>
          <StatusBadge status={client.status} />
          <span className="text-sm text-muted-foreground">
            Registered {formatDate(client.registeredAt)}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'API Calls (30d)', value: (client.apiCalls30d ?? totalCalls).toLocaleString(), color: 'text-blue-600' },
          { icon: Shield, label: 'Active Consents', value: (client.activeConsents ?? activeConsents).toString(), color: 'text-green-600' },
          { icon: BarChart3, label: 'Avg Latency', value: `${avgLatency}ms`, color: 'text-amber-600' },
          { icon: CheckCircle2, label: 'Error Rate', value: `${totalCalls ? ((totalErrors / totalCalls) * 100).toFixed(2) : '0.00'}%`, color: 'text-rose-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <Icon className={cn('h-8 w-8', color)} />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-t">
        <TabsPage tabs={tabs} />
      </div>
    </div>
  );
}
