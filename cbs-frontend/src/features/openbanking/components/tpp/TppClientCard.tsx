import { StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Globe, KeyRound } from 'lucide-react';
import type { TppClient, TppClientType } from '../../api/openBankingApi';

const CLIENT_TYPE_STYLES: Partial<Record<TppClientType, string>> = {
  TPP_AISP: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TPP_PISP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TPP_CBPII: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  INTERNAL: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  PARTNER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SANDBOX: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const CLIENT_TYPE_LABEL: Partial<Record<TppClientType, string>> = {
  TPP_AISP: 'AISP',
  TPP_PISP: 'PISP',
  TPP_CBPII: 'CBPII',
  INTERNAL: 'Internal',
  PARTNER: 'Partner',
  SANDBOX: 'Sandbox',
};

interface TppClientCardProps {
  client: TppClient;
  onClick?: (client: TppClient) => void;
}

export function TppClientCard({ client, onClick }: TppClientCardProps) {
  return (
    <div
      onClick={() => onClick?.(client)}
      className={cn(
        'rounded-xl border bg-card p-5 space-y-3 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{client.name}</h3>
          <code className="text-xs text-muted-foreground font-mono">{client.clientId}</code>
        </div>
        <StatusBadge status={client.status} dot size="sm" />
      </div>

      {/* Type */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            CLIENT_TYPE_STYLES[client.clientType],
          )}
        >
          {CLIENT_TYPE_LABEL[client.clientType]}
        </span>
      </div>

      {/* Redirect URI */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate font-mono">{client.redirectUri}</span>
      </div>

      {/* Scopes */}
      <div className="flex flex-wrap gap-1">
        {client.scopes.map((scope) => (
          <span key={scope} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {scope}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
        <span>Registered {formatDate(client.registeredAt)}</span>
        {client.activeConsents !== undefined && (
          <span className="flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            {client.activeConsents} consents
          </span>
        )}
      </div>
    </div>
  );
}
