import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileDown, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { glApi } from '../../api/glApi';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';

function DrillDownModal({
  glCode,
  onClose,
}: {
  glCode: string;
  onClose: () => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['gl-drilldown', glCode, monthStart, today],
    queryFn: () => glApi.getDrillDown(glCode, monthStart, today),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-3xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Drill-Down: {glCode}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Month-to-date journal entries</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-auto flex-1 p-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No entries found for this period.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Journal #</th>
                    <th className="text-left py-2 pr-4 font-medium">Date</th>
                    <th className="text-left py-2 pr-4 font-medium">Narration</th>
                    <th className="text-right py-2 pr-4 font-medium">Debit</th>
                    <th className="text-right py-2 font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) =>
                    entry.lines
                      .filter((l) => l.glCode === glCode)
                      .map((line, idx) => (
                        <tr key={`${entry.id}-${idx}`} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-mono text-xs">{entry.journalNumber}</td>
                          <td className="py-2 pr-4">{entry.valueDate}</td>
                          <td className="py-2 pr-4 max-w-xs truncate">{line.narration ?? '—'}</td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {line.debitAmount > 0 ? formatMoney(line.debitAmount) : '—'}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {line.creditAmount > 0 ? formatMoney(line.creditAmount) : '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function GlBalancesTable() {
  const [drillDown, setDrillDown] = useState<string | null>(null);

  const { data: balances = [], isLoading, refetch } = useQuery({
    queryKey: ['gl-balances'],
    queryFn: () => glApi.getGlBalances(),
  });

  const grandTotalDebit = balances.reduce((s, b) => s + b.debitTotal, 0);
  const grandTotalCredit = balances.reduce((s, b) => s + b.creditTotal, 0);
  const grandNet = grandTotalDebit - grandTotalCredit;
  const isBalanced = Math.abs(grandNet) < 0.01;

  const handleExport = (type: 'PDF' | 'Excel') => {
    toast.info(`${type} export initiated. Your file will be ready shortly.`);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Today's Balances</span>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">GL Code</th>
              <th className="text-center px-4 py-2.5 font-medium">Currency</th>
              <th className="text-center px-4 py-2.5 font-medium">Branch</th>
              <th className="text-right px-4 py-2.5 font-medium">Opening</th>
              <th className="text-right px-4 py-2.5 font-medium">Debit Total</th>
              <th className="text-right px-4 py-2.5 font-medium">Credit Total</th>
              <th className="text-right px-4 py-2.5 font-medium">Closing Balance</th>
              <th className="text-center px-4 py-2.5 font-medium">Txns</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              balances.map((row) => {
                const netBalance = row.closingBalance;
                return (
                  <tr
                    key={`${row.glCode}-${row.branchCode}-${row.currencyCode}`}
                    className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setDrillDown(row.glCode)}
                        className="font-mono text-xs text-primary hover:underline cursor-pointer"
                      >
                        {row.glCode}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">{row.currencyCode}</td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{row.branchCode}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">{formatMoney(row.openingBalance)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {row.debitTotal > 0 ? formatMoney(row.debitTotal) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {row.creditTotal > 0 ? formatMoney(row.creditTotal) : '—'}
                    </td>
                    <td className={cn('px-4 py-2.5 text-right font-mono text-sm font-medium', netBalance < 0 && 'text-red-600')}>
                      {formatMoney(Math.abs(netBalance))}
                      {netBalance < 0 && ' CR'}
                      {netBalance > 0 && ' DR'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{row.transactionCount}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {!isLoading && balances.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                <td colSpan={4} className="px-4 py-3 text-sm">Grand Total</td>
                <td className="px-4 py-3 text-right font-mono text-sm">{formatMoney(grandTotalDebit)}</td>
                <td className="px-4 py-3 text-right font-mono text-sm">{formatMoney(grandTotalCredit)}</td>
                <td className={cn('px-4 py-3 text-right font-mono text-sm', !isBalanced && 'text-red-600')}>
                  {isBalanced ? (
                    <span className="text-green-600">Balanced</span>
                  ) : (
                    formatMoney(Math.abs(grandNet))
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {drillDown && (
        <DrillDownModal
          glCode={drillDown}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
