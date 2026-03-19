import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileDown, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { glApi } from '../../api/glApi';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';

function DrillDownModal({
  glCode,
  glName,
  onClose,
}: {
  glCode: string;
  glName: string;
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
              <h2 className="text-lg font-semibold">Drill-Down: {glCode} — {glName}</h2>
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
                    <th className="text-left py-2 pr-4 font-medium">Description</th>
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
                          <td className="py-2 pr-4">{entry.date}</td>
                          <td className="py-2 pr-4 max-w-xs truncate">{line.description}</td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {line.debit > 0 ? formatMoney(line.debit) : '—'}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {line.credit > 0 ? formatMoney(line.credit) : '—'}
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
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [drillDown, setDrillDown] = useState<{ glCode: string; glName: string } | null>(null);

  const { data: balances = [], isLoading, refetch } = useQuery({
    queryKey: ['gl-balances', date],
    queryFn: () => glApi.getGlBalances(date),
  });

  const grandTotalDebit = balances.filter((b) => b.level === 0).reduce((s, b) => s + b.debitBalance, 0);
  const grandTotalCredit = balances.filter((b) => b.level === 0).reduce((s, b) => s + b.creditBalance, 0);
  const grandNet = grandTotalDebit - grandTotalCredit;
  const isBalanced = Math.abs(grandNet) < 0.01;

  const handleExport = (type: 'PDF' | 'Excel') => {
    toast.info(`${type} export initiated. Your file will be ready shortly.`);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">As at:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {!isBalanced && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Trial Balance Off by {formatMoney(Math.abs(grandNet))}
            </span>
          )}
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
              <th className="text-left px-4 py-2.5 font-medium">Account Name</th>
              <th className="text-center px-4 py-2.5 font-medium">Currency</th>
              <th className="text-right px-4 py-2.5 font-medium">Debit Balance</th>
              <th className="text-right px-4 py-2.5 font-medium">Credit Balance</th>
              <th className="text-right px-4 py-2.5 font-medium">Net Balance</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              balances.map((row) => (
                <tr
                  key={row.glCode}
                  className={cn(
                    'border-b border-border/40 transition-colors',
                    row.isHeader && row.level === 0 && 'bg-muted/30',
                    row.isHeader && row.level === 1 && 'bg-muted/10',
                    !row.isHeader && 'hover:bg-muted/20',
                  )}
                >
                  <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + row.level * 16}px` }}>
                    <button
                      onClick={() => !row.isHeader && setDrillDown({ glCode: row.glCode, glName: row.name })}
                      className={cn(
                        'font-mono text-xs',
                        !row.isHeader && 'text-primary hover:underline cursor-pointer',
                        row.isHeader && 'text-foreground cursor-default font-bold',
                      )}
                    >
                      {row.glCode}
                    </button>
                  </td>
                  <td className={cn('px-4 py-2.5', row.isHeader ? 'font-semibold' : 'font-normal')}>
                    {row.name}
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{row.currency}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">
                    {row.debitBalance > 0 ? formatMoney(row.debitBalance, row.currency) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">
                    {row.creditBalance > 0 ? formatMoney(row.creditBalance, row.currency) : '—'}
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-mono text-sm font-medium', row.netBalance < 0 && 'text-red-600')}>
                    {formatMoney(Math.abs(row.netBalance), row.currency)}
                    {row.netBalance < 0 && ' CR'}
                    {row.netBalance > 0 && ' DR'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!isLoading && balances.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                <td colSpan={3} className="px-4 py-3 text-sm">Grand Total</td>
                <td className="px-4 py-3 text-right font-mono text-sm">{formatMoney(grandTotalDebit)}</td>
                <td className="px-4 py-3 text-right font-mono text-sm">{formatMoney(grandTotalCredit)}</td>
                <td className={cn('px-4 py-3 text-right font-mono text-sm', !isBalanced && 'text-red-600')}>
                  {isBalanced ? (
                    <span className="text-green-600">Balanced</span>
                  ) : (
                    formatMoney(Math.abs(grandNet))
                  )}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {drillDown && (
        <DrillDownModal
          glCode={drillDown.glCode}
          glName={drillDown.glName}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  );
}
