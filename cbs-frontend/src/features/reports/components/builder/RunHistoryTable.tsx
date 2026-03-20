import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { reportBuilderApi, type ReportExecutionRecord } from '../../api/reportBuilderApi';

interface RunHistoryTableProps {
  reportId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: 'text-green-600 dark:text-green-400' },
  FAILED: { label: 'Failed', icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  RUNNING: { label: 'Running', icon: Loader2, className: 'text-blue-600 dark:text-blue-400 animate-spin' },
};

function formatDuration(ms?: number): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function RunHistoryTable({ reportId }: RunHistoryTableProps) {
  const { data: history = [], isLoading, isError } = useQuery<ReportExecutionRecord[]>({
    queryKey: ['report-run-history', reportId],
    queryFn: () => reportBuilderApi.getRunHistory(reportId),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading run history...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-4 text-sm text-red-600 dark:text-red-400">
        Failed to load run history.
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-4 text-sm text-muted-foreground text-center border border-dashed rounded-lg">
        No runs yet. Run this report to see history.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Run At</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Rows</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Duration</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Output</th>
          </tr>
        </thead>
        <tbody>
          {history.map((run) => {
            const statusCfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.RUNNING;
            const Icon = statusCfg.icon;
            return (
              <tr key={run.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(run.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${statusCfg.className}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {statusCfg.label}
                  </div>
                  {run.errorMessage && (
                    <div className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate" title={run.errorMessage}>
                      {run.errorMessage}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                  {run.rowCount != null ? run.rowCount.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                  {formatDuration(run.durationMs)}
                </td>
                <td className="px-4 py-2.5">
                  {run.outputUrl ? (
                    <a
                      href={run.outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
