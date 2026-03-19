import { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from 'recharts';
import { ArrowLeftRight, Table2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact, formatMoney } from '@/lib/formatters';
import type { AlmPositionRow } from '../api/almApi';
import { applyBehavioralAdjustments, DEFAULT_BEHAVIORAL_PARAMS, type BehavioralParams } from '../hooks/useAlmLiquidity';

type ViewMode = 'contractual' | 'behavioral';
type DisplayMode = 'chart' | 'table';

interface CashflowLadderProps {
  positions: AlmPositionRow[];
  currency: string;
  survivalLimit?: number;
  behavioralParams?: BehavioralParams;
}

interface LadderRow {
  bucket: string;
  inflows: number;
  outflows: number;
  net: number;
  cumulative: number;
  breached: boolean;
}

function buildLadderRows(positions: AlmPositionRow[], limit: number): LadderRow[] {
  return positions.map((p) => ({
    bucket: p.timeBucket,
    inflows: p.totalAssets,
    outflows: p.totalLiabilities,
    net: p.gapAmount,
    cumulative: p.cumulativeGap,
    breached: p.cumulativeGap < -limit,
  }));
}

export function CashflowLadder({ positions, currency, survivalLimit = 0, behavioralParams }: CashflowLadderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('contractual');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('table');

  const behavioralPositions = useMemo(
    () => applyBehavioralAdjustments(positions, behavioralParams ?? DEFAULT_BEHAVIORAL_PARAMS),
    [positions, behavioralParams],
  );

  const activePositions = viewMode === 'contractual' ? positions : behavioralPositions;
  const rows = useMemo(() => buildLadderRows(activePositions, survivalLimit), [activePositions, survivalLimit]);

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-5 border-b flex-wrap">
        <h3 className="text-sm font-semibold">Cashflow Ladder</h3>

        <div className="flex items-center gap-3">
          {/* Contractual / Behavioral toggle */}
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            {(['contractual', 'behavioral'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                  viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode === 'contractual' ? 'Contractual' : 'Behavioral'}
              </button>
            ))}
          </div>

          {/* Chart / Table toggle */}
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            <button type="button" onClick={() => setDisplayMode('table')} className={cn('p-1.5 rounded-md transition-colors', displayMode === 'table' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
              <Table2 className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setDisplayMode('chart')} className={cn('p-1.5 rounded-md transition-colors', displayMode === 'chart' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Behavioral adjustment note */}
      {viewMode === 'behavioral' && (
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/40 px-3 py-2">
          <ArrowLeftRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Behavioral view adjusts for deposit stickiness ({((behavioralParams ?? DEFAULT_BEHAVIORAL_PARAMS).depositStickinessRate * 100).toFixed(0)}%),
            loan prepayments ({((behavioralParams ?? DEFAULT_BEHAVIORAL_PARAMS).loanPrepaymentRate * 100).toFixed(0)}%),
            and term deposit rollover ({((behavioralParams ?? DEFAULT_BEHAVIORAL_PARAMS).rolloverRate * 100).toFixed(0)}%).
          </p>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {displayMode === 'chart' ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [formatMoney(v, currency), name]}
                  labelFormatter={(label) => `Bucket: ${label}`}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                {survivalLimit > 0 && (
                  <ReferenceLine y={-survivalLimit} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limit', position: 'right', fontSize: 10 }} />
                )}
                <Bar dataKey="inflows" name="Inflows" fill="#22c55e" barSize={20} />
                <Bar dataKey="outflows" name="Outflows" barSize={20}>
                  {rows.map((_, i) => (
                    <Cell key={i} fill="#ef4444" />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cumulative" name="Cumulative Gap" stroke="#3b82f6" strokeWidth={2} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Time Bucket</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Inflows</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Outflows</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Net Gap</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.bucket}
                    className={cn(
                      'transition-colors',
                      row.breached && 'bg-red-50 dark:bg-red-900/10',
                    )}
                  >
                    <td className="py-2.5 px-3 text-xs font-medium">
                      {row.bucket}
                      {row.breached && <span className="ml-1.5 text-red-500 text-[10px] font-bold">BREACH</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-green-600 dark:text-green-400">
                      {formatMoney(row.inflows, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-red-600 dark:text-red-400">
                      {formatMoney(row.outflows, currency)}
                    </td>
                    <td className={cn('py-2.5 px-3 text-right font-mono text-xs font-semibold', row.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {formatMoney(row.net, currency)}
                    </td>
                    <td className={cn('py-2.5 px-3 text-right font-mono text-xs font-semibold', row.cumulative >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}>
                      {formatMoney(row.cumulative, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
