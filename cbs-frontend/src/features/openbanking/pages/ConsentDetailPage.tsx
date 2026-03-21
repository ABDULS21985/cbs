import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TabsPage } from '@/components/shared/TabsPage';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Key,
  Loader2,
  User,
} from 'lucide-react';

import { useConsents, useAuthoriseConsent, useRevokeConsent } from '../hooks/useOpenBanking';
import type { ConsentStatus } from '../api/openBankingApi';
import { ConsentDetailCard } from '../components/consent/ConsentDetailCard';
import { ConsentTimeline, type ConsentTimelineEvent } from '../components/consent/ConsentTimeline';
import { ConsentScopeVisualizer } from '../components/consent/ConsentScopeVisualizer';
import { AuthoriseConsentDialog } from '../components/consent/AuthoriseConsentDialog';
import { RevokeConsentDialog } from '../components/consent/RevokeConsentDialog';
import { CustomerConsentSummary } from '../components/consent/CustomerConsentSummary';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BG: Record<ConsentStatus, string> = {
  AUTHORISED: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900',
  PENDING: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900',
  REJECTED: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900',
  REVOKED: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900',
  EXPIRED: 'bg-muted border-border',
};

const STATUS_ICON: Record<ConsentStatus, React.ElementType> = {
  AUTHORISED: CheckCircle2,
  PENDING: Clock,
  REJECTED: Ban,
  REVOKED: Ban,
  EXPIRED: AlertTriangle,
};

const STATUS_ICON_COLOR: Record<ConsentStatus, string> = {
  AUTHORISED: 'text-green-600',
  PENDING: 'text-amber-600',
  REJECTED: 'text-orange-600',
  REVOKED: 'text-red-600',
  EXPIRED: 'text-muted-foreground',
};

// ─── Build timeline events from consent ───────────────────────────────────────

function buildTimelineEvents(consent: {
  createdAt: string;
  authorisedAt?: string;
  revokedAt?: string;
  expiresAt: string;
  status: ConsentStatus;
  revokeReason?: string;
}): ConsentTimelineEvent[] {
  const events: ConsentTimelineEvent[] = [
    {
      id: 'created',
      type: 'created',
      title: 'Consent Created',
      description: 'Consent request initiated by TPP',
      timestamp: consent.createdAt,
    },
  ];

  if (consent.authorisedAt) {
    events.push({
      id: 'authorised',
      type: 'authorised',
      title: 'Consent Authorised',
      description: 'Customer granted access',
      timestamp: consent.authorisedAt,
    });
  }

  if (consent.revokedAt) {
    events.push({
      id: 'revoked',
      type: 'revoked',
      title: 'Consent Revoked',
      description: consent.revokeReason ?? 'Access withdrawn',
      timestamp: consent.revokedAt,
    });
  }

  if (consent.status === 'EXPIRED') {
    events.push({
      id: 'expired',
      type: 'expired',
      title: 'Consent Expired',
      description: 'Consent validity period ended',
      timestamp: consent.expiresAt,
    });
  }

  return events;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ConsentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [authoriseOpen, setAuthoriseOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const { data: consents = [], isLoading } = useConsents();
  const consent = useMemo(() => consents.find(c => String(c.id) === id), [consents, id]);

  const customerConsents = useMemo(
    () => consents.filter(c => consent && c.customerId === consent.customerId),
    [consents, consent],
  );

  const timelineEvents = useMemo(
    () => consent ? buildTimelineEvents(consent) : [],
    [consent],
  );

  const authorise = useAuthoriseConsent();
  const revoke = useRevokeConsent();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Consent not found.</p>
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => navigate('/open-banking/consents')}
        >
          ← Back to Consents
        </button>
      </div>
    );
  }

  const StatusIcon = STATUS_ICON[consent.status];
  const daysUntilExpiry = Math.ceil(
    (new Date(consent.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  function handleAuthorise(consentId: string | number, customerId: number) {
    authorise.mutate(
      { consentId, customerId },
      {
        onSuccess: () => { toast.success('Consent authorised'); setAuthoriseOpen(false); },
        onError: () => toast.error('Failed to authorise'),
      },
    );
  }

  function handleRevoke(consentId: string | number, reason?: string) {
    revoke.mutate(
      { consentId, reason },
      {
        onSuccess: () => { toast.success('Consent revoked'); setRevokeOpen(false); },
        onError: () => toast.error('Failed to revoke'),
      },
    );
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="p-6">
          <ConsentDetailCard consent={consent} />
        </div>
      ),
    },
    {
      id: 'scopes',
      label: 'Scopes & Data',
      content: (
        <div className="p-6">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" /> Authorised Data Access
            </h3>
            <ConsentScopeVisualizer scopes={consent.scopes} />
          </div>
        </div>
      ),
    },
    {
      id: 'timeline',
      label: 'Timeline',
      content: (
        <div className="p-6">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Consent Lifecycle</h3>
            <ConsentTimeline events={timelineEvents} />
          </div>
        </div>
      ),
    },
    {
      id: 'customer',
      label: 'Customer',
      content: (
        <div className="p-6">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Customer Consents Summary
            </h3>
            <CustomerConsentSummary
              customerId={consent.customerId}
              consents={customerConsents}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-0">
      <PageHeader
        title={`Consent ${consent.consentId}`}
        subtitle={`Customer ${consent.customerId} · ${consent.tppClientName ?? consent.clientId}`}
        backTo="/open-banking/consents"
        actions={
          <div className="flex gap-2">
            {consent.status === 'PENDING' && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                onClick={() => setAuthoriseOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" /> Authorise
              </button>
            )}
            {consent.status === 'AUTHORISED' && (
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
                onClick={() => setRevokeOpen(true)}
              >
                <Ban className="h-4 w-4" /> Revoke
              </button>
            )}
          </div>
        }
      />

      {/* Status Banner */}
      <div className="px-6 pb-4">
        <div className={cn('flex items-center gap-3 p-4 rounded-lg border', STATUS_BG[consent.status])}>
          <StatusIcon className={cn('h-5 w-5 shrink-0', STATUS_ICON_COLOR[consent.status])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {consent.status === 'AUTHORISED' && (
                daysUntilExpiry > 0
                  ? `Active consent · Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
                  : 'Active consent · Expires today'
              )}
              {consent.status === 'PENDING' && 'Awaiting customer authorisation'}
              {consent.status === 'REJECTED' && 'Consent request was rejected'}
              {consent.status === 'REVOKED' && `Revoked${consent.revokeReason ? ` · ${consent.revokeReason}` : ''}`}
              {consent.status === 'EXPIRED' && 'Consent has expired'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Expires {formatDate(consent.expiresAt)}
            </p>
          </div>
          <StatusBadge status={consent.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t">
        <TabsPage tabs={tabs} />
      </div>

      {/* Dialogs */}
      <AuthoriseConsentDialog
        open={authoriseOpen}
        consent={consent}
        onClose={() => setAuthoriseOpen(false)}
        onAuthorise={handleAuthorise}
        isPending={authorise.isPending}
      />

      <RevokeConsentDialog
        open={revokeOpen}
        consent={consent}
        onClose={() => setRevokeOpen(false)}
        onRevoke={handleRevoke}
        isPending={revoke.isPending}
      />
    </div>
  );
}
