import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { glApi } from '../../api/glApi';
import type { TrialBalanceRow } from '../../api/glApi';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { format, lastDayOfMonth } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = [2024, 2025, 2026];

/** Build a LocalDate string for the last day of a given month/year */
function buildDate(year: number, month: number): string {
  const d = lastDayOfMonth(new Date(year, month - 1, 1));
  return format(d, 'yyyy-MM-dd');
}

export function TrialBalanceTable() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [compareMode, setCompareMode] = useState<'none' | 'prev-month' | 'prior-year'>('none');

  const dateStr = buildDate(year, month);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['trial-balance', dateStr],
    queryFn: () => glApi.getTrialBalance(dateStr),
  });

  const prevDate = buildDate(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  const { data: prevMonthRows = [] } = useQuery({
    queryKey: ['trial-balance', prevDate],
    queryFn: () => glApi.getTrialBalance(prevDate),
    enabled: compareMode === 'prev-month',
  });

  const priorYearDate = buildDate(year - 1, month);
  const { data: priorYearRows = [] } = useQuery({
    queryKey: ['trial-balance', priorYearDate],
    queryFn: () => glApi.getTrialBalance(priorYearDate),
    enabled: compareMode === 'prior-year',
  });

  const compareRows = compareMode === 'prev-month' ? prevMonthRows : compareMode === 'prior-year' ? priorYearRows : [];

  const grandTotalDr = rows.reduce((s, r) => s + r.debitTotal, 0);
  const grandTotalCr = rows.reduce((s, r) => s + r.creditTotal, 0);
  const difference = grandTotalDr - grandTotalCr;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleExport = (type: 'PDF' | 'Excel') => {
    toast.info(`${type} export initiated. Your file will be ready shortly.`);
  };

  const getCompareRow = (glCode: string): TrialBalanceRow | undefined =>
    compareRows.find((r) => r.glCode === glCode);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Period:</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Compare:</span>
          <button
            onClick={() => setCompareMode(compareMode === 'prev-month' ? 'none' : 'prev-month')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              compareMode === 'prev-month' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
            )}
          >
            vs Prev Month
          </button>
          <button
            onClick={() => setCompareMode(compareMode === 'prior-year' ? 'none' : 'prior-year')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              compareMode === 'prior-year' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
            )}
          >
            vs Prior Year
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => handleExport('PDF')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button onClick={() => handleExport('Excel')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">
            <FileDown className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30 border-b text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium w-24">GL Code</th>
              <th className="text-center px-3 py-2.5 font-medium">Currency</th>
              <th className="text-right px-3 py-2.5 font-medium">Opening</th>
              <th className="text-right px-3 py-2.5 font-medium">Debits</th>
              <th className="text-right px-3 py-2.5 font-medium">Credits</th>
              <th className="text-right px-3 py-2.5 font-medium">Closing</th>
              {compareMode !== 'none' && (
                <>
                  <th className="text-right px-3 py-2.5 font-medium border-l text-blue-600">
                    {compareMode === 'prev-month' ? 'Prev Closing' : 'PY Closing'}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium text-blue-600">Variance</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: compareMode !== 'none' ? 8 : 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-3.5 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              rows.map((row) => {
                const cmp = getCompareRow(row.glCode);
                const variance = cmp ? row.closingBalance - cmp.closingBalance : 0;
                return (
                  <tr
                    key={`${row.glCode}-${row.branchCode}-${row.currencyCode}`}
                    className="border-b border-border/40 hover:bg-muted/20"
                  >
                    <td className="px-4 py-2 font-mono">{row.glCode}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">{row.currencyCode}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatMoney(row.openingBalance)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.debitTotal > 0 ? formatMoney(row.debitTotal) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.creditTotal > 0 ? formatMoney(row.creditTotal) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {formatMoney(row.closingBalance)}
                    </td>
                    {compareMode !== 'none' && (
                      <>
                        <td className="px-3 py-2 text-right font-mono border-l text-muted-foreground">
                          {cmp ? formatMoney(cmp.closingBalance) : '—'}
                        </td>
                        <td className={cn('px-3 py-2 text-right font-mono', variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                          {variance !== 0 ? (variance > 0 ? '+' : '') + formatMoney(variance) : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {!isLoading && rows.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t-2 font-bold text-sm">
                <td colSpan={3} className="px-4 py-3">Grand Total</td>
                <td className="px-3 py-3 text-right font-mono">{formatMoney(grandTotalDr)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatMoney(grandTotalCr)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatMoney(grandTotalDr - grandTotalCr)}</td>
                {compareMode !== 'none' && <td colSpan={2} />}
              </tr>
              {!isBalanced && (
                <tr className="bg-red-50 dark:bg-red-900/20 border-t text-red-700 dark:text-red-400 font-semibold text-sm">
                  <td colSpan={3} className="px-4 py-3">Difference (Out of Balance)</td>
                  <td colSpan={3} className="px-3 py-3 text-right font-mono">
                    {formatMoney(Math.abs(difference))}
                  </td>
                  {compareMode !== 'none' && <td colSpan={2} />}
                </tr>
              )}
              {isBalanced && (
                <tr className="bg-green-50 dark:bg-green-900/20 border-t text-green-700 dark:text-green-400 text-xs">
                  <td colSpan={6 + (compareMode !== 'none' ? 2 : 0)} className="px-4 py-2 text-center font-medium">
                    Trial Balance is in balance for {MONTHS[month - 1]} {year}
                  </td>
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
