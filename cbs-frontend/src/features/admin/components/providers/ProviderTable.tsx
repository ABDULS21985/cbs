import { cn } from '@/lib/utils';
import type { ServiceProvider } from '../../api/providerApi';

interface ProviderTableProps {
  providers: ServiceProvider[];
  onRowClick: (id: number) => void;
}

const STATUS_BADGE: Record<string, string> = {
  HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEGRADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DOWN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ONBOARDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DECOMMISSIONED: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const TYPE_LABELS: Record<string, string> = {
  KYC_PROVIDER: 'KYC', CREDIT_BUREAU: 'Credit Bureau', PAYMENT_GATEWAY: 'Payment Gateway',
  CARD_PROCESSOR: 'Card Processor', SMS_GATEWAY: 'SMS', EMAIL_SERVICE: 'Email',
  SWIFT: 'SWIFT', MARKET_DATA: 'Market Data', FRAUD_SCREENING: 'Fraud',
  AML_SCREENING: 'AML', DOCUMENT_VERIFICATION: 'Doc Verify', BIOMETRIC: 'Biometric',
  IDENTITY_VERIFICATION: 'Identity', INSURANCE: 'Insurance', RATING_AGENCY: 'Rating',
  CIT_COMPANY: 'CIT', PRINTING_SERVICE: 'Printing',
};

function uptimeColor(v: number | null): string {
  if (v == null) return 'text-muted-foreground';
  if (v >= 99.9) return 'text-green-600 dark:text-green-400';
  if (v >= 98) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function latencyColor(ms: number | null): string {
  if (ms == null) return 'text-muted-foreground';
  if (ms < 200) return 'text-green-600 dark:text-green-400';
  if (ms <= 500) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function ProviderTable({ providers, onRowClick }: ProviderTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Integration</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Uptime %</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Response</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Month Vol.</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cost Model</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Health</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {providers.map(p => (
            <tr key={p.id} onClick={() => onRowClick(p.id)} className="hover:bg-muted/40 cursor-pointer transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.providerCode}</td>
              <td className="px-4 py-3 font-medium">{p.providerName}</td>
              <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[p.providerType] || p.providerType}</td>
              <td className="px-4 py-3"><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.integrationMethod}</span></td>
              <td className={cn('px-4 py-3 text-right font-semibold', uptimeColor(p.actualUptimePct))}>
                {p.actualUptimePct != null ? `${Number(p.actualUptimePct).toFixed(2)}%` : '—'}
              </td>
              <td className={cn('px-4 py-3 text-right font-semibold', latencyColor(p.actualAvgResponseTimeMs))}>
                {p.actualAvgResponseTimeMs != null ? `${p.actualAvgResponseTimeMs}ms` : '—'}
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">{(p.currentMonthVolume ?? 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.costModel || '—'}</td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[p.healthStatus] || STATUS_BADGE.UNKNOWN)}>
                  {p.healthStatus || 'UNKNOWN'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[p.status] || STATUS_BADGE.ONBOARDING)}>
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
          {providers.length === 0 && (
            <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No providers found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
