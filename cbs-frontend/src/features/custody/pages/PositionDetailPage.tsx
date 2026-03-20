import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, InfoGrid } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useSecuritiesPositions, useSecuritiesMovements } from '../hooks/useCustodyExt';
import { MovementForm } from '../components/MovementForm';
import type { SecuritiesMovement } from '../types/securitiesPosition';

export function PositionDetailPage() {
  const { positionId = '' } = useParams<{ positionId: string }>();
  const [showMovement, setShowMovement] = useState(false);

  // We need to find the position — fetch by searching common portfolio codes
  // The positionId is the string ID like "SP-XXXXXXXX"
  // Movements are fetched by numeric id, but the API takes positionId string
  // Let's use a query for movements which takes the numeric ID
  const numericId = parseInt(positionId, 10);
  const isNumeric = !isNaN(numericId);

  // Try fetching movements using the position's numeric ID
  const { data: movements = [], isLoading: movementsLoading } = useSecuritiesMovements(isNumeric ? numericId : 0);

  // For position details, we search across known portfolios
  const { data: mainPositions = [] } = useSecuritiesPositions('MAIN');
  const { data: tradingPositions = [] } = useSecuritiesPositions('TRADING');

  const allPositions = [...mainPositions, ...tradingPositions];
  const position = allPositions.find((p) =>
    p.positionId === positionId || String(p.id) === positionId,
  );

  const movementColumns: ColumnDef<SecuritiesMovement, unknown>[] = [
    { accessorKey: 'movementRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.movementRef}</span> },
    {
      accessorKey: 'movementType', header: 'Type',
      cell: ({ row }) => {
        const colors: Record<string, string> = {
          BUY: 'bg-green-100 text-green-800', SELL: 'bg-red-100 text-red-800',
          TRANSFER_IN: 'bg-blue-100 text-blue-800', TRANSFER_OUT: 'bg-amber-100 text-amber-800',
          COUPON: 'bg-purple-100 text-purple-800', DIVIDEND: 'bg-cyan-100 text-cyan-800',
          CORPORATE_ACTION: 'bg-gray-100 text-gray-800',
        };
        return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium', colors[row.original.movementType] ?? 'bg-gray-100 text-gray-600')}>
          {row.original.movementType.replace(/_/g, ' ')}
        </span>;
      },
    },
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.quantity.toLocaleString()}</span> },
    { accessorKey: 'price', header: 'Price', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{row.original.price?.toFixed(4) ?? '—'}</span> },
    { accessorKey: 'settlementAmount', header: 'Settle Amt', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.settlementAmount, row.original.currency)}</span> },
    { accessorKey: 'currency', header: 'CCY', cell: ({ row }) => <span className="text-xs">{row.original.currency}</span> },
    { accessorKey: 'counterpartyCode', header: 'Counterparty', cell: ({ row }) => <span className="text-xs font-mono">{row.original.counterpartyCode || '—'}</span> },
    { accessorKey: 'tradeDate', header: 'Trade Date', cell: ({ row }) => <span className="text-xs">{row.original.tradeDate ? formatDate(row.original.tradeDate) : '—'}</span> },
    { accessorKey: 'settlementDate', header: 'Settle Date', cell: ({ row }) => <span className="text-xs">{row.original.settlementDate ? formatDate(row.original.settlementDate) : '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  if (!position && !isNumeric) {
    return (
      <>
        <PageHeader title="Position Not Found" backTo="/custody/positions" />
        <div className="page-container">
          <div className="rounded-xl border p-12 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium">Position could not be found</p>
          </div>
        </div>
      </>
    );
  }

  const returnPct = position && position.costBasis > 0
    ? ((position.marketValue - position.costBasis) / position.costBasis) * 100
    : 0;
  const isProfit = (position?.unrealizedGainLoss ?? 0) >= 0;

  return (
    <>
      <PageHeader
        title={position?.instrumentName ?? `Position ${positionId}`}
        subtitle={position ? `${position.instrumentCode} · ${position.isin ?? ''}` : ''}
        backTo="/custody/positions"
        actions={
          <button onClick={() => setShowMovement(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Record Movement
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Position Summary */}
        {position && (
          <InfoGrid
            columns={4}
            items={[
              { label: 'Position ID', value: position.positionId, mono: true, copyable: true },
              { label: 'Portfolio', value: position.portfolioCode, mono: true },
              { label: 'Custody Account', value: position.custodyAccountCode || '—', mono: true },
              { label: 'ISIN', value: position.isin || '—', mono: true },
              { label: 'Currency', value: position.currency },
              { label: 'Quantity', value: position.quantity.toLocaleString() },
              { label: 'Avg Cost', value: position.avgCost?.toFixed(4) ?? '—' },
              { label: 'Current Price', value: position.currentPrice?.toFixed(4) ?? '—' },
              { label: 'Cost Basis', value: position.costBasis, format: 'money' },
              { label: 'Market Value', value: position.marketValue, format: 'money' },
              { label: 'Unrealized G/L', value: (
                <span className={cn('font-mono font-bold', isProfit ? 'text-green-700' : 'text-red-600')}>
                  {isProfit ? '+' : ''}{formatMoney(position.unrealizedGainLoss, position.currency)}
                </span>
              )},
              { label: 'Accrued Interest', value: position.accruedInterest, format: 'money' },
              { label: 'Available Qty', value: position.availableQuantity?.toLocaleString() ?? '—' },
              { label: 'Pledged Qty', value: position.pledgedQuantity?.toLocaleString() ?? '—' },
              { label: 'T+0 Settle', value: position.settlementT0Count ?? 0 },
              { label: 'T+1 Settle', value: position.settlementT1Count ?? 0 },
              { label: 'T+2 Settle', value: position.settlementT2Count ?? 0 },
              { label: 'Position Date', value: position.positionDate || '—', format: position.positionDate ? 'date' : undefined },
              { label: 'Last Priced', value: position.lastPricedAt || '—', format: position.lastPricedAt ? 'datetime' : undefined },
            ]}
          />
        )}

        {/* P&L Analysis */}
        {position && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">P&L Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* P&L indicator */}
              <div className="text-center">
                <div className={cn('inline-flex items-center gap-2', isProfit ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  {isProfit ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                  <span className="text-3xl font-bold font-mono tabular-nums">{isProfit ? '+' : ''}{returnPct.toFixed(2)}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total Return</p>
              </div>

              {/* Cost vs Value bars */}
              <div className="col-span-2 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Cost Basis</span>
                    <span className="font-mono">{formatMoney(position.costBasis, position.currency)}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Market Value</span>
                    <span className="font-mono font-medium">{formatMoney(position.marketValue, position.currency)}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', isProfit ? 'bg-green-500' : 'bg-red-500')}
                      style={{ width: position.costBasis > 0 ? `${Math.min(150, (position.marketValue / position.costBasis) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-medium pt-1 border-t">
                  <span>Unrealized P&L</span>
                  <span className={cn('font-mono', isProfit ? 'text-green-700' : 'text-red-600')}>
                    {isProfit ? '+' : ''}{formatMoney(position.unrealizedGainLoss, position.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movements */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between bg-muted/30">
            <h3 className="text-sm font-semibold">Movements</h3>
            <span className="text-xs text-muted-foreground">{movements.length} movement{movements.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4">
            <DataTable
              columns={movementColumns}
              data={movements}
              isLoading={movementsLoading}
              enableGlobalFilter
              enableExport
              exportFilename={`movements-${positionId}`}
              emptyMessage="No movements recorded for this position"
            />
          </div>
        </div>
      </div>

      {showMovement && (
        <MovementForm
          positionId={position?.positionId ?? positionId}
          onClose={() => setShowMovement(false)}
        />
      )}
    </>
  );
}
