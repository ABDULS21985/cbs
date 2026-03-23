import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { gatewayApi, type GatewayStatus } from '../api/gatewayApi';

function statusDot(status: GatewayStatus['status']): string {
  if (status === 'ONLINE') return 'bg-green-500';
  if (status === 'DEGRADED') return 'bg-amber-500';
  return 'bg-red-500';
}

function statusLabel(status: GatewayStatus['status']): string {
  if (status === 'ONLINE') return 'ONLINE';
  if (status === 'DEGRADED') return 'DEGRADED';
  return 'OFFLINE';
}

function statusLabelColor(status: GatewayStatus['status']): string {
  if (status === 'ONLINE') return 'text-green-600 dark:text-green-400';
  if (status === 'DEGRADED') return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function cardBorder(status: GatewayStatus['status']): string {
  if (status === 'ONLINE') return 'border-green-200 dark:border-green-900/50';
  if (status === 'DEGRADED') return 'border-amber-200 dark:border-amber-900/50';
  return 'border-red-200 dark:border-red-900/50';
}

function GatewayCard({ gateway }: { gateway: GatewayStatus }) {
  const lastHeartbeat = (() => {
    try {
      if (!gateway.lastHeartbeatAt) return 'never';
      return formatDistanceToNow(parseISO(gateway.lastHeartbeatAt), { addSuffix: true });
    } catch {
      return 'unknown';
    }
  })();

  return (
    <div className={cn('surface-card p-5 space-y-4', cardBorder(gateway.status))}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{gateway.name}</h4>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot(gateway.status))} />
            <span className={cn('text-xs font-medium', statusLabelColor(gateway.status))}>
              {statusLabel(gateway.status)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Type</div>
          <div className="text-xs font-semibold font-mono">{gateway.type}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1 border-t">
        <div>
          <div className="text-xs text-muted-foreground">Today</div>
          <div className="text-sm font-semibold">{gateway.todayMessages.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Value</div>
          <div className="text-sm font-semibold">{gateway.valueToday.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Heartbeat</div>
          <div className="text-xs text-muted-foreground leading-tight">{lastHeartbeat}</div>
        </div>
      </div>
    </div>
  );
}

export function GatewayStatusGrid() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['gateway', 'status'],
    queryFn: () => gatewayApi.getGatewayStatus(),
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="surface-card p-5 space-y-3 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-px bg-muted" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((gw) => (
        <GatewayCard key={gw.name} gateway={gw} />
      ))}
    </div>
  );
}
