import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { BarChart2, AlertTriangle, TrendingUp, Radio, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { tradingApi, type TraderPosition } from '../api/tradingApi';

const columns: ColumnDef<TraderPosition, unknown>[] = [
  {
    accessorKey: 'dealerName',
    header: 'Dealer',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'instrument',
    header: 'Instrument',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'currency',
    header: 'CCY',
    cell: ({ getValue }) => (
      <span className="text-xs font-mono">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'longPosition',
    header: 'Long',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block text-green-600">
        {formatMoney(row.original.longPosition, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'shortPosition',
    header: 'Short',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block text-red-600">
        {formatMoney(row.original.shortPosition, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'netExposure',
    header: 'Net Exposure',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block font-semibold">
        {formatMoney(row.original.netExposure, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'utilizationPct',
    header: 'Utilization',
    cell: ({ getValue }) => {
      const pct = Number(getValue());
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs">{pct.toFixed(1)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'unrealizedPnl',
    header: 'Unrealized P&L',
    cell: ({ row }) => {
      const pnl = row.original.unrealizedPnl;
      return (
        <span className={`text-sm font-mono text-right block ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatMoney(pnl, row.original.currency)}
        </span>
      );
    },
  },
  {
    accessorKey: 'breachFlag',
    header: 'Breach',
    cell: ({ getValue }) =>
      getValue() ? (
        <StatusBadge status="BREACH" />
      ) : (
        <span className="text-xs text-green-600">Clear</span>
      ),
  },
];

export function TreasuryPositionsPage() {
  useEffect(() => { document.title = 'Positions | CBS'; }, []);
  const [selectedDeskId, setSelectedDeskId] = useState<string>('');

  const { data: desks = [], isLoading: desksLoading } = useQuery({
    queryKey: ['dealer-desks'],
    queryFn: () => tradingApi.listDealerDesks(),
  });

  // Use the first desk by default
  const activeDeskId = selectedDeskId || desks[0]?.id || '';

  const { data: positions = [], isLoading: positionsLoading, isError: positionsError, refetch: refetchPositions, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ['trader-positions', activeDeskId],
    queryFn: () => tradingApi.getPositionsByDealer(activeDeskId),
    enabled: !!activeDeskId,
    refetchInterval: 15_000,
  });

  const isLoading = desksLoading || positionsLoading;
  const totalNetExposure = positions.reduce((sum, p) => sum + p.netExposure, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const breachCount = positions.filter((p) => p.breachFlag).length;
  const breachedPositions = positions.filter((p) => p.breachFlag);
  const avgUtilization = positions.length > 0 ? positions.reduce((s, p) => s + p.utilizationPct, 0) / positions.length : 0;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <>
      <PageHeader title="Trader Positions" subtitle="Real-time position monitoring across desks and instruments"
        actions={
          <span className={cn('flex items-center gap-1.5 text-xs font-medium',
            isFetching ? 'text-amber-600' : 'text-green-600',
          )}>
            <span className={cn('w-2 h-2 rounded-full', isFetching ? 'bg-amber-500' : 'bg-green-500 animate-pulse')} />
            {isFetching ? 'Updating...' : 'Live (15s)'}
            {lastUpdated && <span className="text-muted-foreground ml-1">· {lastUpdated.toLocaleTimeString()}</span>}
          </span>
        }
      />
      <div className="page-container space-y-6">
        {/* Breach Alert Banner */}
        {breachCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <strong className="text-sm">{breachCount} position limit breach{breachCount !== 1 ? 'es' : ''} detected</strong>
            </div>
            <div className="space-y-1 ml-7">
              {breachedPositions.slice(0, 5).map((p, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-300">
                  {p.dealerName} — {p.instrument} ({p.currency}): {formatMoney(p.netExposure)} vs limit {formatMoney(p.positionLimit)} ({p.utilizationPct.toFixed(1)}%)
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Position Limit Status Panel */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Position Limit Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Overall Utilization</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', avgUtilization >= 90 ? 'bg-red-500' : avgUtilization >= 70 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(avgUtilization, 100)}%` }} />
                </div>
                <span className="text-xs font-mono font-bold">{avgUtilization.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Exposure</p>
              <p className="text-lg font-bold font-mono">{formatMoney(totalNetExposure)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unrealized P&L</p>
              <p className={cn('text-lg font-bold font-mono', totalPnl >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(totalPnl)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Breaches</p>
              <p className={cn('text-lg font-bold', breachCount > 0 ? 'text-red-600' : 'text-green-600')}>{breachCount}</p>
            </div>
          </div>
        </div>

        {positionsError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load positions.</span>
            <button onClick={() => refetchPositions()} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
          </div>
        )}
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Positions" value={positions.length} format="number" icon={BarChart2} loading={isLoading} />
          <StatCard label="Net Exposure" value={totalNetExposure} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Unrealized P&L" value={totalPnl} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Breaches" value={breachCount} format="number" icon={AlertTriangle} loading={isLoading} />
        </div>

        {/* Desk selector */}
        {desks.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {desks.map((desk) => (
              <button
                key={desk.id}
                onClick={() => setSelectedDeskId(desk.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  activeDeskId === desk.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted/40 border-border'
                }`}
              >
                {desk.name}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <DataTable
          columns={columns}
          data={positions}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="trader-positions"
          emptyMessage="No positions found for this desk"
          pageSize={20}
        />
      </div>
    </>
  );
}
