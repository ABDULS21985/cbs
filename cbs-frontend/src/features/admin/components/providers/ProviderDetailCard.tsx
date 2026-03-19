import { useState } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  GitMerge,
  PauseCircle,
  Trash2,
  Loader2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ServiceProvider, ProviderStatus } from '../../api/providerApi';

interface ProviderDetailCardProps {
  provider: ServiceProvider;
  onHealthCheck: () => Promise<void>;
  onFailover: () => Promise<void>;
  onSuspend: () => Promise<void>;
  onDecommission: () => Promise<void>;
}

const STATUS_BADGE: Record<ProviderStatus, string> = {
  HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DEGRADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DOWN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAINTENANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const STATUS_DOT: Record<ProviderStatus, string> = {
  HEALTHY: 'bg-green-500',
  DEGRADED: 'bg-amber-500',
  DOWN: 'bg-red-500',
  MAINTENANCE: 'bg-blue-500',
};

const TYPE_LABELS: Record<string, string> = {
  IDENTITY: 'Identity',
  PAYMENT_SWITCH: 'Payment Switch',
  CREDIT_BUREAU: 'Credit Bureau',
  SMS: 'SMS Gateway',
  EMAIL: 'Email Service',
  PUSH: 'Push Notifications',
  INSURANCE: 'Insurance',
  REMITTANCE: 'Remittance',
  USSD: 'USSD Channel',
  CARD_SCHEME: 'Card Scheme',
};

const COST_MODEL_LABELS: Record<string, string> = {
  PER_CALL: 'Per Call',
  MONTHLY_FLAT: 'Monthly Flat',
  TIERED: 'Tiered',
  REVENUE_SHARE: 'Revenue Share',
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

  const run = async (action: string, fn: () => Promise<void>) => {
    setLoadingAction(action);
    try { await fn(); } finally { setLoadingAction(null); }
  };

  const errorPct = provider.todayCalls > 0
    ? (provider.todayErrors / provider.todayCalls) * 100
    : 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className={cn('w-3 h-3 rounded-full flex-shrink-0', STATUS_DOT[provider.status])} />
          <div>
            <h2 className="text-xl font-bold">{provider.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{provider.description}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium', STATUS_BADGE[provider.status])}>
          {provider.status}
        </span>
      </div>

      {/* Two-column detail grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left: Provider details */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Provider Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono font-medium">{provider.code}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{TYPE_LABELS[provider.type] || provider.type}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">Integration</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{provider.integration}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/60">
              <span className="text-muted-foreground">Cost Model</span>
              <span className="font-medium">{COST_MODEL_LABELS[provider.costModel] || provider.costModel}</span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-border/60 gap-4">
              <span className="text-muted-foreground flex-shrink-0">Base URL</span>
              <a
                href={provider.baseUrl.startsWith('http') ? provider.baseUrl : '#'}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-primary hover:underline flex items-center gap-1 text-right break-all"
              >
                {provider.baseUrl}
                {provider.baseUrl.startsWith('http') && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
              </a>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Registered</span>
              <span className="font-medium">{format(new Date(provider.registeredAt), 'dd MMM yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Right: Health metrics */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Health Metrics</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricTile
              label="Uptime (30d)"
              value={`${provider.uptime.toFixed(2)}%`}
              colorClass={provider.uptime >= 99.9 ? 'text-green-600 dark:text-green-400' : provider.uptime >= 98 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
            />
            <MetricTile
              label="Avg Latency"
              value={`${provider.avgLatencyMs}ms`}
              colorClass={provider.avgLatencyMs < 200 ? 'text-green-600 dark:text-green-400' : provider.avgLatencyMs <= 500 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}
            />
            <MetricTile
              label="Today's Calls"
              value={provider.todayCalls.toLocaleString()}
            />
            <MetricTile
              label="Today's Errors"
              value={`${provider.todayErrors.toLocaleString()} (${errorPct.toFixed(1)}%)`}
              colorClass={errorPct > 1 ? 'text-red-600 dark:text-red-400' : undefined}
            />
            <MetricTile
              label="Monthly Volume"
              value={provider.monthlyVolume.toLocaleString()}
            />
            <MetricTile
              label="Monthly Cost"
              value={`₦${provider.monthlyCost.toLocaleString()}`}
              colorClass={provider.monthlyCost > provider.budget ? 'text-red-600 dark:text-red-400' : undefined}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Clock className="w-3.5 h-3.5" />
            Last health check: {format(new Date(provider.lastHealthCheck), 'dd MMM yyyy, HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
        <button
          onClick={() => run('healthcheck', onHealthCheck)}
          disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loadingAction === 'healthcheck' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Health Check Now
        </button>

        <button
          onClick={() => setConfirm({ type: 'failover' })}
          disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {loadingAction === 'failover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
          Trigger Failover
        </button>

        <button
          onClick={() => setConfirm({ type: 'suspend' })}
          disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loadingAction === 'suspend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
          Suspend
        </button>

        <button
          onClick={() => setConfirm({ type: 'decommission' })}
          disabled={!!loadingAction}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loadingAction === 'decommission' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Decommission
        </button>
      </div>

      {/* Confirm: Failover */}
      <ConfirmDialog
        open={confirm?.type === 'failover'}
        title="Trigger Failover"
        description={`Are you sure you want to trigger a failover for ${provider.name}? Traffic will be rerouted to the configured failover provider immediately.`}
        confirmLabel="Trigger Failover"
        variant="default"
        isLoading={loadingAction === 'failover'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await run('failover', onFailover);
          setConfirm(null);
        }}
      />

      {/* Confirm: Suspend */}
      <ConfirmDialog
        open={confirm?.type === 'suspend'}
        title="Suspend Provider"
        description={`Suspending ${provider.name} will stop all traffic to this provider and place it in MAINTENANCE mode. Existing integrations will fall back to alternatives. Continue?`}
        confirmLabel="Suspend Provider"
        variant="destructive"
        isLoading={loadingAction === 'suspend'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await run('suspend', onSuspend);
          setConfirm(null);
        }}
      />

      {/* Confirm: Decommission */}
      <ConfirmDialog
        open={confirm?.type === 'decommission'}
        title="Decommission Provider"
        description={`This will permanently decommission ${provider.name}. All configuration, SLA records, and API credentials will be archived. This action cannot be undone. Are you absolutely sure?`}
        confirmLabel="Yes, Decommission"
        variant="destructive"
        isLoading={loadingAction === 'decommission'}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          await run('decommission', onDecommission);
          setConfirm(null);
        }}
      />
    </>
  );
}
