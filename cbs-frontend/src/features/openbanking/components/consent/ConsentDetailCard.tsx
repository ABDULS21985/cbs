import { InfoGrid, StatusBadge } from '@/components/shared';
import { KeyRound } from 'lucide-react';
import type { ApiConsent } from '../../api/openBankingApi';

interface ConsentDetailCardProps {
  consent: ApiConsent;
}

export function ConsentDetailCard({ consent }: ConsentDetailCardProps) {
  const items = [
    { label: 'Consent ID', value: consent.consentId, mono: true, copyable: true },
    { label: 'Status', value: <StatusBadge status={consent.status} dot /> },
    { label: 'TPP Client', value: consent.tppClientName ?? consent.clientId },
    { label: 'Customer ID', value: String(consent.customerId), mono: true },
    { label: 'Created', value: consent.createdAt, format: 'datetime' as const },
    { label: 'Expires', value: consent.expiresAt, format: 'datetime' as const },
    ...(consent.authorisedAt
      ? [{ label: 'Authorised', value: consent.authorisedAt, format: 'datetime' as const }]
      : []),
    ...(consent.revokedAt
      ? [{ label: 'Revoked', value: consent.revokedAt, format: 'datetime' as const }]
      : []),
    ...(consent.revokeReason
      ? [{ label: 'Revoke Reason', value: consent.revokeReason, span: 2 }]
      : []),
  ];

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Consent Details</h3>
      </div>
      <div className="p-5">
        <InfoGrid items={items} columns={3} />
      </div>
    </div>
  );
}
