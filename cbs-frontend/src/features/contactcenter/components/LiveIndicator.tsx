import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/formatters';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface LiveIndicatorProps {
  isFetching: boolean;
  isError: boolean;
  dataUpdatedAt?: number;
}

export function LiveIndicator({ isFetching, isError, dataUpdatedAt }: LiveIndicatorProps) {
  if (isError) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600" role="status" aria-live="polite">
        <WifiOff className="w-3 h-3" />
        <span>Connection lost</span>
      </span>
    );
  }

  if (isFetching) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600" role="status" aria-live="polite">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Updating...</span>
      </span>
    );
  }

  const isFresh = dataUpdatedAt && Date.now() - dataUpdatedAt < 60_000;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs', isFresh ? 'text-green-600' : 'text-muted-foreground')}
      role="status"
      aria-live="polite"
      aria-label={isFresh ? 'Live data, connection active' : 'Data may be stale'}
    >
      {isFresh ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>Live</span>
        </>
      ) : (
        <>
          <Wifi className="w-3 h-3" />
          <span>{dataUpdatedAt ? formatRelative(new Date(dataUpdatedAt).toISOString()) : 'Waiting...'}</span>
        </>
      )}
    </span>
  );
}
