import { cn } from '@/lib/utils';
import type { BranchPerformance } from '../../api/executiveReportApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(value: number): string {
  if (value >= 1e9) return `₦${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `₦${(value / 1e6).toFixed(0)}M`;
  return `₦${value.toLocaleString()}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span title="1st Place">🥇</span>;
  if (rank === 2) return <span title="2nd Place">🥈</span>;
  if (rank === 3) return <span title="3rd Place">🥉</span>;
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

function EfficiencyBadge({ ratio }: { ratio: number }) {
  const cls = cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
    ratio < 60
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : ratio <= 70
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  );
  return <span className={cls}>{ratio.toFixed(1)}%</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TopBranchesTableProps {
  branches: BranchPerformance[];
}

export function TopBranchesTable({ branches }: TopBranchesTableProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Branch Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Top 10 branches by revenue — YTD</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> {'<'}60% efficient
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> 60–70%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> {'>'}70%
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">Rank</th>
              <th className="text-left pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deposits</th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Loans</th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Customers</th>
              <th className="text-right pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Efficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {branches.map((branch) => (
              <tr
                key={branch.rank}
                className="hover:bg-muted/40 transition-colors"
              >
                <td className="py-3 pr-2">
                  <RankBadge rank={branch.rank} />
                </td>
                <td className="py-3 pr-4">
                  <span className={cn('font-medium', branch.rank <= 3 && 'text-foreground')}>
                    {branch.branch}
                  </span>
                </td>
                <td className="py-3 text-right tabular-nums">{fmtMoney(branch.deposits)}</td>
                <td className="py-3 text-right tabular-nums">{fmtMoney(branch.loans)}</td>
                <td className="py-3 text-right tabular-nums font-medium">{fmtMoney(branch.revenue)}</td>
                <td className="py-3 text-right tabular-nums">{branch.customers.toLocaleString()}</td>
                <td className="py-3 text-right">
                  <EfficiencyBadge ratio={branch.efficiencyRatio} />
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer totals */}
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/20">
              <td className="py-2.5" />
              <td className="py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">All Branches Total</td>
              <td className="py-2.5 text-right tabular-nums text-xs font-semibold">
                {fmtMoney(branches.reduce((s, b) => s + b.deposits, 0))}
              </td>
              <td className="py-2.5 text-right tabular-nums text-xs font-semibold">
                {fmtMoney(branches.reduce((s, b) => s + b.loans, 0))}
              </td>
              <td className="py-2.5 text-right tabular-nums text-xs font-semibold">
                {fmtMoney(branches.reduce((s, b) => s + b.revenue, 0))}
              </td>
              <td className="py-2.5 text-right tabular-nums text-xs font-semibold">
                {branches.reduce((s, b) => s + b.customers, 0).toLocaleString()}
              </td>
              <td className="py-2.5 text-right">
                <EfficiencyBadge
                  ratio={
                    parseFloat(
                      (
                        branches.reduce((s, b) => s + b.efficiencyRatio, 0) / branches.length
                      ).toFixed(1),
                    )
                  }
                />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
