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
                <span>{b.portfolio} — {b.currency}</span>
                <span className="font-mono text-red-600 font-semibold">{(b.varUtilizationPct ?? 0).toFixed(1)}%</span>
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
    { accessorKey: 'positionDate', header: 'Date', cell: ({ row }) => formatDate(row.original.positionDate) },
    { accessorKey: 'portfolio', header: 'Portfolio' },
    { accessorKey: 'riskType', header: 'Type', cell: ({ row }) => <span className="text-xs font-mono">{row.original.riskType}</span> },
    { accessorKey: 'currency', header: 'CCY' },
    { accessorKey: 'var1d95', header: 'VaR 1d 95%', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.var1d95)}</span> },
    { accessorKey: 'var1d99', header: 'VaR 1d 99%', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.var1d99)}</span> },
    { accessorKey: 'var10d99', header: 'VaR 10d 99%', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.var10d99)}</span> },
    { accessorKey: 'stressLossSevere', header: 'Stress Loss', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{formatMoney(row.original.stressLossSevere)}</span> },
    { accessorKey: 'varUtilizationPct', header: 'Limit %', cell: ({ row }) => <span className={cn('font-mono text-sm font-semibold', row.original.limitBreach ? 'text-red-600' : row.original.varUtilizationPct > 80 ? 'text-amber-600' : 'text-green-600')}>{(row.original.varUtilizationPct ?? 0).toFixed(1)}%</span> },
    { accessorKey: 'delta', header: 'Delta', cell: ({ row }) => <span className="font-mono text-xs">{(row.original.delta ?? 0).toFixed(4)}</span> },
    { accessorKey: 'dailyPnl', header: 'Daily P&L', cell: ({ row }) => <span className={cn('font-mono text-xs', (row.original.dailyPnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(row.original.dailyPnl)}</span> },
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
