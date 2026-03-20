import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle2,
  Ban,
  AlertTriangle,
  User,
  Building2,
  RefreshCw,
  Key,
} from 'lucide-react';

import { useConsents, useAuthoriseConsent, useRevokeConsent } from '../hooks/useOpenBanking';
import type { ConsentStatus } from '../api/openBankingApi';
import { ConsentDetailCard } from '../components/consent/ConsentDetailCard';
import { ConsentTimeline } from '../components/consent/ConsentTimeline';
import { ConsentScopeVisualizer } from '../components/consent/ConsentScopeVisualizer';
import { AuthoriseConsentDialog } from '../components/consent/AuthoriseConsentDialog';
import { RevokeConsentDialog } from '../components/consent/RevokeConsentDialog';
import { CustomerConsentSummary } from '../components/consent/CustomerConsentSummary';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<ConsentStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  AUTHORISED: 'success',
  PENDING: 'warning',
  REVOKED: 'danger',
  EXPIRED: 'default',
};

const STATUS_ICON: Record<ConsentStatus, React.ElementType> = {
  AUTHORISED: CheckCircle2,
  PENDING: Clock,
  REVOKED: Ban,
  EXPIRED: AlertTriangle,
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground min-w-[160px]">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ConsentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [authoriseOpen, setAuthoriseOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const { data: consents = [], isLoading } = useConsents();
  const consent = useMemo(() => consents.find(c => String(c.id) === id), [consents, id]);

  const { data: allConsents = [] } = useConsents();
  const customerConsents = useMemo(
    () => allConsents.filter(c => consent && c.customerId === consent.customerId),
    [allConsents, consent],
  );

  const authorise = useAuthoriseConsent();
  const revoke = useRevokeConsent();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Consent not found.</p>
        <Button variant="ghost" onClick={() => navigate('/open-banking/consents')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Consents
        </Button>
      </div>
    );
  }

  const StatusIcon = STATUS_ICON[consent.status];
  const isExpired = new Date(consent.expiresAt) < new Date();
  const daysUntilExpiry = Math.ceil(
    (new Date(consent.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  function handleAuthorise(consentId: number, customerId: number) {
    authorise.mutate(
      { consentId, customerId },
      {
        onSuccess: () => { toast.success('Consent authorised'); setAuthoriseOpen(false); },
        onError: () => toast.error('Failed to authorise'),
      },
    );
  }

  function handleRevoke(consentId: number, reason?: string) {
    revoke.mutate(
      { consentId, reason },
      {
        onSuccess: () => { toast.success('Consent revoked'); setRevokeOpen(false); },
        onError: () => toast.error('Failed to revoke'),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Consent ${consent.consentId}`}
        description={`Customer ${consent.customerId} · ${consent.tppClientName ?? `TPP #${consent.tppClientId}`}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/open-banking/consents">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Consents
              </Link>
            </Button>
            {consent.status === 'PENDING' && (
              <Button size="sm" onClick={() => setAuthoriseOpen(true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Authorise
              </Button>
            )}
            {consent.status === 'AUTHORISED' && (
              <Button size="sm" variant="destructive" onClick={() => setRevokeOpen(true)}>
                <Ban className="mr-1.5 h-4 w-4" /> Revoke
              </Button>
            )}
          </div>
        }
      />

      {/* Status Banner */}
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg border',
        consent.status === 'AUTHORISED' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' :
        consent.status === 'PENDING' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900' :
        consent.status === 'REVOKED' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900' :
        'bg-muted border-border',
      )}>
        <StatusIcon className={cn(
          'h-5 w-5',
          consent.status === 'AUTHORISED' ? 'text-green-600' :
          consent.status === 'PENDING' ? 'text-amber-600' :
          consent.status === 'REVOKED' ? 'text-red-600' : 'text-muted-foreground',
        )} />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {consent.status === 'AUTHORISED' && `Active consent · ${isExpired ? 'Expired' : daysUntilExpiry > 0 ? `Expires in ${daysUntilExpiry} days` : 'Expires today'}`}
            {consent.status === 'PENDING' && 'Awaiting customer authorisation'}
            {consent.status === 'REVOKED' && `Revoked${consent.revokeReason ? ` · ${consent.revokeReason}` : ''}`}
            {consent.status === 'EXPIRED' && 'Consent has expired'}
          </p>
          <p className="text-xs text-muted-foreground">
            Expires {formatDate(consent.expiresAt)}
          </p>
        </div>
        <StatusBadge status={STATUS_VARIANT[consent.status]}>{consent.status}</StatusBadge>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scopes">Scopes & Data</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="customer">Customer Profile</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <ConsentDetailCard consent={consent} />
        </TabsContent>

        {/* ── Scopes ──────────────────────────────────────────────────────── */}
        <TabsContent value="scopes">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" /> Authorised Data Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConsentScopeVisualizer scopes={consent.scopes} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Consent Lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <ConsentTimeline consent={consent} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Customer ────────────────────────────────────────────────────── */}
        <TabsContent value="customer">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Customer Consents Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerConsentSummary
                customerId={consent.customerId}
                consents={customerConsents}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AuthoriseConsentDialog
        consent={consent}
        open={authoriseOpen}
        onOpenChange={setAuthoriseOpen}
        onConfirm={handleAuthorise}
        isLoading={authorise.isPending}
      />

      <RevokeConsentDialog
        consent={consent}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onConfirm={handleRevoke}
        isLoading={revoke.isPending}
      />
    </div>
  );
}
