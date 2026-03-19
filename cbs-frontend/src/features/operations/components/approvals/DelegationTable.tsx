import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { XCircle } from 'lucide-react';
import type { Delegation } from '../../api/approvalApi';

interface DelegationTableProps {
  delegations: Delegation[];
  onCancel: (id: string) => void;
  loading?: boolean;
}

function formatDate(d: string): string {
  try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
}

function getDelegationStatus(d: Delegation): 'ACTIVE' | 'EXPIRED' | 'CANCELLED' {
  if (!d.active) return 'CANCELLED';
  const now = new Date();
  const to = new Date(d.toDate + 'T23:59:59');
  if (to < now) return 'EXPIRED';
  return 'ACTIVE';
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' }) {
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 rounded text-xs font-medium',
      status === 'ACTIVE' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      status === 'EXPIRED' && 'bg-muted text-muted-foreground',
      status === 'CANCELLED' && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    )}>
      {status}
    </span>
  );
}

export function DelegationTable({ delegations, onCancel, loading = false }: DelegationTableProps) {
  if (delegations.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        No delegations found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">To</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scope</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {delegations.map((d) => {
            const status = getDelegationStatus(d);
            return (
              <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-xs">{d.delegatedBy}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-xs">{d.delegatedTo}</p>
                  <p className="text-xs text-muted-foreground">{d.delegatedToRole}</p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-xs">{formatDate(d.fromDate)}</p>
                  <p className="text-xs text-muted-foreground">to {formatDate(d.toDate)}</p>
                </td>
                <td className="px-4 py-3">
                  {d.scope === 'ALL' ? (
                    <span className="text-xs">All Types</span>
                  ) : (
                    <div>
                      <span className="text-xs">Specific</span>
                      {d.types && d.types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {d.types.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="inline-block px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                            >
                              {t.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {d.types.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{d.types.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{d.reason}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                </td>
                <td className="px-4 py-3">
                  {status === 'ACTIVE' ? (
                    <button
                      onClick={() => onCancel(d.id)}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3" />
                      Cancel
                    </button>
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
