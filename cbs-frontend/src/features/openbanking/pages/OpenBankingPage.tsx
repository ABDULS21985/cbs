import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  ShieldCheck,
  CheckCircle2,
  Ban,
  KeyRound,
  Activity,
  Search,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  useTppClients,
  useConsents,
  useRegisterTppClient,
  useAuthoriseConsent,
  useRevokeConsent,
  useCustomerConsents,
} from '../hooks/useOpenBanking';
import type { ApiConsent, TppClientType, ConsentStatus } from '../api/openBankingApi';
import { OpenBankingStatsRow } from '../components/dashboard/OpenBankingStatsRow';
import { ComplianceStatusBanner } from '../components/dashboard/ComplianceStatusBanner';
import { RegisterTppSheet } from '../components/tpp/RegisterTppSheet';
import { TppClientTable } from '../components/tpp/TppClientTable';
import { ConsentTable } from '../components/consent/ConsentTable';
import { AuthoriseConsentDialog } from '../components/consent/AuthoriseConsentDialog';
import { RevokeConsentDialog } from '../components/consent/RevokeConsentDialog';

// NOTE: Consent trend, API traffic, and error rate analytics charts have been removed.
// Synthetic/random data was previously generated for these charts, which is misleading in production.
// Wire a dedicated backend analytics endpoint (e.g. GET /api/v1/open-banking/analytics/consent-trend,
// /api/v1/open-banking/analytics/api-traffic, /api/v1/open-banking/analytics/error-rates) and
// add hooks here before re-enabling these charts.

// ── PSD2 Compliance Checklist ────────────────────────────────────────────────

const PSD2_CHECKLIST = [
  { id: 'art5', article: 'Article 5', label: 'Strong Customer Authentication (SCA)', checked: true },
  { id: 'art10', article: 'Article 10', label: 'TPP registration and identification', checked: true },
  { id: 'art19', article: 'Article 19', label: 'Consent management and revocation', checked: true },
  { id: 'art30', article: 'Article 30', label: 'Dedicated interface (API) availability', checked: true },
  { id: 'art32', article: 'Article 32', label: 'Fallback mechanism availability', checked: false },
  { id: 'art33', article: 'Article 33', label: 'Interface performance monitoring', checked: true },
  { id: 'art34', article: 'Article 34', label: 'Exemption handling (SCA exemptions)', checked: true },
  { id: 'art36', article: 'Article 36', label: 'Transaction risk analysis', checked: true },
  { id: 'art97', article: 'Article 97', label: 'Authentication procedures', checked: true },
  { id: 'art98', article: 'Article 98', label: 'Regulatory technical standards compliance', checked: false },
];

// ── Main Page ────────────────────────────────────────────────────────────────

export function OpenBankingPage() {
  useEffect(() => { document.title = 'Open Banking & PSD2 | CBS'; }, []);

  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TppClientType | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Consent tab state
  const [consentStatusFilter, setConsentStatusFilter] = useState<ConsentStatus | ''>('');
  const [consentTppFilter, setConsentTppFilter] = useState<string>('');
  const [consentSearch, setConsentSearch] = useState('');
  const [customerSearchId, setCustomerSearchId] = useState('');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [authoriseTarget, setAuthoriseTarget] = useState<ApiConsent | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiConsent | null>(null);

  // Queries
  const { data: clients = [], isLoading: clientsLoading } = useTppClients();
  const { data: consents = [], isLoading: consentsLoading } = useConsents();
  const registerTpp = useRegisterTppClient();
  const authoriseConsent = useAuthoriseConsent();
  const revokeConsent = useRevokeConsent();

  // Stats
  const registeredCount = clients.length;
  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const inactiveCount = clients.filter((c) => c.status === 'INACTIVE').length;
  const totalConsents = consents.length;
  const apiCallsToday = clients.reduce((sum, c) => sum + (c.apiCalls30d ?? 0), 0);

  // Filtered clients
  const filteredClients = useMemo(() => {
    let result = clients;
    if (typeFilter) result = result.filter((c) => c.clientType === typeFilter);
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    return result;
  }, [clients, typeFilter, statusFilter]);

  // Filtered consents
  const filteredConsents = useMemo(() => {
    let result = consents;
    if (consentStatusFilter) result = result.filter((c) => c.status === consentStatusFilter);
    if (consentTppFilter) result = result.filter((c) => c.clientId === consentTppFilter);
    if (consentSearch) {
      const q = consentSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.consentId.toLowerCase().includes(q) ||
          (c.tppClientName ?? '').toLowerCase().includes(q) ||
          String(c.customerId).includes(q),
      );
    }
    return result;
  }, [consents, consentStatusFilter, consentTppFilter, consentSearch]);

  // Top TPPs bar data — uses only real backend-provided apiCalls30d; falls back to 0 if not available
  const topTpps = useMemo(() => {
    return clients
      .map((c) => ({ name: c.name, calls: c.apiCalls30d ?? 0 }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 8);
  }, [clients]);

  const handleAuthorise = (consentId: string | number, customerId: number) => {
    authoriseConsent.mutate(
      { consentId, customerId },
      {
        onSuccess: () => {
          toast.success('Consent authorised');
          setAuthoriseTarget(null);
        },
        onError: () => toast.error('Failed to authorise consent'),
      },
    );
  };

  const handleRevoke = (consentId: string | number, reason?: string) => {
    revokeConsent.mutate(
      { consentId, reason },
      {
        onSuccess: () => {
          toast.success('Consent revoked');
          setRevokeTarget(null);
        },
        onError: () => toast.error('Failed to revoke consent'),
      },
    );
  };

  // PSD2 compliance state
  const [checklist, setChecklist] = useState(PSD2_CHECKLIST);
  const complianceScore = checklist.filter((c) => c.checked).length;
  const complianceTotal = checklist.length;

  const tabs = [
    {
      id: 'tpp-clients',
      label: 'TPP Clients',
      content: (
        <div className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TppClientType | '')}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All Types</option>
              <option value="TPP_AISP">AISP</option>
              <option value="TPP_PISP">PISP</option>
              <option value="TPP_CBPII">CBPII</option>
              <option value="INTERNAL">Internal</option>
              <option value="PARTNER">Partner</option>
              <option value="SANDBOX">Sandbox</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <TppClientTable
            clients={filteredClients}
            isLoading={clientsLoading}
            onRowClick={(client) => navigate(`/open-banking/tpp/${client.id}`)}
          />
        </div>
      ),
    },
    {
      id: 'consents',
      label: 'Consents Dashboard',
      content: (
        <div className="p-4 space-y-6">
          {/* Consent stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Active" value={consents.filter((c) => c.status === 'AUTHORISED').length} format="number" icon={CheckCircle2} />
            <StatCard label="Pending" value={consents.filter((c) => c.status === 'PENDING').length} format="number" icon={Activity} />
            <StatCard label="Revoked" value={consents.filter((c) => c.status === 'REVOKED').length} format="number" icon={Ban} />
            <StatCard label="Expired" value={consents.filter((c) => c.status === 'EXPIRED').length} format="number" icon={KeyRound} />
          </div>

          {/* Consent trend chart — not yet available */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Consent Trends (30 days)</h3>
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm border border-dashed rounded-lg">
              Consent trend analytics are not yet available. Wire{' '}
              <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">
                GET /api/v1/open-banking/analytics/consent-trend
              </code>{' '}
              to enable this chart.
            </div>
          </div>

          {/* Customer consent search */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">Search Customer Consents</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCustomerSearchId(customerSearchInput.trim());
                }}
                className="flex items-center gap-2"
              >
                <input
                  className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-40"
                  placeholder="Customer ID"
                  value={customerSearchInput}
                  onChange={(e) => setCustomerSearchInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              </form>
            </div>
            {customerSearchId && (
              <div className="p-4">
                <CustomerConsentResults customerId={customerSearchId} onRevoke={setRevokeTarget} />
              </div>
            )}
          </div>

          {/* Consent filters + table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={consentStatusFilter}
                onChange={(e) => setConsentStatusFilter(e.target.value as ConsentStatus | '')}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="AUTHORISED">Authorised</option>
                <option value="REJECTED">Rejected</option>
                <option value="REVOKED">Revoked</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <select
                value={consentTppFilter}
                onChange={(e) => setConsentTppFilter(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All TPPs</option>
                {clients.map((c) => (
                  <option key={c.clientId} value={c.clientId}>{c.name}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={consentSearch}
                  onChange={(e) => setConsentSearch(e.target.value)}
                  className="rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-56"
                  placeholder="Search consents..."
                />
              </div>
            </div>

            <ConsentTable
              consents={filteredConsents}
              isLoading={consentsLoading}
              onRowClick={(consent) => navigate(`/open-banking/consents/${consent.id}`)}
              onAuthorise={setAuthoriseTarget}
              onRevoke={setRevokeTarget}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'analytics',
      label: 'API Analytics',
      content: (
        <div className="p-4 space-y-6">
          {/* API Traffic Chart — not yet available */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">API Traffic (30 days, by TPP)</h3>
            <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm border border-dashed rounded-lg">
              API traffic analytics are not yet available. Wire{' '}
              <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">
                GET /api/v1/open-banking/analytics/api-traffic
              </code>{' '}
              to enable this chart.
            </div>
          </div>

          {/* Top TPPs horizontal bar — uses real apiCalls30d from backend */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Top TPPs by API Calls (30 days)</h3>
            {topTpps.every((t) => t.calls === 0) ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm border border-dashed rounded-lg">
                No API call data available. The backend must populate{' '}
                <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">apiCalls30d</code> on TPP records.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={Math.max(topTpps.length * 40, 200)}>
              <BarChart data={topTpps} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="calls" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Error rate table — not yet available */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-semibold">Error Rates by TPP</h3>
            </div>
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm p-4 text-center">
              Error rate data is not yet available. Wire{' '}
              <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">
                GET /api/v1/open-banking/analytics/error-rates
              </code>{' '}
              to enable this table.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'compliance',
      label: 'Compliance',
      content: (
        <div className="p-4 space-y-6">
          {/* Score overview */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">PSD2 Compliance Score</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {complianceScore} of {complianceTotal} requirements met
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold tabular-nums">
                  {Math.round((complianceScore / complianceTotal) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">compliance</p>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  complianceScore === complianceTotal
                    ? 'bg-green-500'
                    : complianceScore > complianceTotal * 0.7
                      ? 'bg-amber-500'
                      : 'bg-red-500',
                )}
                style={{ width: `${(complianceScore / complianceTotal) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="text-sm font-semibold">PSD2 Requirements Checklist</h3>
            </div>
            <div className="divide-y">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {
                      setChecklist((prev) =>
                        prev.map((c) => (c.id === item.id ? { ...c, checked: !c.checked } : c)),
                      );
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary/40 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                        {item.article}
                      </span>
                    </div>
                  </div>
                  {item.checked ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Open Banking & PSD2"
        subtitle="Manage third-party provider registrations, customer consents, and PSD2 compliance"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">PSD2 Compliant</span>
            </div>
            <button
              onClick={() => setShowRegister(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register TPP
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        <OpenBankingStatsRow
          registeredTpps={registeredCount}
          activeTpps={activeCount}
          suspendedTpps={inactiveCount}
          totalConsents={totalConsents}
          apiCallsToday={apiCallsToday}
          loading={clientsLoading}
        />

        <ComplianceStatusBanner lastAuditDate="2026-02-15T00:00:00Z" />

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>

      <RegisterTppSheet
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSubmit={(payload, callbacks) =>
          registerTpp.mutate(
            {
              name: payload.name,
              redirectUri: payload.redirectUri,
              scopes: payload.scopes,
              clientType: payload.clientType,
            },
            callbacks,
          )
        }
        isPending={registerTpp.isPending}
      />

      <AuthoriseConsentDialog
        open={!!authoriseTarget}
        consent={authoriseTarget}
        onClose={() => setAuthoriseTarget(null)}
        onAuthorise={handleAuthorise}
        isPending={authoriseConsent.isPending}
      />

      <RevokeConsentDialog
        open={!!revokeTarget}
        consent={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onRevoke={handleRevoke}
        isPending={revokeConsent.isPending}
      />
    </>
  );
}

// ── Customer consent results sub-component ───────────────────────────────────

function CustomerConsentResults({
  customerId,
  onRevoke,
}: {
  customerId: string;
  onRevoke: (consent: ApiConsent) => void;
}) {
  const { data: consents = [], isLoading } = useCustomerConsents(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (consents.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No consents found for customer {customerId}.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {consents.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.tppClientName ?? c.clientId}</span>
              <StatusBadge status={c.status} dot size="sm" />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {c.scopes.map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{s}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground">Expires {formatDate(c.expiresAt)}</span>
            {c.status === 'AUTHORISED' && (
              <button
                onClick={() => onRevoke(c)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <Ban className="w-3 h-3" />
                Revoke
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
