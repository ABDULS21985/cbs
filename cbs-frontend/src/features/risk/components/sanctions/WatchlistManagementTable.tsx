import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { Watchlist } from '../../types/sanctions';
import { useForceUpdateWatchlist } from '../../hooks/useSanctions';

interface Props {
  watchlists: Watchlist[];
  isLoading: boolean;
}

const statusConfig: Record<Watchlist['status'], { label: string; classes: string; dot: string }> = {
  ACTIVE: {
    label: 'Active',
    classes: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
  },
  UPDATING: {
    label: 'Updating',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  ERROR: {
    label: 'Error',
    classes: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

export function WatchlistManagementTable({ watchlists, isLoading }: Props) {
  const forceUpdate = useForceUpdateWatchlist();

  if (isLoading) {
    return (
      <div className="surface-card overflow-hidden">
        <div className="animate-pulse divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="grid grid-cols-[120px_1fr_160px_120px_120px_100px_auto] items-center px-4 py-2.5 bg-muted/30 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide gap-4">
        <div>Code</div>
        <div>Name</div>
        <div>Last Updated</div>
        <div>Entries</div>
        <div>Auto-Update</div>
        <div>Status</div>
        <div />
      </div>
      <div className="divide-y">
        {watchlists.map((wl) => {
          const config = statusConfig[wl.status];
          const isUpdating = forceUpdate.isPending && forceUpdate.variables === wl.id;
          return (
            <div
              key={wl.id}
              className="grid grid-cols-[120px_1fr_160px_120px_120px_100px_auto] items-center px-4 py-3 gap-4 hover:bg-muted/20 transition-colors"
            >
              <div className="font-mono text-xs font-semibold">{wl.code}</div>
              <div className="text-sm">{wl.name}</div>
              <div className="text-sm text-muted-foreground">{formatDate(wl.lastUpdated)}</div>
              <div className="text-sm font-medium">{wl.entryCount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{wl.autoUpdateSchedule}</div>
              <div>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', config.classes)}>
                  {wl.status === 'UPDATING' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
                  )}
                  {config.label}
                </span>
              </div>
              <div>
                <button
                  onClick={() =>
                    forceUpdate.mutate(wl.id, {
                      onSuccess: () => toast.success(`Watchlist "${wl.name}" update triggered`),
                      onError: () => toast.error(`Failed to update watchlist "${wl.name}"`),
                    })
                  }
                  disabled={isUpdating || wl.status === 'UPDATING'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={cn('w-3 h-3', isUpdating && 'animate-spin')} />
                  {isUpdating ? 'Updating...' : 'Force Update'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
