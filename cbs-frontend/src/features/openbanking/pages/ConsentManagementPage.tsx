import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
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
  SlidersHorizontal,
  Loader2,
  Shield,
} from 'lucide-react';

import { useConsents, useCreateConsent, useAuthoriseConsent, useRevokeConsent, useTppClients } from '../hooks/useOpenBanking';
import type { ConsentStatus } from '../api/openBankingApi';
import { ConsentTable } from '../components/consent/ConsentTable';
import { CreateConsentSheet } from '../components/consent/CreateConsentSheet';
import { AuthoriseConsentDialog } from '../components/consent/AuthoriseConsentDialog';
import { RevokeConsentDialog } from '../components/consent/RevokeConsentDialog';
import { BulkConsentActions } from '../components/consent/BulkConsentActions';
import { ConsentExpiryTracker } from '../components/consent/ConsentExpiryTracker';

// ─── Status chips ─────────────────────────────────────────────────────────────

const STATUS_CHIPS = [
  { status: 'AUTHORISED' as ConsentStatus, icon: CheckCircle2, label: 'Authorised', color: 'text-green-600' },
  { status: 'PENDING' as ConsentStatus, icon: Clock, label: 'Pending', color: 'text-amber-600' },
  { status: 'REVOKED' as ConsentStatus, icon: Ban, label: 'Revoked', color: 'text-red-600' },
  { status: 'EXPIRED' as ConsentStatus, icon: AlertTriangle, label: 'Expired', color: 'text-gray-500' },
] as const;

// ─── Page ────────────────────────────────────────────────────────────────────

export function ConsentManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tppFilter, setTppFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [authoriseId, setAuthoriseId] = useState<number | null>(null);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: consents = [], isLoading, refetch, isFetching } = useConsents();
  const { data: tppClients = [] } = useTppClients();
  const createConsent = useCreateConsent();
  const authorise = useAuthoriseConsent();
  const revoke = useRevokeConsent();

  const filtered = useMemo(() => {
    return consents.filter(c => {
      const matchSearch =
        !search ||
        c.consentId.toLowerCase().includes(search.toLowerCase()) ||
        String(c.customerId).includes(search) ||
        (c.tppClientName?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchTpp = tppFilter === 'ALL' || String(c.tppClientId) === tppFilter;
      return matchSearch && matchStatus && matchTpp;
    });
  }, [consents, search, statusFilter, tppFilter]);

  const statCounts = useMemo(() => {
    const counts: Record<ConsentStatus, number> = { AUTHORISED: 0, PENDING: 0, REVOKED: 0, EXPIRED: 0 };
    consents.forEach(c => { counts[c.status] = (counts[c.status] ?? 0) + 1; });
    return counts;
  }, [consents]);

  const expiringConsents = useMemo(() => {
    const in7d = new Date();
    in7d.setDate(in7d.getDate() + 7);
    return consents.filter(c => c.status === 'AUTHORISED' && new Date(c.expiresAt) <= in7d);
  }, [consents]);

  const authoriseTarget = authoriseId !== null ? consents.find(c => c.id === authoriseId) : undefined;
  const revokeTarget = revokeId !== null ? consents.find(c => c.id === revokeId) : undefined;

  function handleAuthorise(consentId: number, customerId: number) {
    authorise.mutate(
      { consentId, customerId },
      {
        onSuccess: () => { toast.success('Consent authorised'); setAuthoriseId(null); },
        onError: () => toast.error('Failed to authorise consent'),
      },
    );
  }

  function handleRevoke(consentId: number, reason?: string) {
    revoke.mutate(
      { consentId, reason },
      {
        onSuccess: () => { toast.success('Consent revoked'); setRevokeId(null); },
        onError: () => toast.error('Failed to revoke consent'),
      },
    );
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
        {/* Status Stat Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATUS_CHIPS.map(({ status, icon: Icon, label, color }) => (
            <button
              key={status}
              className={cn(
                'p-4 rounded-lg border bg-card text-left transition-colors hover:bg-muted/50',
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
        {expiringConsents.length > 0 && (
          <ConsentExpiryTracker consents={expiringConsents} />
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
              <option key={t.id} value={String(t.id)}>{t.name}</option>
            ))}
          </select>
          {selectedIds.length > 0 && (
            <BulkConsentActions
              selectedIds={selectedIds}
              onClear={() => setSelectedIds([])}
              onBulkRevoke={(ids) => {
                Promise.all(ids.map(id => revoke.mutateAsync({ consentId: id })))
                  .then(() => { toast.success(`${ids.length} consents revoked`); setSelectedIds([]); })
                  .catch(() => toast.error('Bulk revoke partially failed'));
              }}
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
        <div className="rounded-lg border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConsentTable
              consents={filtered}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onAuthorise={(c) => setAuthoriseId(c.id)}
              onRevoke={(c) => setRevokeId(c.id)}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateConsentSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        tppClients={tppClients}
        onCreate={(payload) =>
          createConsent.mutateAsync(payload).then(() => {
            toast.success('Consent created');
            setCreateOpen(false);
          })
        }
      />

      {authoriseTarget && (
        <AuthoriseConsentDialog
          consent={authoriseTarget}
          open={!!authoriseId}
          onOpenChange={(o) => { if (!o) setAuthoriseId(null); }}
          onConfirm={handleAuthorise}
          isLoading={authorise.isPending}
        />
      )}

      {revokeTarget && (
        <RevokeConsentDialog
          consent={revokeTarget}
          open={!!revokeId}
          onOpenChange={(o) => { if (!o) setRevokeId(null); }}
          onConfirm={handleRevoke}
          isLoading={revoke.isPending}
        />
      )}
    </div>
  );
}
