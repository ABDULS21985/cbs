import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RefreshCw, X, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { glApi } from '../../api/glApi';
import { apiGet } from '@/lib/api';
import type { SubLedgerRow } from '../../api/glApi';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface BreakDetail {
  account: string;
  subLedger: number;
  gl: number;
  diff: number;
}

function BreakDrillDownModal({ row, date, onClose }: { row: SubLedgerRow; date: string; onClose: () => void }) {
  const { data: details = [], isLoading, isError } = useQuery({
    queryKey: ['gl-reconciliation-break', row.subledgerType, date],
    queryFn: () => apiGet<BreakDetail[]>('/api/v1/gl/reconciliation/break-details', { module: row.subledgerType, date }),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Reconciliation Break: {row.subledgerType}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                GL Code: {row.glCode} | Difference: <span className="font-mono text-red-600 font-medium">{formatMoney(Math.abs(row.difference))}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading break details...
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4" />
                Break details could not be loaded from the backend.
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-4 font-medium">Account / Reference</th>
                  <th className="text-right py-2 pr-4 font-medium">Sub-Ledger</th>
                  <th className="text-right py-2 pr-4 font-medium">GL Balance</th>
                  <th className="text-right py-2 font-medium">Difference</th>
                </tr>
              </thead>
              <tbody>
                {details.map((d, idx) => (
                  <tr key={idx} className={cn('border-b border-border/40', d.diff !== 0 && 'bg-red-50/50 dark:bg-red-900/10')}>
                    <td className="py-2 pr-4 font-mono text-xs">{d.account}</td>
                    <td className="py-2 pr-4 text-right font-mono">{formatMoney(d.subLedger)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{formatMoney(d.gl)}</td>
                    <td className={cn('py-2 text-right font-mono font-medium', d.diff !== 0 ? 'text-red-600' : 'text-green-600')}>
                      {d.diff !== 0 ? (d.diff > 0 ? '+' : '') + formatMoney(d.diff) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold bg-muted/30">
                  <td className="py-2.5 pr-4">Total</td>
                  <td className="py-2.5 pr-4 text-right font-mono">{formatMoney(row.subledgerBalance)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono">{formatMoney(row.glBalance)}</td>
                  <td className={cn('py-2.5 text-right font-mono', row.difference !== 0 ? 'text-red-600' : 'text-green-600')}>
                    {row.difference !== 0 ? (row.difference > 0 ? '+' : '') + formatMoney(row.difference) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function SubLedgerReconciliation() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [breakRow, setBreakRow] = useState<SubLedgerRow | null>(null);

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['gl-reconciliation', date],
    queryFn: () => glApi.getSubLedgerReconciliation(date),
  });

  const matchedCount = rows.filter((r) => r.balanced).length;
  const breakCount = rows.filter((r) => !r.balanced).length;

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">As at:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto text-sm">
          <span className="flex items-center gap-1.5 text-green-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {matchedCount} Matched
          </span>
          {breakCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 font-medium">
              <XCircle className="w-4 h-4" />
              {breakCount} Break{breakCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">Subledger Type</th>
              <th className="text-left px-4 py-2.5 font-medium">GL Code</th>
              <th className="text-right px-4 py-2.5 font-medium">Sub-Ledger Balance</th>
              <th className="text-right px-4 py-2.5 font-medium">GL Balance</th>
              <th className="text-right px-4 py-2.5 font-medium">Difference</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.subledgerType}-${row.glCode}`}
                  className={cn(
                    'border-b border-border/40 transition-colors',
                    !row.balanced && 'bg-red-50/30 dark:bg-red-900/10',
                  )}
                >
                  <td className="px-4 py-3 font-medium">{row.subledgerType}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.glCode}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(row.subledgerBalance)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatMoney(row.glBalance)}</td>
                  <td className={cn('px-4 py-3 text-right font-mono font-medium', !row.balanced ? 'text-red-600' : 'text-green-600')}>
                    {row.balanced ? formatMoney(0) : (row.difference > 0 ? '+' : '') + formatMoney(row.difference)}
                  </td>
                  <td className="px-4 py-3">
                    {row.balanced ? (
                      <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched
                      </span>
                    ) : (
                      <button
                        onClick={() => setBreakRow(row)}
                        className="flex items-center gap-1.5 text-red-600 text-xs font-medium hover:underline"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Break — View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!isLoading && rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/30 border-t-2 font-semibold text-sm">
                <td colSpan={2} className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(rows.reduce((s, r) => s + r.subledgerBalance, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(rows.reduce((s, r) => s + r.glBalance, 0))}
                </td>
                <td className={cn('px-4 py-3 text-right font-mono', Math.abs(rows.reduce((s, r) => s + r.difference, 0)) > 0 ? 'text-red-600' : 'text-green-600')}>
                  {formatMoney(rows.reduce((s, r) => s + r.difference, 0))}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-medium', breakCount > 0 ? 'text-red-600' : 'text-green-600')}>
                    {breakCount === 0 ? 'All Matched' : `${breakCount} Break${breakCount > 1 ? 's' : ''}`}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {breakRow && (
        <BreakDrillDownModal row={breakRow} date={date} onClose={() => setBreakRow(null)} />
      )}
    </div>
  );
}
