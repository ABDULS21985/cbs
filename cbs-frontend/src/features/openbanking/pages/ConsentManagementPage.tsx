import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Shield,
} from 'lucide-react';

import { useConsents, useCreateConsent, useAuthoriseConsent, useRevokeConsent } from '../hooks/useOpenBanking';
import { useTppClients } from '../hooks/useOpenBanking';
import type { ConsentStatus } from '../api/openBankingApi';
import { ConsentTable } from '../components/consent/ConsentTable';
import { CreateConsentSheet } from '../components/consent/CreateConsentSheet';
import { AuthoriseConsentDialog } from '../components/consent/AuthoriseConsentDialog';
import { RevokeConsentDialog } from '../components/consent/RevokeConsentDialog';
import { BulkConsentActions } from '../components/consent/BulkConsentActions';
import { ConsentExpiryTracker } from '../components/consent/ConsentExpiryTracker';

// ─── Status Stats ───────────────────────────────────────────────────────────

const STATUS_STATS = [
  { status: 'AUTHORISED' as ConsentStatus, icon: CheckCircle2, label: 'Authorised', color: 'text-green-600' },
  { status: 'PENDING' as ConsentStatus, icon: Clock, label: 'Pending', color: 'text-amber-600' },
  { status: 'REVOKED' as ConsentStatus, icon: Ban, label: 'Revoked', color: 'text-red-600' },
  { status: 'EXPIRED' as ConsentStatus, icon: AlertTriangle, label: 'Expired', color: 'text-gray-500' },
];

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

  const authoriseConsent = authorise;
  const revokeConsent = revoke;

  function handleAuthorise(consentId: number, customerId: number) {
    authoriseConsent.mutate(
      { consentId, customerId },
      {
        onSuccess: () => { toast.success('Consent authorised'); setAuthoriseId(null); },
        onError: () => toast.error('Failed to authorise consent'),
      },
    );
  }

  function handleRevoke(consentId: number, reason?: string) {
    revokeConsent.mutate(
      { consentId, reason },
      {
        onSuccess: () => { toast.success('Consent revoked'); setRevokeId(null); },
        onError: () => toast.error('Failed to revoke consent'),
      },
    );
  }

  const authoriseTarget = authoriseId !== null ? consents.find(c => c.id === authoriseId) : undefined;
  const revokeTarget = revokeId !== null ? consents.find(c => c.id === revokeId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consent Management"
        description="Manage customer authorisations granted to third-party providers"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New Consent
            </Button>
          </div>
        }
      />

      {/* Status Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_STATS.map(({ status, icon: Icon, label, color }) => (
          <button
            key={status}
            className={`p-4 rounded-lg border bg-card text-left transition-colors hover:bg-muted/50 ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(s => s === status ? 'ALL' : status)}
          >
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${color}`} />
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
          <Input
            placeholder="Search by ID, customer, TPP…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-1.5 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="AUTHORISED">Authorised</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tppFilter} onValueChange={setTppFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="TPP Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All TPP Clients</SelectItem>
            {tppClients.map(t => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedIds.length > 0 && (
          <BulkConsentActions
            selectedIds={selectedIds}
            onClear={() => setSelectedIds([])}
            onBulkRevoke={(ids) => {
              Promise.all(ids.map(id => revokeConsent.mutateAsync({ consentId: id })))
                .then(() => { toast.success(`${ids.length} consents revoked`); setSelectedIds([]); })
                .catch(() => toast.error('Bulk revoke partially failed'));
            }}
          />
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? 'Loading…' : `${filtered.length} of ${consents.length} consents`}
        </span>
        {(search || statusFilter !== 'ALL' || tppFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setStatusFilter('ALL'); setTppFilter('ALL'); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ConsentTable
            consents={filtered}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onAuthorise={(c) => setAuthoriseId(c.id)}
            onRevoke={(c) => setRevokeId(c.id)}
          />
        </CardContent>
      </Card>

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
