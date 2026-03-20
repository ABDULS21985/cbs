import { StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Ban, KeyRound, User } from 'lucide-react';
import type { ApiConsent } from '../../api/openBankingApi';

interface CustomerConsentSummaryProps {
  customerId: number | string;
  consents: ApiConsent[];
  onRevoke?: (consent: ApiConsent) => void;
}

export function CustomerConsentSummary({ customerId, consents, onRevoke }: CustomerConsentSummaryProps) {
  const activeConsents = consents.filter((c) => c.status === 'AUTHORISED');
  const tppMap = new Map<string, ApiConsent[]>();

  consents.forEach((c) => {
    const tppName = c.tppClientName ?? `TPP #${c.tppClientId}`;
    if (!tppMap.has(tppName)) tppMap.set(tppName, []);
    tppMap.get(tppName)!.push(c);
  });

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Customer header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Customer #{customerId}</h3>
            <p className="text-xs text-muted-foreground">
              {activeConsents.length} active consent{activeConsents.length !== 1 ? 's' : ''} across{' '}
              {tppMap.size} TPP{tppMap.size !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="w-3.5 h-3.5" />
          {consents.length} total
        </div>
      </div>

      {/* TPP consent cards */}
      <div className="divide-y">
        {Array.from(tppMap.entries()).map(([tppName, tppConsents]) => (
          <div key={tppName} className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">{tppName}</h4>
              <span className="text-xs text-muted-foreground">
                {tppConsents.filter((c) => c.status === 'AUTHORISED').length} active
              </span>
            </div>

            <div className="space-y-2">
              {tppConsents.map((consent) => (
                <div
                  key={consent.id}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3',
                    consent.status === 'AUTHORISED'
                      ? 'bg-green-50/50 dark:bg-green-900/5 border-green-200/50 dark:border-green-800/30'
                      : 'bg-muted/20',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground truncate">
                        {consent.consentId}
                      </code>
                      <StatusBadge status={consent.status} dot size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {consent.scopes.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires {formatDate(consent.expiresAt)}
                    </p>
                  </div>

                  {consent.status === 'AUTHORISED' && onRevoke && (
                    <button
                      onClick={() => onRevoke(consent)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex-shrink-0"
                    >
                      <Ban className="w-3 h-3" />
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {consents.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No consents found for this customer.
          </div>
        )}
      </div>
    </div>
  );
}
