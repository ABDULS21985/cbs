import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Ban,
  Activity,
  Key,
  Globe,
  Shield,
  Calendar,
  BarChart3,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
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
  Legend,
} from 'recharts';

import { useTppClients, useConsents } from '../hooks/useOpenBanking';
import type { TppClientType, TppClientStatus } from '../api/openBankingApi';
import { TppScopeSelector } from '../components/tpp/TppScopeSelector';
import { TppStatusActions } from '../components/tpp/TppStatusActions';
import { ConsentTable } from '../components/consent/ConsentTable';

// ─── Constants ───────────────────────────────────────────────────────────────

const CLIENT_TYPE_COLOR: Record<TppClientType, string> = {
  TPP_AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TPP_PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TPP_BOTH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const STATUS_COLOR: Record<TppClientStatus, string> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SUSPENDED: 'danger',
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

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground min-w-[160px]">{label}</span>
      <span className={cn('text-sm font-medium text-right', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function SecretField({ value }: { value?: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-sm text-muted-foreground">Not available</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">
        {show ? value : '•'.repeat(Math.min(value.length, 32))}
      </span>
      <button
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setShow(s => !s)}
        title={show ? 'Hide' : 'Show'}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        className="text-muted-foreground hover:text-foreground"
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
  const [tab, setTab] = useState('overview');

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
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">TPP Client not found.</p>
        <Button variant="ghost" onClick={() => navigate('/open-banking')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const totalCalls = usageTrend.reduce((s, d) => s + d.calls, 0);
  const totalErrors = usageTrend.reduce((s, d) => s + d.errors, 0);
  const avgLatency = Math.round(usageTrend.reduce((s, d) => s + d.latencyMs, 0) / usageTrend.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={`TPP Client · ${client.clientType}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/open-banking">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> TPP Clients
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status Strip */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-muted/30">
        <Badge className={CLIENT_TYPE_COLOR[client.clientType]}>{client.clientType}</Badge>
        <StatusBadge status={STATUS_COLOR[client.status] as 'success' | 'warning' | 'danger'}>
          {client.status}
        </StatusBadge>
        <span className="text-sm text-muted-foreground">
          Registered {formatDate(client.registeredAt)}
        </span>
        <div className="ml-auto">
          <TppStatusActions client={client} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Activity, label: 'API Calls (30d)', value: (client.apiCalls30d ?? totalCalls).toLocaleString(), color: 'text-blue-600' },
          { icon: Shield, label: 'Active Consents', value: (client.activeConsents ?? clientConsents.filter(c => c.status === 'AUTHORISED').length).toString(), color: 'text-green-600' },
          { icon: BarChart3, label: 'Avg Latency', value: `${avgLatency}ms`, color: 'text-amber-600' },
          { icon: CheckCircle2, label: 'Error Rate', value: `${totalCalls ? ((totalErrors / totalCalls) * 100).toFixed(2) : '0.00'}%`, color: 'text-rose-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={cn('h-8 w-8', color)} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="consents">
            Consents
            {clientConsents.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 text-xs">{clientConsents.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="usage">API Usage</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Client Details
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <InfoRow label="Client Name" value={client.name} />
                <InfoRow label="Client ID" value={client.clientId} mono />
                <InfoRow label="Redirect URI" value={client.redirectUri} mono />
                <InfoRow label="Client Type" value={
                  <Badge className={CLIENT_TYPE_COLOR[client.clientType]}>{client.clientType}</Badge>
                } />
                <InfoRow label="Status" value={
                  <StatusBadge status={STATUS_COLOR[client.status] as 'success' | 'warning' | 'danger'}>
                    {client.status}
                  </StatusBadge>
                } />
                <InfoRow label="Registered" value={formatDate(client.registeredAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" /> Approved Scopes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TppScopeSelector value={client.scopes} readOnly />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Consents ───────────────────────────────────────────────────── */}
        <TabsContent value="consents">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active & Historical Consents</CardTitle>
            </CardHeader>
            <CardContent>
              {consentsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API Usage ──────────────────────────────────────────────────── */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" /> Request Volume (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Response Latency (ms)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={usageTrend.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="latencyMs" fill="#f59e0b" name="Latency (ms)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Credentials ────────────────────────────────────────────────── */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" /> OAuth2 Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <div className="py-3">
                <p className="text-xs text-muted-foreground mb-1">Client ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">{client.clientId}</code>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => { navigator.clipboard.writeText(client.clientId); toast.success('Copied'); }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="py-3">
                <p className="text-xs text-muted-foreground mb-1">Client Secret</p>
                <SecretField value={client.clientSecret} />
              </div>
              <div className="py-3">
                <p className="text-xs text-muted-foreground mb-1">Redirect URI</p>
                <code className="text-sm font-mono">{client.redirectUri}</code>
              </div>
              <div className="py-3">
                <p className="text-xs text-muted-foreground mb-2">Scopes</p>
                <div className="flex flex-wrap gap-1">
                  {client.scopes.map(s => (
                    <Badge key={s} variant="outline" className="font-mono text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
