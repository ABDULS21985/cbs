import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { glApi } from '../../api/glApi';
import type { TrialBalanceRow } from '../../api/glApi';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = [2024, 2025, 2026];

export function TrialBalanceTable() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [compareMode, setCompareMode] = useState<'none' | 'prev-month' | 'prior-year'>('none');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['trial-balance', year, month],
    queryFn: () => glApi.getTrialBalance({ year, month }),
  });

  const { data: prevMonthRows = [] } = useQuery({
    queryKey: ['trial-balance', month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1],
    queryFn: () => glApi.getTrialBalance({ year: month === 1 ? year - 1 : year, month: month === 1 ? 12 : month - 1 }),
    enabled: compareMode === 'prev-month',
  });

  const { data: priorYearRows = [] } = useQuery({
    queryKey: ['trial-balance', year - 1, month],
    queryFn: () => glApi.getTrialBalance({ year: year - 1, month }),
    enabled: compareMode === 'prior-year',
  });

  const compareRows = compareMode === 'prev-month' ? prevMonthRows : compareMode === 'prior-year' ? priorYearRows : [];

  const grandTotalDr = rows.filter((r) => r.level === 0).reduce((s, r) => s + r.closingDr, 0);
  const grandTotalCr = rows.filter((r) => r.level === 0).reduce((s, r) => s + r.closingCr, 0);
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
            {compareMode === 'prev-month' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            vs Prev Month
          </button>
          <button
            onClick={() => setCompareMode(compareMode === 'prior-year' ? 'none' : 'prior-year')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
              compareMode === 'prior-year' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
            )}
          >
            {compareMode === 'prior-year' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
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
              <th className="text-left px-4 py-2.5 font-medium">Account Name</th>
              <th className="text-right px-3 py-2.5 font-medium">Opening DR</th>
              <th className="text-right px-3 py-2.5 font-medium">Opening CR</th>
              <th className="text-right px-3 py-2.5 font-medium">Period DR</th>
              <th className="text-right px-3 py-2.5 font-medium">Period CR</th>
              <th className="text-right px-3 py-2.5 font-medium">Closing DR</th>
              <th className="text-right px-3 py-2.5 font-medium">Closing CR</th>
              {compareMode !== 'none' && (
                <>
                  <th className="text-right px-3 py-2.5 font-medium border-l text-blue-600">
                    {compareMode === 'prev-month' ? 'Prev DR' : 'PY DR'}
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium text-blue-600">
                    {compareMode === 'prev-month' ? 'Prev CR' : 'PY CR'}
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
                  {Array.from({ length: compareMode !== 'none' ? 11 : 8 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-3.5 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              rows.map((row) => {
                const cmp = getCompareRow(row.glCode);
                const variance = cmp ? (row.closingDr - row.closingCr) - (cmp.closingDr - cmp.closingCr) : 0;
                return (
                  <tr
                    key={row.glCode}
                    className={cn(
                      'border-b border-border/40',
                      row.isHeader && row.level === 0 && 'bg-muted/30 font-semibold',
                      row.isHeader && row.level === 1 && 'bg-muted/10 font-medium',
                    )}
                  >
                    <td
                      className="px-4 py-2 font-mono"
                      style={{ paddingLeft: `${16 + row.level * 16}px` }}
                    >
                      {row.glCode}
                    </td>
                    <td className={cn('px-4 py-2', row.isHeader ? 'font-semibold' : 'font-normal')}>
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.openingDr > 0 ? formatMoney(row.openingDr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.openingCr > 0 ? formatMoney(row.openingCr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.periodDr > 0 ? formatMoney(row.periodDr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.periodCr > 0 ? formatMoney(row.periodCr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {row.closingDr > 0 ? formatMoney(row.closingDr) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-medium">
                      {row.closingCr > 0 ? formatMoney(row.closingCr) : '—'}
                    </td>
                    {compareMode !== 'none' && (
                      <>
                        <td className="px-3 py-2 text-right font-mono border-l text-muted-foreground">
                          {cmp && cmp.closingDr > 0 ? formatMoney(cmp.closingDr) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {cmp && cmp.closingCr > 0 ? formatMoney(cmp.closingCr) : '—'}
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
                <td colSpan={2} className="px-4 py-3">Grand Total</td>
                <td colSpan={4} />
                <td className="px-3 py-3 text-right font-mono">{formatMoney(grandTotalDr)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatMoney(grandTotalCr)}</td>
                {compareMode !== 'none' && <td colSpan={3} />}
              </tr>
              {!isBalanced && (
                <tr className="bg-red-50 dark:bg-red-900/20 border-t text-red-700 dark:text-red-400 font-semibold text-sm">
                  <td colSpan={2} className="px-4 py-3">Difference (Out of Balance)</td>
                  <td colSpan={4} />
                  <td colSpan={2} className="px-3 py-3 text-right font-mono">
                    {formatMoney(Math.abs(difference))}
                  </td>
                  {compareMode !== 'none' && <td colSpan={3} />}
                </tr>
              )}
              {isBalanced && (
                <tr className="bg-green-50 dark:bg-green-900/20 border-t text-green-700 dark:text-green-400 text-xs">
                  <td colSpan={8} className="px-4 py-2 text-center font-medium">
                    Trial Balance is in balance for {MONTHS[month - 1]} {year}
                  </td>
                  {compareMode !== 'none' && <td colSpan={3} />}
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
