import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceProvider } from '../../api/providerApi';

interface ProviderHealthGridProps {
  providers: ServiceProvider[];
  onProviderClick: (id: number) => void;
}

const statusDot: Record<string, string> = {
  HEALTHY: 'bg-green-500',
  DEGRADED: 'bg-amber-500',
  DOWN: 'bg-red-500',
  UNKNOWN: 'bg-gray-400',
};

const statusBorder: Record<string, string> = {
  HEALTHY: 'border-green-200 dark:border-green-800',
  DEGRADED: 'border-amber-200 dark:border-amber-800',
  DOWN: 'border-red-300 dark:border-red-800',
  UNKNOWN: 'border-gray-200 dark:border-gray-700',
};

const statusBg: Record<string, string> = {
  HEALTHY: 'hover:bg-green-50/30 dark:hover:bg-green-900/10',
  DEGRADED: 'hover:bg-amber-50/30 dark:hover:bg-amber-900/10',
  DOWN: 'hover:bg-red-50/30 dark:hover:bg-red-900/10',
  UNKNOWN: 'hover:bg-gray-50/30 dark:hover:bg-gray-900/10',
};

const TYPE_LABELS: Record<string, string> = {
  KYC_PROVIDER: 'KYC',
  CREDIT_BUREAU: 'Credit Bureau',
  PAYMENT_GATEWAY: 'Payment Gateway',
  CARD_PROCESSOR: 'Card Processor',
  SMS_GATEWAY: 'SMS',
  EMAIL_SERVICE: 'Email',
  SWIFT: 'SWIFT',
  MARKET_DATA: 'Market Data',
  FRAUD_SCREENING: 'Fraud',
  AML_SCREENING: 'AML',
  DOCUMENT_VERIFICATION: 'Doc Verify',
  BIOMETRIC: 'Biometric',
  IDENTITY_VERIFICATION: 'Identity',
  INSURANCE: 'Insurance',
  RATING_AGENCY: 'Rating',
  CIT_COMPANY: 'CIT',
  PRINTING_SERVICE: 'Printing',
};

export function ProviderHealthGrid({ providers, onProviderClick }: ProviderHealthGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map(provider => {
        const hs = provider.healthStatus || 'UNKNOWN';
        const highLatency = (provider.actualAvgResponseTimeMs ?? 0) > 300;

        return (
          <button
            key={provider.id}
            onClick={() => onProviderClick(provider.id)}
            className={cn(
              'text-left bg-card rounded-lg border p-4 transition-all cursor-pointer',
              statusBorder[hs] || statusBorder.UNKNOWN,
              statusBg[hs] || statusBg.UNKNOWN,
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5', statusDot[hs] || statusDot.UNKNOWN)} />
                <span className="font-semibold text-sm truncate">{provider.providerName}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                {TYPE_LABELS[provider.providerType] || provider.providerType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Response Time</p>
                <p className={cn(
                  'font-semibold mt-0.5 flex items-center gap-1',
                  !highLatency ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
                )}>
                  {provider.actualAvgResponseTimeMs ?? '—'}ms
                  {highLatency && <AlertTriangle className="w-3 h-3" />}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Uptime</p>
                <p className={cn(
                  'font-semibold mt-0.5',
                  (provider.actualUptimePct ?? 0) >= 99.9 ? 'text-green-600 dark:text-green-400'
                    : (provider.actualUptimePct ?? 0) >= 98 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400',
                )}>
                  {provider.actualUptimePct != null ? `${Number(provider.actualUptimePct).toFixed(2)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Month Volume</p>
                <p className="font-semibold mt-0.5">{(provider.currentMonthVolume ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost Model</p>
                <p className="font-semibold mt-0.5">{provider.costModel || '—'}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                hs === 'HEALTHY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : hs === 'DEGRADED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : hs === 'DOWN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
              )}>
                {hs}
              </span>
              <span className="text-xs text-muted-foreground font-mono">{provider.providerCode}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
