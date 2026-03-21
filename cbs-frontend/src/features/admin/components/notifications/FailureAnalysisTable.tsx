import { format } from 'date-fns';
import type { FailureRecord } from '../../api/notificationAdminApi';

interface FailureAnalysisTableProps { failures: FailureRecord[]; }

export function FailureAnalysisTable({ failures }: FailureAnalysisTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Template</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Channel</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Recipient</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Error</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {failures.map(f => (
            <tr key={f.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-mono text-xs">{f.templateCode || '—'}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {f.channel}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{f.recipientAddress || '—'}</td>
              <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate">{f.failureReason || '—'}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap">{f.createdAt ? format(new Date(f.createdAt), 'dd MMM HH:mm') : '—'}</td>
            </tr>
          ))}
          {failures.length === 0 && (<tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No failures found.</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
