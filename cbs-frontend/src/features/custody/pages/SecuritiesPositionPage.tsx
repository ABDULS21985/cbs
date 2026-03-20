import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useSecuritiesPositions } from '../hooks/useCustodyExt';
import { PositionSummaryCards } from '../components/PositionSummaryCards';
import { HoldingsChart } from '../components/HoldingsChart';
import { MovementForm } from '../components/MovementForm';
import type { SecuritiesPosition } from '../types/securitiesPosition';

export function SecuritiesPositionPage() {
  const navigate = useNavigate();
  const [portfolioCode, setPortfolioCode] = useState('');
  const [loadedCode, setLoadedCode] = useState('');
  const [showMovement, setShowMovement] = useState(false);

  const { data: positions = [], isLoading } = useSecuritiesPositions(loadedCode);

  const handleLoad = () => { if (portfolioCode.trim()) setLoadedCode(portfolioCode.trim()); };

  const columns: ColumnDef<SecuritiesPosition, unknown>[] = [
    { accessorKey: 'instrumentCode', header: 'Instrument', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.instrumentCode}</span> },
    { accessorKey: 'instrumentName', header: 'Name', cell: ({ row }) => <span className="text-sm truncate max-w-[180px] block">{row.original.instrumentName}</span> },
    { accessorKey: 'isin', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin || '—'}</span> },
    { accessorKey: 'currency', header: 'CCY', cell: ({ row }) => <span className="text-xs">{row.original.currency}</span> },
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.quantity.toLocaleString()}</span> },
    { accessorKey: 'avgCost', header: 'Avg Cost', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.avgCost?.toFixed(4) ?? '—'}</span> },
    { accessorKey: 'currentPrice', header: 'Price', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.original.currentPrice?.toFixed(4) ?? '—'}</span> },
    { accessorKey: 'costBasis', header: 'Cost Basis', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatMoney(row.original.costBasis, row.original.currency)}</span> },
    { accessorKey: 'marketValue', header: 'Mkt Value', cell: ({ row }) => <span className="font-mono text-xs tabular-nums font-medium">{formatMoney(row.original.marketValue, row.original.currency)}</span> },
    {
      accessorKey: 'unrealizedGainLoss', header: 'Unrealized G/L',
      cell: ({ row }) => {
        const v = row.original.unrealizedGainLoss;
        return <span className={cn('font-mono text-xs tabular-nums font-bold', v >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {v >= 0 ? '+' : ''}{formatMoney(v, row.original.currency)}
        </span>;
      },
    },
    { accessorKey: 'accruedInterest', header: 'Accrued', cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatMoney(row.original.accruedInterest, row.original.currency)}</span> },
    { accessorKey: 'availableQuantity', header: 'Avail', cell: ({ row }) => <span className="font-mono text-xs">{row.original.availableQuantity?.toLocaleString() ?? '—'}</span> },
    { accessorKey: 'pledgedQuantity', header: 'Pledged', cell: ({ row }) => <span className="font-mono text-xs">{row.original.pledgedQuantity?.toLocaleString() ?? '—'}</span> },
    {
      id: 'settle', header: 'Settle',
      cell: ({ row }) => {
        const t0 = row.original.settlementT0Count || 0;
        const t1 = row.original.settlementT1Count || 0;
        const t2 = row.original.settlementT2Count || 0;
        if (t0 + t1 + t2 === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex gap-1">
            {t0 > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-red-100 text-red-800">T+0:{t0}</span>}
            {t1 > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-100 text-amber-800">T+1:{t1}</span>}
            {t2 > 0 && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-100 text-blue-800">T+2:{t2}</span>}
          </div>
        );
      },
    },
    { accessorKey: 'positionDate', header: 'Pos Date', cell: ({ row }) => <span className="text-xs">{row.original.positionDate ? formatDate(row.original.positionDate) : '—'}</span> },
  ];

  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <>
      <PageHeader
        title="Securities Positions"
        subtitle="Portfolio holdings, movements, and P&L analysis"
        backTo="/custody"
        actions={
          <button onClick={() => setShowMovement(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Record Movement
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Portfolio selector */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={portfolioCode}
              onChange={(e) => setPortfolioCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLoad(); }}
              placeholder="Enter portfolio code (e.g. MAIN, TRADING)"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          </div>
          <button onClick={handleLoad} disabled={!portfolioCode.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            Load Positions
          </button>
        </div>

        {loadedCode && (
          <>
            {/* Summary cards */}
            <PositionSummaryCards positions={positions} />

            {/* Charts */}
            {positions.length > 0 && <HoldingsChart positions={positions} />}

            {/* Positions table */}
            <DataTable
              columns={columns}
              data={positions}
              isLoading={isLoading}
              enableGlobalFilter
              enableExport
              exportFilename={`securities-positions-${loadedCode}`}
              onRowClick={(row) => navigate(`/custody/positions/${row.positionId}`)}
              emptyMessage={`No positions found for portfolio "${loadedCode}"`}
            />
          </>
        )}

        {!loadedCode && (
          <div className="rounded-xl border border-dashed p-16 text-center text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Enter a portfolio code to view positions</p>
            <p className="text-xs mt-1">e.g. MAIN, TRADING, HFT, BANKING_BOOK</p>
          </div>
        )}
      </div>

      {showMovement && <MovementForm onClose={() => setShowMovement(false)} />}
    </>
  );
}
