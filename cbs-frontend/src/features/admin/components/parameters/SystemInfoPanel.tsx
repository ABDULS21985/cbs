import { useQuery } from '@tanstack/react-query';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { parameterApi } from '../../api/parameterApi';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (parts.length === 0) parts.push(`${mins} min${mins !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

interface ProgressBarProps {
  value: number;
  label: string;
}

function ProgressBar({ value, label }: ProgressBarProps) {
  const colorClass =
    value >= 90
      ? 'bg-red-500'
      : value >= 70
      ? 'bg-amber-500'
      : 'bg-green-500';

  const textColorClass =
    value >= 90
      ? 'text-red-600 dark:text-red-400'
      : value >= 70
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-green-600 dark:text-green-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={cn('text-sm font-semibold tabular-nums', textColorClass)}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {value >= 90 ? 'Critical — immediate action required' : value >= 70 ? 'Warning — monitor closely' : 'Healthy'}
      </p>
    </div>
  );
}

function StatusRow({ label, healthy, detail }: { label: string; healthy: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {healthy ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

function ProviderRow({ total, healthy }: { total: number; healthy: number }) {
  const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const allHealthy = healthy === total;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {allHealthy ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium">External Providers</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {healthy}/{total} healthy
        </span>
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full', allHealthy ? 'bg-green-500' : 'bg-red-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function SystemInfoPanel() {
  const { data: info, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => parameterApi.getSystemInfo(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
            <div className="h-5 bg-muted rounded w-1/3" />
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">System Information</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live system health and version details</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          Refresh Health
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h4 className="text-sm font-semibold mb-4">Application Info</h4>
          <div className="space-y-0 divide-y divide-border">
            {[
              { label: 'App Version', value: `v${info.appVersion}` },
              { label: 'Database', value: info.dbVersion },
              { label: 'Java Runtime', value: info.javaVersion },
              { label: 'Spring Boot', value: `v${info.springBootVersion}` },
              { label: 'Last Deployment', value: formatDateTime(info.lastDeployment) },
              { label: 'Uptime', value: formatUptime(info.uptimeSeconds) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h4 className="text-sm font-semibold mb-4">Health Checks</h4>
          <div className="divide-y divide-border mb-4">
            <StatusRow label="Database" healthy={info.health.database} detail="PostgreSQL 16" />
            <StatusRow label="Redis Cache" healthy={info.health.redis} detail="Connected" />
            <StatusRow label="Message Queue" healthy={info.health.messageQueue} detail="Connected" />
            <ProviderRow
              total={info.health.externalProviders.total}
              healthy={info.health.externalProviders.healthy}
            />
          </div>
          <div className="space-y-4 pt-2">
            <ProgressBar value={info.health.diskUsagePct} label="Disk Space" />
            <ProgressBar value={info.health.memoryUsagePct} label="Memory" />
          </div>
        </div>
      </div>
    </div>
  );
}
