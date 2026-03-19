import { cn } from '@/lib/utils';
import type { FailureRecord, NotificationChannel } from '../../api/notificationAdminApi';

interface FailureAnalysisTableProps {
  failures: FailureRecord[];
}

const channelBadge: Record<NotificationChannel, string> = {
  EMAIL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SMS: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PUSH: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  IN_APP: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const errorBadge: Record<string, string> = {
  INVALID_NUMBER: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  BOUNCED_EMAIL: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DND: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PROVIDER_ERROR: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const errorLabel: Record<string, string> = {
  INVALID_NUMBER: 'Invalid Number',
  BOUNCED_EMAIL: 'Bounced Email',
  DND: 'DND Opt-out',
  PROVIDER_ERROR: 'Provider Error',
};

function ErrorBadge({ error }: { error: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      errorBadge[error] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    )}>
      {errorLabel[error] ?? error.replace(/_/g, ' ')}
    </span>
  );
}

export function FailureAnalysisTable({ failures }: FailureAnalysisTableProps) {
  const sorted = [...failures].sort((a, b) => b.failures - a.failures);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No failure records found.
      </div>
    );
  }

  const maxFailures = sorted[0]?.failures ?? 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Template</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Failures</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Common Error</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Last Failure</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((rec) => (
            <tr key={`${rec.templateCode}-${rec.channel}`} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{rec.templateName}</p>
                <p className="text-xs text-muted-foreground font-mono">{rec.templateCode}</p>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  channelBadge[rec.channel],
                )}>
                  {rec.channel}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive rounded-full"
                      style={{ width: `${(rec.failures / maxFailures) * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold text-destructive tabular-nums w-10 text-right">
                    {rec.failures.toLocaleString()}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <ErrorBadge error={rec.commonError} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(rec.lastFailure).toLocaleString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
