import { useQuery } from '@tanstack/react-query';
import { AuditTimeline, StatusBadge, EmptyState } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { accountMaintenanceApi } from '../../api/accountMaintenanceApi';

interface MaintenanceHistoryTimelineProps {
  accountId: string;
}

export function MaintenanceHistoryTimeline({ accountId }: MaintenanceHistoryTimelineProps) {
  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['account-maintenance-history', accountId],
    queryFn: () => accountMaintenanceApi.getMaintenanceHistory(accountId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <AuditTimeline
        events={[]}
        isLoading
      />
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400">
        Failed to load maintenance history. Please try refreshing the page.
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <EmptyState
        title="No maintenance history"
        description="No maintenance actions have been recorded for this account yet."
      />
    );
  }

  const events = history.map((item) => ({
    id: item.id,
    action: item.action,
    performedBy: item.performedBy,
    performedAt: item.date,
    details: item.details,
    changes: undefined as undefined,
  }));

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2">
        {history.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs"
          >
            <span className="font-medium">{item.action}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{item.date ? formatDateTime(item.date) : '—'}</span>
            <StatusBadge status={item.status} size="sm" />
          </div>
        ))}
        {history.length > 3 && (
          <div className="flex items-center rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            +{history.length - 3} more
          </div>
        )}
      </div>

      <AuditTimeline events={events} />
    </div>
  );
}
