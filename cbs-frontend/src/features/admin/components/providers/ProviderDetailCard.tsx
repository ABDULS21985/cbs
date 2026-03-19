import { useState } from 'react';
import { format } from 'date-fns';
import { Activity, GitMerge, PauseCircle, Trash2, Loader2, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ServiceProvider } from '../../api/providerApi';

interface ProviderDetailCardProps {
  provider: ServiceProvider;
  onHealthCheck: () => Promise<void>;
  onFailover: () => Promise<void>;
  onSuspend: () => Promise<void>;
  onDecommission: () => Promise<void>;
}

const STATUS_BADGE: Record<string, string> = {
  HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEGRADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DOWN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const STATUS_DOT: Record<string, string> = {
  HEALTHY: 'bg-green-500', DEGRADED: 'bg-amber-500', DOWN: 'bg-red-500', UNKNOWN: 'bg-gray-400',
};

const TYPE_LABELS: Record<string, string> = {
  KYC_PROVIDER: 'KYC', CREDIT_BUREAU: 'Credit Bureau', PAYMENT_GATEWAY: 'Payment Gateway',
  CARD_PROCESSOR: 'Card Processor', SMS_GATEWAY: 'SMS Gateway', EMAIL_SERVICE: 'Email Service',
  SWIFT: 'SWIFT', MARKET_DATA: 'Market Data', FRAUD_SCREENING: 'Fraud Screening',
  AML_SCREENING: 'AML Screening', DOCUMENT_VERIFICATION: 'Doc Verification', BIOMETRIC: 'Biometric',
  IDENTITY_VERIFICATION: 'Identity Verification', INSURANCE: 'Insurance',
};

function MetricTile({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-base font-semibold', colorClass)}>{value}</p>
    </div>
  );
}

export function ProviderDetailCard({ provider, onHealthCheck, onFailover, onSuspend, onDecommission }: ProviderDetailCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'decommission' | 'failover' } | null>(null);
  const hs = provider.healthStatus || 'UNKNOWN';

  const run = async (action: string, fn: () => Promise<void>) => {
    setLoadingAction(action);
    try { await fn(); } finally { setLoadingAction(null); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className={cn('w-3 h-3 rounded-full flex-shrink-0', STATUS_DOT[hs] || STATUS_DOT.UNKNOWN)} />
          <div>
            <h2 className="text-xl font-bold">{provider.providerName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{provider.providerCode} · {TYPE_LABELS[provider.providerType] || provider.providerType}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', STATUS_BADGE[hs] || STATUS_BADGE.UNKNOWN)}>{hs}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Provider Details</h3>
          <div className="space-y-3 text-sm">
            {[
              ['Integration', provider.integrationMethod],
              ['Auth Type', provider.authType],
              ['Cost Model', provider.costModel],
              ['Contract Ref', provider.contractReference],
              ['SLA Response', provider.slaResponseTimeMs != null ? `${provider.slaResponseTimeMs}ms` : '—'],
              ['SLA Uptime', provider.slaUptimePct != null ? `${Number(provider.slaUptimePct).toFixed(2)}%` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border/60">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value || '—'}</span>
              </div>
            ))}
            <div className="flex justify-between items-start py-2 border-b border-border/60 gap-4">
              <span className="text-muted-foreground flex-shrink-0">Base URL</span>
              <a href={provider.baseUrl?.startsWith('http') ? provider.baseUrl : '#'} target="_blank" rel="noreferrer"
                className="font-mono text-xs text-primary hover:underline flex items-center gap-1 text-right break-all">
                {provider.baseUrl || '—'}
                {provider.baseUrl?.startsWith('http') && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
              </a>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{provider.primaryContactName || '—'} ({provider.primaryContactEmail || '—'})</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Health Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Actual Uptime" value={provider.actualUptimePct != null ? `${Number(provider.actualUptimePct).toFixed(2)}%` : '—'}
              colorClass={(provider.actualUptimePct ?? 0) >= 99.9 ? 'text-green-600 dark:text-green-400' : (provider.actualUptimePct ?? 0) >= 98 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
            <MetricTile label="Avg Response" value={provider.actualAvgResponseTimeMs != null ? `${provider.actualAvgResponseTimeMs}ms` : '—'}
              colorClass={(provider.actualAvgResponseTimeMs ?? 0) < 200 ? 'text-green-600 dark:text-green-400' : (provider.actualAvgResponseTimeMs ?? 0) <= 500 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
            <MetricTile label="Month Volume" value={(provider.currentMonthVolume ?? 0).toLocaleString()} />
            <MetricTile label="Volume Limit" value={(provider.monthlyVolumeLimit ?? 0).toLocaleString()} />
            <MetricTile label="Cost/Call" value={provider.costPerCall != null ? `₦${Number(provider.costPerCall).toFixed(2)}` : '—'} />
            <MetricTile label="Monthly Cost" value={provider.monthlyCost != null ? `₦${Number(provider.monthlyCost).toLocaleString()}` : '—'} />
          </div>
          {provider.lastHealthCheckAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Clock className="w-3.5 h-3.5" />
              Last health check: {format(new Date(provider.lastHealthCheckAt), 'dd MMM yyyy, HH:mm:ss')}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <button onClick={() => run('healthcheck', onHealthCheck)} disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {loadingAction === 'healthcheck' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Health Check Now
        </button>
        <button onClick={() => setConfirm({ type: 'failover' })} disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors">
          {loadingAction === 'failover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
          Trigger Failover
        </button>
        <button onClick={() => setConfirm({ type: 'suspend' })} disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {loadingAction === 'suspend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
          Suspend
        </button>
        <button onClick={() => setConfirm({ type: 'decommission' })} disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
          {loadingAction === 'decommission' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Decommission
        </button>
      </div>

      <ConfirmDialog open={confirm?.type === 'failover'} title="Trigger Failover"
        description={`Are you sure you want to trigger a failover for ${provider.providerName}? Traffic will be rerouted to the configured failover provider.`}
        confirmLabel="Trigger Failover" variant="default" isLoading={loadingAction === 'failover'}
        onClose={() => setConfirm(null)} onConfirm={async () => { await run('failover', onFailover); setConfirm(null); }} />
      <ConfirmDialog open={confirm?.type === 'suspend'} title="Suspend Provider"
        description={`Suspending ${provider.providerName} will stop all traffic to this provider. Continue?`}
        confirmLabel="Suspend Provider" variant="destructive" isLoading={loadingAction === 'suspend'}
        onClose={() => setConfirm(null)} onConfirm={async () => { await run('suspend', onSuspend); setConfirm(null); }} />
      <ConfirmDialog open={confirm?.type === 'decommission'} title="Decommission Provider"
        description={`This will permanently decommission ${provider.providerName}. This action cannot be undone.`}
        confirmLabel="Yes, Decommission" variant="destructive" isLoading={loadingAction === 'decommission'}
        onClose={() => setConfirm(null)} onConfirm={async () => { await run('decommission', onDecommission); setConfirm(null); }} />
    </>
  );
}
