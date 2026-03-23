import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Ban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Loader2,
} from 'lucide-react';

import { useConsents, useCreateConsent, useAuthoriseConsent, useRevokeConsent, useTppClients } from '../hooks/useOpenBanking';
import type { ApiConsent, ConsentStatus } from '../api/openBankingApi';
import { ConsentTable } from '../components/consent/ConsentTable';
import { CreateConsentSheet } from '../components/consent/CreateConsentSheet';
import { AuthoriseConsentDialog } from '../components/consent/AuthoriseConsentDialog';
import { RevokeConsentDialog } from '../components/consent/RevokeConsentDialog';
import { BulkConsentActions } from '../components/consent/BulkConsentActions';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CHIPS = [
  { status: 'AUTHORISED' as ConsentStatus, icon: CheckCircle2, label: 'Authorised', color: 'text-green-600' },
  { status: 'PENDING' as ConsentStatus, icon: Clock, label: 'Pending', color: 'text-amber-600' },
  { status: 'REJECTED' as ConsentStatus, icon: Ban, label: 'Rejected', color: 'text-orange-600' },
  { status: 'REVOKED' as ConsentStatus, icon: Ban, label: 'Revoked', color: 'text-red-600' },
  { status: 'EXPIRED' as ConsentStatus, icon: AlertTriangle, label: 'Expired', color: 'text-gray-500' },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export function ConsentManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tppFilter, setTppFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [authoriseConsent, setAuthoriseConsent] = useState<ApiConsent | null>(null);
  const [revokeConsent, setRevokeConsent] = useState<ApiConsent | null>(null);
  const [selectedConsents, setSelectedConsents] = useState<ApiConsent[]>([]);

  const { data: consents = [], isLoading, refetch, isFetching } = useConsents();
  const { data: tppClients = [] } = useTppClients();
  const createConsentMutation = useCreateConsent();
  const authoriseMutation = useAuthoriseConsent();
  const revokeMutation = useRevokeConsent();

  const filtered = useMemo(() => {
    return consents.filter(c => {
      const matchSearch =
        !search ||
        c.consentId.toLowerCase().includes(search.toLowerCase()) ||
        String(c.customerId).includes(search) ||
        (c.tppClientName?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchTpp = tppFilter === 'ALL' || c.clientId === tppFilter;
      return matchSearch && matchStatus && matchTpp;
    });
  }, [consents, search, statusFilter, tppFilter]);

  const statCounts = useMemo(() => {
    const counts: Record<ConsentStatus, number> = { AUTHORISED: 0, PENDING: 0, REJECTED: 0, REVOKED: 0, EXPIRED: 0 };
    consents.forEach(c => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
    return counts;
  }, [consents]);

  const expiringNow = useMemo(() => {
    const in7d = new Date();
    in7d.setDate(in7d.getDate() + 7);
    return consents.filter(c => c.status === 'AUTHORISED' && new Date(c.expiresAt) <= in7d);
  }, [consents]);

  function handleAuthorise(consentId: string | number, customerId: number) {
    authoriseMutation.mutate(
      { consentId, customerId },
      {
        onSuccess: () => { toast.success('Consent authorised'); setAuthoriseConsent(null); },
        onError: () => toast.error('Failed to authorise consent'),
      },
    );
  }

  function handleRevoke(consentId: string | number, reason?: string) {
    revokeMutation.mutate(
      { consentId, reason },
      {
        onSuccess: () => { toast.success('Consent revoked'); setRevokeConsent(null); },
        onError: () => toast.error('Failed to revoke consent'),
      },
    );
  }

  function handleBulkRevoke() {
    Promise.all(selectedConsents.map(c => revokeMutation.mutateAsync({ consentId: c.consentId })))
      .then(() => { toast.success(`${selectedConsents.length} consents revoked`); setSelectedConsents([]); })
      .catch(() => toast.error('Bulk revoke partially failed'));
  }

  const hasFilters = search || statusFilter !== 'ALL' || tppFilter !== 'ALL';

  return (
    <div className="space-y-0">
      <PageHeader
        title="Consent Management"
        subtitle="Manage customer authorisations granted to third-party providers"
        actions={
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> New Consent
            </button>
          </div>
        }
      />

      <div className="px-6 space-y-6">
        {/* Status Chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATUS_CHIPS.map(({ status, icon: Icon, label, color }) => (
            <button
              key={status}
              className={cn(
                'p-4 surface-card text-left transition-colors hover:bg-muted/50',
                statusFilter === status ? 'ring-2 ring-primary' : '',
              )}
              onClick={() => setStatusFilter(s => s === status ? 'ALL' : status)}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-6 w-6', color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{statCounts[status]}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Expiry Alert */}
        {expiringNow.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>{expiringNow.length} consent{expiringNow.length > 1 ? 's' : ''}</strong> will expire within the next 7 days.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, customer, TPP…"
              className="w-full pl-9 pr-3 py-1.5 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="AUTHORISED">Authorised</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVOKED">Revoked</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select
            className="px-3 py-1.5 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={tppFilter}
            onChange={e => setTppFilter(e.target.value)}
          >
            <option value="ALL">All TPP Clients</option>
            {tppClients.map(t => (
              <option key={t.clientId} value={t.clientId}>{t.name}</option>
            ))}
          </select>
          {selectedConsents.length > 0 && (
            <BulkConsentActions
              selectedCount={selectedConsents.length}
              onAuthoriseAll={() => toast.info('Bulk authorise not available for existing consents')}
              onRevokeAll={handleBulkRevoke}
              onClear={() => setSelectedConsents([])}
              isRevoking={revokeMutation.isPending}
            />
          )}
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? 'Loading…' : `${filtered.length} of ${consents.length} consents`}
          </span>
          {hasFilters && (
            <button
              className="text-primary hover:underline text-xs"
              onClick={() => { setSearch(''); setStatusFilter('ALL'); setTppFilter('ALL'); }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="surface-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConsentTable
              consents={filtered}
              enableRowSelection
              onRowSelectionChange={setSelectedConsents}
              onAuthorise={setAuthoriseConsent}
              onRevoke={setRevokeConsent}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateConsentSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tppClients={tppClients}
        isPending={createConsentMutation.isPending}
        onSubmit={(payload, callbacks) => {
          createConsentMutation.mutate(payload, {
            onSuccess: () => { toast.success('Consent created'); setCreateOpen(false); callbacks.onSuccess(); },
            onError: () => { toast.error('Failed to create consent'); callbacks.onError(); },
          });
        }}
      />

      <AuthoriseConsentDialog
        open={!!authoriseConsent}
        consent={authoriseConsent ?? null}
        onClose={() => setAuthoriseConsent(null)}
        onAuthorise={handleAuthorise}
        isPending={authoriseMutation.isPending}
      />

      <RevokeConsentDialog
        open={!!revokeConsent}
        consent={revokeConsent ?? null}
        onClose={() => setRevokeConsent(null)}
        onRevoke={handleRevoke}
        isPending={revokeMutation.isPending}
      />
    </div>
  );
}
