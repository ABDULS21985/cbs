import { cn } from '@/lib/utils';
import type { ServiceProvider, ProviderStatus } from '../../api/providerApi';

interface ProviderTableProps {
  providers: ServiceProvider[];
  onRowClick: (id: string) => void;
}

const STATUS_BADGE: Record<ProviderStatus, string> = {
  HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEGRADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DOWN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAINTENANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
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

const COST_MODEL_LABELS: Record<string, string> = {
  PER_CALL: 'Per Call',
  MONTHLY_FLAT: 'Monthly Flat',
  TIERED: 'Tiered',
  REVENUE_SHARE: 'Rev Share',
};

function uptimeColor(uptime: number): string {
  if (uptime >= 99.9) return 'text-green-600 dark:text-green-400';
  if (uptime >= 98) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function latencyColor(ms: number): string {
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
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Latency</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monthly Vol.</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cost Model</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {providers.map(p => (
            <tr
              key={p.id}
              onClick={() => onRowClick(p.id)}
              className="hover:bg-muted/40 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.code}</td>
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[p.type] || p.type}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.integration}</span>
              </td>
              <td className={cn('px-4 py-3 text-right font-semibold', uptimeColor(p.uptime))}>
                {p.uptime.toFixed(2)}%
              </td>
              <td className={cn('px-4 py-3 text-right font-semibold', latencyColor(p.avgLatencyMs))}>
                {p.avgLatencyMs}ms
              </td>
              <td className="px-4 py-3 text-right text-muted-foreground">
                {p.monthlyVolume.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {COST_MODEL_LABELS[p.costModel] || p.costModel}
              </td>
              <td className="px-4 py-3">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[p.status])}>
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
          {providers.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                No providers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
