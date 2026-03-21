import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { AlertTriangle, BarChart3, TrendingDown, Shield, Activity } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { marketRiskApi, type MarketRiskPosition } from '../api/marketRiskApi';

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['market-risk', 'stats'],
    queryFn: () => marketRiskApi.getStats(),
    staleTime: 60_000,
  });
  const { data: breaches = [] } = useQuery({
    queryKey: ['market-risk', 'breaches'],
    queryFn: () => marketRiskApi.getBreaches(),
  });

  const s = (stats ?? {}) as Record<string, unknown>;

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Portfolio VaR" value={(s.totalVar as number) ?? 0} format="money" compact icon={TrendingDown} loading={isLoading} />
        <StatCard label="Avg Limit Util" value={`${((s.avgLimitUtilization as number) ?? 0).toFixed(1)}%`} icon={BarChart3} loading={isLoading} />
        <StatCard label="Breaches" value={(s.breachCount as number) ?? breaches.length} format="number" icon={AlertTriangle} loading={isLoading} />
        <StatCard label="Stress Loss" value={(s.portfolioStressLoss as number) ?? 0} format="money" compact icon={Shield} loading={isLoading} />
      </div>

      {breaches.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{breaches.length} limit breach{breaches.length !== 1 ? 'es' : ''}</p>
          </div>
          <div className="space-y-2">
            {breaches.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-red-100 dark:border-red-800 pb-1">
                <span>{b.deskName} — {b.currency}</span>
                <span className="font-mono text-red-600 font-semibold">{b.limitUtilization.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PositionsTab() {
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['market-risk', 'list'],
    queryFn: () => marketRiskApi.list({ page: 0, size: 50 }),
  });

  const cols: ColumnDef<MarketRiskPosition, unknown>[] = useMemo(() => [
    { accessorKey: 'reportDate', header: 'Date', cell: ({ row }) => formatDate(row.original.reportDate) },
    { accessorKey: 'deskName', header: 'Desk' },
    { accessorKey: 'currency', header: 'CCY' },
    { accessorKey: 'varHistorical', header: 'VaR (Hist)', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.varHistorical)}</span> },
    { accessorKey: 'varParametric', header: 'VaR (Param)', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.varParametric)}</span> },
    { accessorKey: 'varMonteCarlo', header: 'VaR (MC)', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.varMonteCarlo)}</span> },
    { accessorKey: 'stressLoss', header: 'Stress Loss', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{formatMoney(row.original.stressLoss)}</span> },
    { accessorKey: 'limitUtilization', header: 'Limit %', cell: ({ row }) => <span className={cn('font-mono text-sm font-semibold', row.original.breached ? 'text-red-600' : row.original.limitUtilization > 80 ? 'text-amber-600' : 'text-green-600')}>{row.original.limitUtilization.toFixed(1)}%</span> },
    { accessorKey: 'greeksDelta', header: 'Delta', cell: ({ row }) => <span className="font-mono text-xs">{row.original.greeksDelta.toFixed(4)}</span> },
    { accessorKey: 'pnlAttribution', header: 'P&L Attr', cell: ({ row }) => <span className={cn('font-mono text-xs', row.original.pnlAttribution >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(row.original.pnlAttribution)}</span> },
  ], []);

  return (
    <div className="p-4">
      <DataTable columns={cols} data={positions} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="market-risk-positions" emptyMessage="No market risk positions" pageSize={20} />
    </div>
  );
}

export default function MarketRiskPage() {
  useEffect(() => { document.title = 'Market Risk | CBS'; }, []);

  return (
    <>
      <PageHeader title="Market Risk" subtitle="VaR analysis, stress testing, Greeks, P&L attribution, and limit monitoring" backTo="/treasury" />
      <div className="page-container">
        <TabsPage syncWithUrl tabs={[
          { id: 'overview', label: 'Overview', content: <OverviewTab /> },
          { id: 'positions', label: 'Risk Positions', content: <PositionsTab /> },
        ]} />
      </div>
    </>
  );
}
