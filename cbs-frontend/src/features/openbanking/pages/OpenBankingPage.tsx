import { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Loader2,
  XCircle,
  KeyRound,
  Users,
  Activity,
  Ban,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  useTppClients,
  useCustomerConsents,
  useRegisterTppClient,
  useRevokeConsent,
} from '../hooks/useOpenBanking';
import type { TppClientType, ConsentStatus } from '../api/openBankingApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLIENT_TYPE_STYLES: Record<TppClientType, string> = {
  TPP_AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TPP_PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TPP_BOTH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const CLIENT_TYPE_LABEL: Record<TppClientType, string> = {
  TPP_AISP: 'AISP',
  TPP_PISP: 'PISP',
  TPP_BOTH: 'BOTH',
};

const CONSENT_STATUS_STYLES: Record<ConsentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  AUTHORISED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REVOKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-muted text-muted-foreground',
};

const AVAILABLE_SCOPES = ['accounts', 'transactions', 'payments', 'balance', 'beneficiaries'];

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Register TPP Dialog ──────────────────────────────────────────────────────

interface RegisterTppDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    redirectUri: string;
    scopes: string[];
    clientType: TppClientType;
  }) => void;
  isPending: boolean;
}

function RegisterTppDialog({ open, onClose, onSubmit, isPending }: RegisterTppDialogProps) {
  const [form, setForm] = useState({
    name: '',
    redirectUri: '',
    clientType: 'TPP_AISP' as TppClientType,
    scopes: [] as string[],
  });

  if (!open) return null;

  const toggleScope = (scope: string) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter((s) => s !== scope)
        : [...f.scopes, scope],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">Register TPP Client</h2>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Name</label>
              <input
                required
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. FinTech Payments Ltd"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Redirect URI</label>
              <input
                required
                type="url"
                className={inputCls}
                value={form.redirectUri}
                onChange={(e) => setForm((f) => ({ ...f, redirectUri: e.target.value }))}
                placeholder="https://app.example.com/callback"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Type</label>
              <select
                className={inputCls}
                value={form.clientType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientType: e.target.value as TppClientType }))
                }
              >
                <option value="TPP_AISP">AISP — Account Information</option>
                <option value="TPP_PISP">PISP — Payment Initiation</option>
                <option value="TPP_BOTH">Both (AISP + PISP)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      form.scopes.includes(scope)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border',
                    )}
                  >
                    {scope}
                  </button>
                ))}
              </div>
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
                disabled={isPending || form.scopes.length === 0}
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

// ─── Revoke Consent Dialog ────────────────────────────────────────────────────

interface RevokeDialogProps {
  open: boolean;
  consentId: string | number;
  tppName: string;
  onClose: () => void;
  onRevoke: (consentId: string | number, reason?: string) => void;
  isPending: boolean;
}

function RevokeDialog({ open, consentId, tppName, onClose, onRevoke, isPending }: RevokeDialogProps) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Revoke Consent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Revoke access for <strong>{tppName}</strong>. This action cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Reason (optional)
              </label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer request, fraud suspicion, etc."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onRevoke(consentId, reason || undefined)}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Consents Section ─────────────────────────────────────────────────────────

function ConsentsSection() {
  const [customerId, setCustomerId] = useState('');
  const [searchId, setSearchId] = useState('');
  const { data: consents = [], isLoading } = useCustomerConsents(searchId);
  const { mutate: revoke, isPending: revoking } = useRevokeConsent(searchId);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string | number; tppName: string } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchId(customerId.trim());
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Customer Consents</h3>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-40"
            placeholder="Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {!searchId ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <KeyRound className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Enter a customer ID to view their consents</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">TPP Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Scopes</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Expires At</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {consents.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{c.tppClientName ?? `TPP #${c.tppClientId}`}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.scopes.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(c.expiresAt)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        CONSENT_STATUS_STYLES[c.status],
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {c.status === 'AUTHORISED' ? (
                      <button
                        onClick={() =>
                          setRevokeTarget({ id: c.consentId, tppName: c.tppClientName ?? 'TPP' })
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <Ban className="w-3 h-3" />
                        Revoke
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {consents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No consents found for customer {searchId}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {revokeTarget && (
        <RevokeDialog
          open
          consentId={revokeTarget.id}
          tppName={revokeTarget.tppName}
          onClose={() => setRevokeTarget(null)}
          onRevoke={(id, reason) =>
            revoke({ consentId: id, reason }, { onSuccess: () => setRevokeTarget(null) })
          }
          isPending={revoking}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function OpenBankingPage() {
  const { data: clients = [], isLoading: clientsLoading } = useTppClients();
  const { mutate: registerTpp, isPending: registering } = useRegisterTppClient();
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  const registeredCount = clients.length;
  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const suspendedCount = clients.filter((c) => c.status === 'SUSPENDED').length;

  const statCards = [
    { label: 'Registered TPPs', value: registeredCount, icon: Users, color: 'text-blue-600' },
    { label: 'Active Clients', value: activeCount, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Suspended', value: suspendedCount, icon: Ban, color: 'text-red-500' },
    { label: 'API Calls Today', value: '—', icon: Activity, color: 'text-purple-600' },
  ];

  return (
    <>
      <PageHeader
        title="Open Banking & PSD2"
        subtitle="Manage third-party provider registrations, customer consents, and PSD2 compliance."
        actions={
          <div className="flex items-center gap-2">
            {/* PSD2 Compliance Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">PSD2 Compliant</span>
            </div>
            <button
              onClick={() => setShowRegisterDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register TPP
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* PSD2 Info Banner */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 px-5 py-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            All TPP clients must be registered and authorised before accessing customer data. Consents
            are customer-driven and can be revoked at any time. Scopes follow the PSD2 / Open Banking
            specification.
          </p>
        </div>

        {/* TPP Clients Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h3 className="text-sm font-semibold">Registered TPP Clients</h3>
          </div>
          {clientsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Client Name</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Redirect URI</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Scopes</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium">{client.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{client.clientId}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            CLIENT_TYPE_STYLES[client.clientType],
                          )}
                        >
                          {CLIENT_TYPE_LABEL[client.clientType]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">
                          {client.redirectUri}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {client.scopes.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium',
                            client.status === 'ACTIVE'
                              ? 'text-green-600'
                              : client.status === 'SUSPENDED'
                                ? 'text-red-500'
                                : 'text-muted-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              client.status === 'ACTIVE'
                                ? 'bg-green-500'
                                : client.status === 'SUSPENDED'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400',
                            )}
                          />
                          {client.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {formatDate(client.registeredAt)}
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No TPP clients registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Consents Section */}
        <ConsentsSection />
      </div>

      <RegisterTppDialog
        open={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
        onSubmit={(payload) =>
          registerTpp(payload, { onSuccess: () => setShowRegisterDialog(false) })
        }
        isPending={registering}
      />
    </>
  );
}
