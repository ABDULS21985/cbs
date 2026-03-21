import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Clock, DollarSign, TrendingUp, ShieldAlert, Scale,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { cn } from '@/lib/utils';
import {
  useSecuritiesFailsDashboard,
  useSecuritiesFailsCounterpartyReport,
} from '../hooks/useCustodyExt';
import { AgingBucketChart } from '../components/AgingBucketChart';

export function SecuritiesFailsPage() {
  useEffect(() => { document.title = 'Securities Fails | CBS'; }, []);

  const { data: dashboard, isLoading: dashLoading } = useSecuritiesFailsDashboard();
  const { data: cpReport } = useSecuritiesFailsCounterpartyReport();

  // Backend: Map<String, Object> with keys totalFails, openFails, byType, byAgingBucket, totalPenalty
  const db = dashboard as Record<string, unknown> | undefined;
  const totalFails = (db?.totalFails as number) ?? 0;
  const openFails = (db?.openFails as number) ?? 0;
  const totalPenalty = (db?.totalPenalty as number) ?? 0;
  const byType = (db?.byType as Record<string, number>) ?? {};
  const byAgingBucket = (db?.byAgingBucket as Record<string, number>) ?? {};

  // Aging bucket chart data
  const bucketData = useMemo(() =>
    Object.entries(byAgingBucket).map(([bucket, count]) => ({ bucket, count, amount: 0 })),
  [byAgingBucket]);

  // Type breakdown
  const typeData = useMemo(() =>
    Object.entries(byType).map(([type, count]) => ({ type, count })),
  [byType]);

  // Counterparty report
  const cpData = useMemo(() => {
    if (!cpReport) return [];
    return Object.entries(cpReport)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cpReport]);

  const [bucketFilter, setBucketFilter] = useState('');

  return (
    <>
      <PageHeader title="Securities Fails Management" subtitle="Settlement fail tracking, escalation, buy-in, and CSDR penalties" />

      <div className="page-container space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total Fails" value={totalFails} format="number" icon={AlertTriangle} loading={dashLoading} />
          <StatCard label="Open Fails" value={openFails} format="number" icon={Clock} loading={dashLoading} />
          <StatCard label="Penalty Accrued" value={totalPenalty} format="money" compact icon={Scale} loading={dashLoading} />
          <StatCard label="Counterparties" value={cpData.length} format="number" icon={TrendingUp} loading={dashLoading} />
        </div>

        {/* Type Breakdown */}
        {typeData.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Fail Type Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {typeData.map(({ type, count }) => (
                <div key={type} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground truncate">{type.replace(/_/g, ' ')}</p>
                  <p className="text-xl font-bold font-mono mt-1">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aging Chart */}
        {bucketData.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Aging Distribution</h3>
              {bucketFilter && (
                <button onClick={() => setBucketFilter('')} className="text-xs text-primary hover:underline">Clear filter: {bucketFilter}</button>
              )}
            </div>
            <AgingBucketChart data={bucketData} onBucketClick={(b) => setBucketFilter(bucketFilter === b ? '' : b)} />
          </div>
        )}

        {/* Counterparty Report */}
        {cpData.length > 0 && (
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-3">Counterparty Fail Report</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cpData.map((cp) => (
                <div key={cp.name} className={cn('rounded-lg border p-3', cp.count > 5 ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : '')}>
                  <p className="text-xs text-muted-foreground truncate">{cp.name}</p>
                  <p className={cn('text-lg font-bold font-mono', cp.count > 5 ? 'text-red-600' : '')}>{cp.count}</p>
                  <p className="text-[10px] text-muted-foreground">open fails</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!dashLoading && totalFails === 0 && (
          <div className="rounded-xl border bg-card p-12 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">No securities fails</p>
            <p className="text-xs text-muted-foreground mt-1">All settlements are resolving normally</p>
          </div>
        )}

        {/* Loading state */}
        {dashLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {/* Note: individual fail details require selecting from the dashboard. */}
        {/* No list endpoint — use the counterparty report and type breakdown above. */}
        {totalFails > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 px-4 py-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              To manage individual fails (escalate, buy-in, penalty, resolve), navigate to{' '}
              <a href="/custody/fails/:ref" className="underline">Fail Detail</a> by entering the fail reference directly.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
