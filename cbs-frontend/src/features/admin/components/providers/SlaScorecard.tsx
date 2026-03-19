import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SlaRecord } from '../../api/providerApi';

interface SlaScorecardProps { records: SlaRecord[]; }

export function SlaScorecard({ records }: SlaScorecardProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">SLA Response (ms)</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actual Response</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">SLA Uptime %</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actual Uptime</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Health</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">SLA Met</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map(r => (
            <tr key={r.providerCode} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{r.providerName}</td>
              <td className="px-4 py-3 text-right font-mono">{r.slaResponseTimeMs ?? '—'}</td>
              <td className={cn('px-4 py-3 text-right font-mono',
                r.actualAvgResponseTimeMs != null && r.slaResponseTimeMs != null && r.actualAvgResponseTimeMs > r.slaResponseTimeMs ? 'text-red-600 dark:text-red-400' : '')}>
                {r.actualAvgResponseTimeMs ?? '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono">{r.slaUptimePct != null ? `${Number(r.slaUptimePct).toFixed(2)}%` : '—'}</td>
              <td className={cn('px-4 py-3 text-right font-mono',
                r.actualUptimePct != null && r.slaUptimePct != null && Number(r.actualUptimePct) < Number(r.slaUptimePct) ? 'text-red-600 dark:text-red-400' : '')}>
                {r.actualUptimePct != null ? `${Number(r.actualUptimePct).toFixed(2)}%` : '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  r.healthStatus === 'HEALTHY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : r.healthStatus === 'DEGRADED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                  {r.healthStatus || 'UNKNOWN'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {r.slaMet ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" /> : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto" />}
              </td>
            </tr>
          ))}
          {records.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No SLA data available.</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
