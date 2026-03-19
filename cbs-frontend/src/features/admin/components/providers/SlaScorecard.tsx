import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SlaRecord } from '../../api/providerApi';

interface SlaScorecardProps {
  records: SlaRecord[];
}

const currentMonth = format(new Date(), 'yyyy-MM');

export function SlaScorecard({ records }: SlaScorecardProps) {
  // Sort descending by month
  const sorted = [...records].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">SLA Uptime Target</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actual Uptime</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Met?</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">SLA Response</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actual Response</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Met?</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Penalty (₦)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map(r => {
            const isCurrentMonth = r.month === currentMonth;
            return (
              <tr
                key={`${r.provider}-${r.month}`}
                className={cn(
                  'transition-colors',
                  isCurrentMonth && 'bg-blue-50/40 dark:bg-blue-900/10',
                )}
              >
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {r.month}
                    {isCurrentMonth && (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{r.slaUptimeTarget}%</td>
                <td className={cn(
                  'px-4 py-3 text-right font-semibold',
                  r.uptimeMet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                )}>
                  {r.actualUptime.toFixed(3)}%
                </td>
                <td className="px-4 py-3 text-center">
                  {r.uptimeMet
                    ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 inline" />
                    : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 inline" />
                  }
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{r.slaResponseTarget}ms</td>
                <td className={cn(
                  'px-4 py-3 text-right font-semibold',
                  r.responseMet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                )}>
                  {r.actualResponse}ms
                </td>
                <td className="px-4 py-3 text-center">
                  {r.responseMet
                    ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 inline" />
                    : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 inline" />
                  }
                </td>
                <td className={cn(
                  'px-4 py-3 text-right font-semibold',
                  (r.penaltyAmount ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
                )}>
                  {(r.penaltyAmount ?? 0) > 0 ? `₦${(r.penaltyAmount ?? 0).toLocaleString()}` : '—'}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                No SLA records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
