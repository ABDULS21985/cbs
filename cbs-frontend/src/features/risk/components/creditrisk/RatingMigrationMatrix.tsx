import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRatingMigration } from '../../hooks/useCreditRisk';

const GRADES = ['A', 'B', 'C', 'D', 'E'];

const cellBg = (fromIndex: number, toIndex: number, pct: number): string => {
  if (fromIndex === toIndex) {
    // Diagonal: green scale — more stable = more green
    if (pct > 80) return 'bg-green-200 dark:bg-green-900/50';
    if (pct > 60) return 'bg-green-100 dark:bg-green-900/30';
    return 'bg-green-50 dark:bg-green-900/10';
  } else if (toIndex < fromIndex) {
    // Upgrade (moving to better grade): blue
    if (pct > 10) return 'bg-blue-200 dark:bg-blue-900/50';
    if (pct > 5) return 'bg-blue-100 dark:bg-blue-900/30';
    return 'bg-blue-50 dark:bg-blue-900/10';
  } else {
    // Downgrade: red
    if (pct > 10) return 'bg-red-200 dark:bg-red-900/50';
    if (pct > 5) return 'bg-red-100 dark:bg-red-900/30';
    return 'bg-red-50 dark:bg-red-900/10';
  }
};

const defaultCellBg = (pct: number): string => {
  if (pct > 10) return 'bg-red-200 dark:bg-red-900/50';
  if (pct > 5) return 'bg-red-100 dark:bg-red-900/30';
  return 'bg-red-50 dark:bg-red-900/10';
};

export function RatingMigrationMatrix() {
  const [period, setPeriod] = useState<'QUARTERLY' | 'ANNUAL'>('QUARTERLY');
  const { data: rows = [], isLoading } = useRatingMigration(period);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold">Rating Migration Matrix</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Percentage of obligors migrating between rating grades
          </p>
        </div>
        <div className="flex gap-1">
          {(['QUARTERLY', 'ANNUAL'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-colors',
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {p === 'QUARTERLY' ? 'Quarterly' : 'Annual'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Loading migration data...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          No migration data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground bg-muted/50 border border-border rounded-tl">
                  From \ To
                </th>
                {GRADES.map((g) => (
                  <th
                    key={g}
                    className="px-3 py-2 text-center font-semibold bg-muted/50 border border-border"
                  >
                    {g}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold bg-muted/50 border border-border rounded-tr text-red-600">
                  Default
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fromIndex = GRADES.indexOf(row.fromGrade);
                const values = [row.toA, row.toB, row.toC, row.toD, row.toE];

                return (
                  <tr key={row.fromGrade}>
                    <td className="px-3 py-2 font-semibold border border-border bg-muted/30">
                      {row.fromGrade}
                    </td>
                    {values.map((val, toIndex) => (
                      <td
                        key={toIndex}
                        className={cn(
                          'px-3 py-2 text-center border border-border font-mono',
                          cellBg(fromIndex, toIndex, val),
                        )}
                      >
                        {val.toFixed(1)}%
                      </td>
                    ))}
                    <td
                      className={cn(
                        'px-3 py-2 text-center border border-border font-mono',
                        defaultCellBg(row.toDefault),
                      )}
                    >
                      {row.toDefault.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-200" />
          <span>Stable (diagonal)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-200" />
          <span>Upgrade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-200" />
          <span>Downgrade / Default</span>
        </div>
      </div>
    </div>
  );
}
