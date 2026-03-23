import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EndpointEntry {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  callCount: number;
  avgLatencyMs: number;
  errorRate: number;
  lastCalledAt: string;
}

interface TopEndpointsTableProps {
  endpoints: EndpointEntry[];
  loading?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function TopEndpointsTable({ endpoints, loading }: TopEndpointsTableProps) {
  if (loading) {
    return (
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...endpoints].sort((a, b) => b.callCount - a.callCount);

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h3 className="text-sm font-semibold">Top Endpoints</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">
                Endpoint
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                Calls
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                Avg Latency
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                Error Rate
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                Last Called
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((ep, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                        METHOD_STYLES[ep.method] || 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs truncate max-w-[240px]" title={ep.path}>
                      {ep.path}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="font-semibold tabular-nums">
                    {ep.callCount.toLocaleString()}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={cn(
                      'tabular-nums',
                      ep.avgLatencyMs <= 200 ? 'text-green-600' : ep.avgLatencyMs <= 500 ? 'text-amber-600' : 'text-red-600',
                    )}
                  >
                    {ep.avgLatencyMs.toFixed(0)} ms
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={cn(
                      'tabular-nums',
                      ep.errorRate <= 1 ? 'text-green-600' : ep.errorRate <= 5 ? 'text-amber-600' : 'text-red-600',
                    )}
                  >
                    {ep.errorRate.toFixed(2)}%
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(ep.lastCalledAt)}
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No endpoint data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
