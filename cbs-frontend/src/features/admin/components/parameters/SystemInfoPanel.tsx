import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Cpu, HardDrive, MemoryStick, Database, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parameterApi } from '../../api/parameterApi';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

interface GaugeProps {
  value: number;
  label: string;
  detail: string;
  icon: React.ReactNode;
}

function Gauge({ value, label, detail, icon }: GaugeProps) {
  const pct = Math.min(Math.max(value, 0), 100);
  const colorClass =
    pct >= 90 ? 'text-red-600 dark:text-red-400' :
    pct >= 70 ? 'text-amber-600 dark:text-amber-400' :
    'text-green-600 dark:text-green-400';
  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-green-500';

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">{icon}</div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn('text-lg font-bold tabular-nums', colorClass)}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function SystemInfoPanel() {
  const { data: info, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => parameterApi.getSystemInfo(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="h-2 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!info) return null;

  const memoryPct = info.memoryTotal > 0 ? (info.memoryUsed / info.memoryTotal) * 100 : 0;
  const diskPct = info.diskTotal > 0 ? ((info.diskTotal - info.diskUsed) / info.diskTotal) * 100 : 0;
  const cpuPct = Math.min(Math.max(info.cpuUsage * 10, 0), 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">System Information</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live system health — auto-refreshes every 60s</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Gauge
          value={cpuPct}
          label="CPU Usage"
          detail={`Load avg: ${info.cpuUsage}`}
          icon={<Cpu className="w-4 h-4 text-muted-foreground" />}
        />
        <Gauge
          value={memoryPct}
          label="Memory"
          detail={`${formatBytes(info.memoryUsed)} / ${formatBytes(info.memoryTotal)}`}
          icon={<MemoryStick className="w-4 h-4 text-muted-foreground" />}
        />
        <Gauge
          value={diskPct}
          label="Disk Usage"
          detail={`${formatBytes(info.diskTotal - info.diskUsed)} used of ${formatBytes(info.diskTotal)}`}
          icon={<HardDrive className="w-4 h-4 text-muted-foreground" />}
        />
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-muted">
                <Database className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">DB Connections</span>
            </div>
            <span className="text-lg font-bold tabular-nums text-primary">{info.activeConnections}</span>
          </div>
          <p className="text-xs text-muted-foreground">Active database connections</p>
        </div>
      </div>

      {/* Application Info + Uptime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Application Info</h4>
          </div>
          <div className="space-y-0 divide-y divide-border">
            {[
              { label: 'App Version', value: `v${info.appVersion}` },
              { label: 'Java Runtime', value: info.javaVersion },
              { label: 'Spring Boot', value: `v${info.springBootVersion}` },
              { label: 'Database', value: info.dbVersion },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Uptime</h4>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold tabular-nums text-primary">
              {formatUptime(info.uptime)}
            </div>
            <div className="text-xs text-muted-foreground">
              <p>{Math.floor(info.uptime / 86400)} days</p>
              <p>{Math.floor((info.uptime % 86400) / 3600)} hours</p>
              <p>{Math.floor((info.uptime % 3600) / 60)} minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
