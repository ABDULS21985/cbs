import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { BarChart3, ArrowLeftRight, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, TabsPage } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SecPosition {
  id: number; positionId: string; portfolioCode: string; instrumentCode: string;
  instrumentName: string; isin: string; instrumentType: string; currency: string;
  quantity: number; avgCost: number; costBasis: number; marketPrice: number;
  marketValue: number; unrealizedPnl: number; unrealizedPnlPct: number;
  accruedInterest: number; lastPricedAt: string; positionDate: string;
}

interface SecMovement {
  id: number; movementRef: string; positionId: string; movementDate: string;
  instrumentCode: string; instrumentName: string; movementType: string;
  quantity: number; price: number; settlementAmount: number; currency: string;
  counterpartyCode: string; counterpartyName: string; portfolioCode: string;
  tradeDate: string; settlementDate: string; status: string; createdAt: string;
}

interface PortfolioSummary {
  portfolioCode: string; portfolioName: string; totalMarketValue: number;
  currency: string; positionCount: number;
  byAssetClass: { assetClass: string; marketValue: number; percentage: number; count: number }[];
  positions: SecPosition[];
}

const PIE_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const MOVEMENT_BADGE: Record<string, string> = {
  BUY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SELL: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TRANSFER: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CORPORATE_ACTION: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ─── Main Page ───────────────────────────────────────────────────────────────

export function SecuritiesPositionPage() {
  const [portfolioCode, setPortfolioCode] = useState('MAIN');

  useEffect(() => {
    document.title = 'Securities Positions';
  }, []);

  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['sec-positions'],
    queryFn: () => apiGet<SecPosition[]>('/api/v1/securities-positions').catch(() => []),
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['sec-movements'],
    queryFn: () => apiGet<SecMovement[]>('/api/v1/securities-positions/movements').catch(() => []),
  });

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ['sec-portfolio', portfolioCode],
    queryFn: () => apiGet<PortfolioSummary>(`/api/v1/securities-positions/portfolio/${portfolioCode}`).catch(() => null),
    enabled: !!portfolioCode,
  });

  const portfolioCodes = useMemo(() => {
    const codes = new Set(positions.map((p) => p.portfolioCode));
    return Array.from(codes).sort();
  }, [positions]);

  const totalMarketValue = useMemo(() => positions.reduce((s, p) => s + p.marketValue, 0), [positions]);
  const totalPnl = useMemo(() => positions.reduce((s, p) => s + p.unrealizedPnl, 0), [positions]);

  const positionColumns = useMemo<ColumnDef<SecPosition, unknown>[]>(
    () => [
      { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ getValue }) => <span className="font-mono">{getValue<string>()}</span> },
      { accessorKey: 'instrumentName', header: 'Name' },
      { accessorKey: 'isin', header: 'ISIN', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
      { accessorKey: 'portfolioCode', header: 'Portfolio' },
      { accessorKey: 'quantity', header: 'Quantity', cell: ({ getValue }) => getValue<number>().toLocaleString() },
      { accessorKey: 'avgCost', header: 'Avg Cost', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
      { accessorKey: 'marketPrice', header: 'Mkt Price', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
      { accessorKey: 'marketValue', header: 'Mkt Value', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
      {
        accessorKey: 'unrealizedPnl',
        header: 'Unrealized P&L',
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return <span className={cn('font-mono font-medium', v >= 0 ? 'text-green-600' : 'text-red-600')}>{v >= 0 ? '+' : ''}{formatMoney(v)}</span>;
        },
      },
      {
        accessorKey: 'unrealizedPnlPct',
        header: 'P&L %',
        cell: ({ getValue }) => {
          const v = getValue<number>();
          return <span className={cn('font-mono', v >= 0 ? 'text-green-600' : 'text-red-600')}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>;
        },
      },
    ],
    [],
  );

  const movementColumns = useMemo<ColumnDef<SecMovement, unknown>[]>(
    () => [
      { accessorKey: 'movementRef', header: 'Reference', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
      { accessorKey: 'movementDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue<string>()) },
      { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ getValue }) => <span className="font-mono">{getValue<string>()}</span> },
      {
        accessorKey: 'movementType',
        header: 'Type',
        cell: ({ getValue }) => {
          const t = getValue<string>();
          return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', MOVEMENT_BADGE[t] ?? 'bg-gray-100 text-gray-600')}>{t.replace(/_/g, ' ')}</span>;
        },
      },
      { accessorKey: 'quantity', header: 'Quantity', cell: ({ getValue }) => getValue<number>().toLocaleString() },
      { accessorKey: 'price', header: 'Price', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
      { accessorKey: 'settlementAmount', header: 'Settlement Amt', cell: ({ getValue }) => <span className="font-mono">{formatMoney(getValue<number>())}</span> },
      { accessorKey: 'counterpartyName', header: 'Counterparty' },
      { accessorKey: 'portfolioCode', header: 'Portfolio' },
      { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <span className={cn('text-xs font-medium', getValue<string>() === 'SETTLED' ? 'text-green-600' : getValue<string>() === 'CANCELLED' ? 'text-red-600' : 'text-amber-600')}>{getValue<string>()}</span> },
    ],
    [],
  );

  const pieData = useMemo(() => {
    if (!portfolioData?.byAssetClass) return [];
    return portfolioData.byAssetClass.map((a) => ({ name: a.assetClass, value: a.marketValue }));
  }, [portfolioData]);

  const tabs = [
    {
      id: 'positions',
      label: 'Positions',
      icon: BarChart3,
      badge: positions.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={positionColumns} data={positions} isLoading={positionsLoading} enableGlobalFilter emptyMessage="No securities positions found" />
        </div>
      ),
    },
    {
      id: 'movements',
      label: 'Movements',
      icon: ArrowLeftRight,
      badge: movements.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={movementColumns} data={movements} isLoading={movementsLoading} enableGlobalFilter emptyMessage="No movements recorded" />
        </div>
      ),
    },
    {
      id: 'by-portfolio',
      label: 'By Portfolio',
      icon: PieIcon,
      content: (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground">Portfolio</label>
            <select
              value={portfolioCode}
              onChange={(e) => setPortfolioCode(e.target.value)}
              className="input w-48"
            >
              {portfolioCodes.length > 0 ? (
                portfolioCodes.map((c) => <option key={c} value={c}>{c}</option>)
              ) : (
                <option value="MAIN">MAIN</option>
              )}
            </select>
          </div>

          {portfolioLoading ? (
            <div className="flex justify-center py-12"><BarChart3 className="w-6 h-6 animate-pulse text-muted-foreground" /></div>
          ) : portfolioData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-semibold mb-1">{portfolioData.portfolioCode}</h3>
                <p className="text-sm text-muted-foreground mb-4">{portfolioData.positionCount} positions</p>
                <p className="text-2xl font-semibold font-mono">{formatMoney(portfolioData.totalMarketValue, portfolioData.currency)}</p>
              </div>
              {pieData.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold mb-4">Allocation by Asset Class</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {portfolioData.positions.length > 0 && (
                <div className="lg:col-span-2">
                  <DataTable columns={positionColumns} data={portfolioData.positions} enableGlobalFilter emptyMessage="No positions in this portfolio" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">No data for portfolio {portfolioCode}</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Securities Positions" subtitle="Position book, movements and portfolio allocation" />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Positions" value={positions.length} format="number" icon={BarChart3} loading={positionsLoading} />
          <StatCard label="Total Market Value" value={totalMarketValue} format="money" compact icon={PieIcon} loading={positionsLoading} />
          <StatCard
            label="Unrealized P&L"
            value={totalPnl}
            format="money"
            compact
            trend={totalPnl >= 0 ? 'up' : 'down'}
            icon={ArrowLeftRight}
            loading={positionsLoading}
          />
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
