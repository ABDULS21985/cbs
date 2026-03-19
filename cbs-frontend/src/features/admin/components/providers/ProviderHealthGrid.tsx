import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceProvider, ProviderStatus } from '../../api/providerApi';

interface ProviderHealthGridProps {
  providers: ServiceProvider[];
  onProviderClick: (id: string) => void;
}

const statusDot: Record<ProviderStatus, string> = {
  HEALTHY: 'bg-green-500',
  DEGRADED: 'bg-amber-500',
  DOWN: 'bg-red-500',
  MAINTENANCE: 'bg-blue-500',
};

const statusBorder: Record<ProviderStatus, string> = {
  HEALTHY: 'border-green-200 dark:border-green-800',
  DEGRADED: 'border-amber-200 dark:border-amber-800',
  DOWN: 'border-red-300 dark:border-red-800',
  MAINTENANCE: 'border-blue-200 dark:border-blue-800',
};

const statusBg: Record<ProviderStatus, string> = {
  HEALTHY: 'hover:bg-green-50/30 dark:hover:bg-green-900/10',
  DEGRADED: 'hover:bg-amber-50/30 dark:hover:bg-amber-900/10',
  DOWN: 'hover:bg-red-50/30 dark:hover:bg-red-900/10',
  MAINTENANCE: 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10',
};

const TYPE_LABELS: Record<string, string> = {
  IDENTITY: 'Identity',
  PAYMENT_SWITCH: 'Payment Switch',
  CREDIT_BUREAU: 'Credit Bureau',
  SMS: 'SMS',
  EMAIL: 'Email',
  PUSH: 'Push',
  INSURANCE: 'Insurance',
  REMITTANCE: 'Remittance',
  USSD: 'USSD',
  CARD_SCHEME: 'Card Scheme',
};

export function ProviderHealthGrid({ providers, onProviderClick }: ProviderHealthGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map(provider => {
        const errorPct = provider.todayCalls > 0
          ? (provider.todayErrors / provider.todayCalls) * 100
          : 0;
        const highLatency = provider.avgLatencyMs > 300;
        const highErrors = errorPct > 1;

        return (
          <button
            key={provider.id}
            onClick={() => onProviderClick(provider.id)}
            className={cn(
              'text-left bg-card rounded-lg border p-4 transition-all cursor-pointer',
              statusBorder[provider.status],
              statusBg[provider.status],
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5', statusDot[provider.status])} />
                <span className="font-semibold text-sm truncate">{provider.name}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                {TYPE_LABELS[provider.type] || provider.type}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {/* Uptime */}
              <div>
                <p className="text-muted-foreground">Uptime</p>
                <p className={cn(
                  'font-semibold mt-0.5',
                  provider.uptime >= 99.9 ? 'text-green-600 dark:text-green-400'
                    : provider.uptime >= 98 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400',
                )}>
                  {provider.uptime.toFixed(2)}%
                </p>
              </div>

              {/* Latency */}
              <div>
                <p className="text-muted-foreground">Avg Latency</p>
                <p className={cn(
                  'font-semibold mt-0.5 flex items-center gap-1',
                  !highLatency ? 'text-green-600 dark:text-green-400'
                    : provider.avgLatencyMs <= 500 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400',
                )}>
                  {provider.avgLatencyMs}ms
                  {highLatency && <AlertTriangle className="w-3 h-3" />}
                </p>
              </div>

              {/* Today calls */}
              <div>
                <p className="text-muted-foreground">Today's Calls</p>
                <p className="font-semibold mt-0.5">{provider.todayCalls.toLocaleString()}</p>
              </div>

              {/* Today errors */}
              <div>
                <p className="text-muted-foreground">Errors Today</p>
                <p className={cn(
                  'font-semibold mt-0.5 flex items-center gap-1',
                  !highErrors ? 'text-foreground' : 'text-red-600 dark:text-red-400',
                )}>
                  {provider.todayErrors.toLocaleString()}
                  {provider.todayCalls > 0 && (
                    <span className="font-normal">({errorPct.toFixed(1)}%)</span>
                  )}
                  {highErrors && <AlertTriangle className="w-3 h-3" />}
                </p>
              </div>
            </div>

            {/* Status footer */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                provider.status === 'HEALTHY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : provider.status === 'DEGRADED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : provider.status === 'DOWN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              )}>
                {provider.status}
              </span>
              <span className="text-xs text-muted-foreground">{provider.code}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
