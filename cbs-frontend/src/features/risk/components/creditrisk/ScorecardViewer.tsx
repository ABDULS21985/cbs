import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate, formatPercent } from '@/lib/formatters';
import { useScorecards, useScorecardDetail } from '../../hooks/useCreditRisk';
import type { Scorecard } from '../../types/creditRisk';

const TYPE_COLORS: Record<string, string> = {
  RETAIL: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SME: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  CORPORATE: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MORTGAGE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function psiRag(psi: number): { label: string; colorClass: string; bgClass: string } {
  if (psi < 0.1) return { label: 'Stable', colorClass: 'text-green-700 dark:text-green-400', bgClass: 'bg-green-50 dark:bg-green-900/20' };
  if (psi <= 0.25) return { label: 'Monitor', colorClass: 'text-amber-700 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-900/20' };
  return { label: 'Unstable', colorClass: 'text-red-700 dark:text-red-400', bgClass: 'bg-red-50 dark:bg-red-900/20' };
}

const scorecardColumns: ColumnDef<Scorecard, any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.name}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[row.original.type] || 'bg-gray-100 text-gray-700')}>
        {row.original.type}
      </span>
    ),
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">v{row.original.version}</span>,
  },
  {
    accessorKey: 'auc',
    header: 'AUC',
    cell: ({ row }) => <span className="text-xs font-mono">{formatPercent(row.original.auc)}</span>,
  },
  {
    accessorKey: 'gini',
    header: 'Gini',
    cell: ({ row }) => <span className="text-xs font-mono">{formatPercent(row.original.gini)}</span>,
  },
  {
    accessorKey: 'lastValidated',
    header: 'Last Validated',
    cell: ({ row }) => <span className="text-xs">{formatDate(row.original.lastValidated)}</span>,
  },
  {
    accessorKey: 'active',
    header: 'Active',
    cell: ({ row }) => row.original.active ? (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>
    ),
  },
];

export function ScorecardViewer() {
  const { data: scorecards = [], isLoading } = useScorecards();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detail, isLoading: detailLoading } = useScorecardDetail(
    selectedId ?? 0,
    selectedId !== null,
  );

  const psiInfo = detail ? psiRag(detail.psi) : null;

  return (
    <div className="space-y-4 p-4">
      <DataTable
        columns={scorecardColumns}
        data={scorecards}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedId(row.id)}
        emptyMessage="No scorecards available"
        pageSize={10}
      />

      {selectedId !== null && (
        <div className="rounded-lg border bg-card p-4 space-y-5">
          {detailLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading scorecard detail...
            </div>
          ) : !detail ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Failed to load scorecard detail
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{detail.name}</h4>
                  <p className="text-xs text-muted-foreground">v{detail.version} — {detail.type}</p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border"
                >
                  Close
                </button>
              </div>

              {/* PSI Score */}
              <div className={cn('rounded-lg p-3 flex items-center justify-between', psiInfo?.bgClass)}>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Population Stability Index (PSI)</p>
                  <p className={cn('text-2xl font-bold mt-0.5', psiInfo?.colorClass)}>
                    {detail.psi.toFixed(3)}
                  </p>
                </div>
                <div className={cn('px-3 py-1.5 rounded-full text-sm font-semibold', psiInfo?.bgClass, psiInfo?.colorClass)}>
                  {psiInfo?.label}
                  <p className="text-xs font-normal">
                    {detail.psi < 0.1 ? '< 0.10' : detail.psi <= 0.25 ? '0.10 – 0.25' : '> 0.25'}
                  </p>
                </div>
              </div>

              {/* Score Distribution */}
              {detail.scoreDistribution && detail.scoreDistribution.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold mb-2">Score Distribution</h5>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={detail.scoreDistribution} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="good" name="Good" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="bad" name="Bad" fill="#ef4444" stackId="a" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Characteristics */}
              {detail.characteristics && detail.characteristics.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold mb-2">Score Characteristics</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left pb-1.5 font-medium text-muted-foreground pr-4">Variable</th>
                          <th className="text-left pb-1.5 font-medium text-muted-foreground pr-4">Weight</th>
                          <th className="text-left pb-1.5 font-medium text-muted-foreground">IV Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.characteristics.map((c) => (
                          <tr key={c.name} className="border-b last:border-0">
                            <td className="py-1.5 pr-4 font-medium">{c.name}</td>
                            <td className="py-1.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[80px]">
                                  <div
                                    className="h-1.5 rounded-full bg-blue-500"
                                    style={{ width: `${Math.min(c.weight * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="font-mono w-10 text-right">
                                  {(c.weight * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-1.5 font-mono">{c.iv.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
