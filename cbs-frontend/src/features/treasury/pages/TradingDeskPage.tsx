import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage, SummaryBar, EmptyState, ConfirmDialog } from '@/components/shared';
import {
  Building2,
  BookOpen,
  User,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatMoney, formatPercent, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useDealerDesks,
  useTradingBooks,
  useOpenMarketOrders,
  useCancelMarketOrder,
  useSnapshotTradingBook,
  usePositionBreaches,
} from '../hooks/useTreasury';
import type { ColumnDef } from '@tanstack/react-table';
import type { DealerDesk, TradingBook, TradingMarketOrder, TraderPosition } from '../api/tradingApi';

// ─── Utilization Bar ───────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500',
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── Dealer Desks Tab ──────────────────────────────────────────────────────────

function DealerDesksTab() {
  const { data: desks = [], isLoading } = useDealerDesks();

  const activeCount = desks.filter((d) => d.status === 'ACTIVE').length;
  const totalPnl = desks.reduce((s, d) => s + d.todayPnl, 0);
  const totalPositions = desks.reduce((s, d) => s + d.positionCount, 0);

  return (
    <div className="p-5 space-y-4">
      <SummaryBar
        items={[
          { label: 'Total Desks', value: desks.length, format: 'number' },
          { label: 'Active', value: activeCount, format: 'number', color: 'success' },
          { label: "Today's P&L", value: totalPnl, format: 'money', color: totalPnl >= 0 ? 'success' : 'danger' },
          { label: 'Open Positions', value: totalPositions, format: 'number' },
        ]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-6 w-24 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {desks.map((desk) => (
            <div key={desk.id} className="card p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{desk.name}</p>
                  <p className="text-xs text-muted-foreground">{desk.code}</p>
                </div>
                <StatusBadge status={desk.status} dot />
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={desk.assetClass} />
                <span className="text-xs text-muted-foreground">
                  Head: {desk.headDealerName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Today P&L</p>
                  <p
                    className={cn(
                      'font-mono font-semibold text-sm mt-0.5',
                      desk.todayPnl >= 0 ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {desk.todayPnl >= 0 ? (
                      <TrendingUp className="inline w-3.5 h-3.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="inline w-3.5 h-3.5 mr-0.5" />
                    )}
                    {formatMoney(desk.todayPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Positions</p>
                  <p className="font-mono font-semibold text-sm mt-0.5">
                    {desk.positionCount} / {desk.positionLimit}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Utilization — {desk.utilizationPct.toFixed(1)}%
                </p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      desk.utilizationPct >= 90
                        ? 'bg-red-500'
                        : desk.utilizationPct >= 70
                        ? 'bg-amber-500'
                        : 'bg-green-500',
                    )}
                    style={{ width: `${Math.min(desk.utilizationPct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                {desk.activeDeelersCount} active dealer{desk.activeDeelersCount !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trading Books Tab ─────────────────────────────────────────────────────────

function TradingBooksTab() {
  const { data: books = [], isLoading } = useTradingBooks();
  const snapshotBook = useSnapshotTradingBook();

  const columns: ColumnDef<TradingBook, any>[] = [
    {
      accessorKey: 'bookCode',
      header: 'Book Code',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.original.bookCode}</span>
      ),
    },
    { accessorKey: 'bookName', header: 'Book Name' },
    {
      accessorKey: 'bookType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.bookType} />,
    },
    { accessorKey: 'deskName', header: 'Desk' },
    {
      accessorKey: 'capitalRequirement',
      header: 'Capital Req.',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.capitalRequirement)}</span>
      ),
    },
    {
      accessorKey: 'utilizationPct',
      header: 'Utilization',
      cell: ({ row }) => <UtilBar pct={row.original.utilizationPct} />,
    },
    {
      accessorKey: 'snapshotStatus',
      header: "Today's Snapshot",
      cell: ({ row }) =>
        row.original.snapshotStatus ? (
          <StatusBadge status={row.original.snapshotStatus} dot />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => snapshotBook.mutate(row.original.id)}
          disabled={snapshotBook.isPending}
          className="px-2.5 py-1 rounded text-xs font-medium bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          Snapshot
        </button>
      ),
    },
  ];

  return (
    <div className="p-5">
      <DataTable columns={columns} data={books} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="trading-books" />
    </div>
  );
}

// ─── Trader Positions Tab ──────────────────────────────────────────────────────

function TraderPositionsTab() {
  const today = new Date().toISOString().split('T')[0];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: positions = [], isLoading } = usePositionBreaches(oneWeekAgo, today);

  const breachCount = positions.filter((p) => p.breachFlag).length;

  const columns: ColumnDef<TraderPosition, any>[] = [
    { accessorKey: 'dealerName', header: 'Dealer' },
    { accessorKey: 'deskName', header: 'Desk' },
    { accessorKey: 'instrument', header: 'Instrument' },
    { accessorKey: 'currency', header: 'Ccy' },
    {
      accessorKey: 'netExposure',
      header: 'Net Exposure',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.netExposure)}</span>
      ),
    },
    {
      accessorKey: 'positionLimit',
      header: 'Limit',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{formatMoney(row.original.positionLimit)}</span>
      ),
    },
    {
      accessorKey: 'utilizationPct',
      header: 'Utilization',
      cell: ({ row }) => <UtilBar pct={row.original.utilizationPct} />,
    },
    {
      accessorKey: 'unrealizedPnl',
      header: 'Unrealized P&L',
      cell: ({ row }) => (
        <span
          className={cn(
            'font-mono text-sm font-medium',
            row.original.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600',
          )}
        >
          {formatMoney(row.original.unrealizedPnl)}
        </span>
      ),
    },
    {
      accessorKey: 'breachFlag',
      header: 'Breach',
      cell: ({ row }) =>
        row.original.breachFlag ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" /> BREACH
          </span>
        ) : (
          <span className="text-xs text-green-600 font-medium">OK</span>
        ),
    },
  ];

  return (
    <div className="p-5 space-y-4">
      {breachCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <strong>{breachCount} position breach{breachCount !== 1 ? 'es' : ''}</strong> detected in the
          last 7 days. Review highlighted rows immediately.
        </div>
      )}
      <DataTable
        columns={columns}
        data={positions}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="trader-positions"
        getRowClassName={(row: TraderPosition) =>
          row.breachFlag ? 'bg-red-50 dark:bg-red-900/10' : ''
        }
      />
    </div>
  );
}

// ─── Market Orders Tab ─────────────────────────────────────────────────────────

function MarketOrdersTab() {
  const { data: orders = [], isLoading } = useOpenMarketOrders();
  const cancelOrder = useCancelMarketOrder();
  const [cancelTarget, setCancelTarget] = useState<TradingMarketOrder | null>(null);

  const columns: ColumnDef<TradingMarketOrder, any>[] = [
    {
      accessorKey: 'orderRef',
      header: 'Order Ref',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">{row.original.orderRef}</span>
      ),
    },
    { accessorKey: 'instrumentName', header: 'Instrument' },
    {
      accessorKey: 'side',
      header: 'Side',
      cell: ({ row }) => (
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-bold',
            row.original.side === 'BUY'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          )}
        >
          {row.original.side}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.quantity.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.price != null ? row.original.price.toFixed(4) : 'MKT'}
        </span>
      ),
    },
    {
      accessorKey: 'orderType',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.orderType} />,
    },
    { accessorKey: 'deskName', header: 'Desk' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => setCancelTarget(row.original)}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel
        </button>
      ),
    },
  ];

  return (
    <div className="p-5">
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="open-market-orders"
      />
      {!isLoading && orders.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="No open orders"
          description="Open market orders will appear here in real time."
        />
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (cancelTarget) {
            await cancelOrder.mutateAsync(cancelTarget.orderRef);
            setCancelTarget(null);
          }
        }}
        isLoading={cancelOrder.isPending}
        title="Cancel Market Order"
        description={
          cancelTarget
            ? `Cancel order ${cancelTarget.orderRef} — ${cancelTarget.side} ${cancelTarget.quantity.toLocaleString()} ${cancelTarget.instrument}? This cannot be undone.`
            : ''
        }
        confirmLabel="Cancel Order"
        variant="destructive"
      />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function TradingDeskPage() {
  const { data: desks = [] } = useDealerDesks();
  const { data: books = [] } = useTradingBooks();
  const { data: orders = [] } = useOpenMarketOrders();

  const totalPnl = desks.reduce((s, d) => s + d.todayPnl, 0);
  const totalPositions = desks.reduce((s, d) => s + d.positionCount, 0);
  const avgUtilization =
    desks.length > 0
      ? desks.reduce((s, d) => s + d.utilizationPct, 0) / desks.length
      : 0;

  return (
    <>
      <PageHeader
        title="Trading Desk Management"
        subtitle="Dealer desks, trading books, trader positions, and market orders"
      />

      <div className="page-container space-y-4">
        {/* Summary Stats Bar */}
        <SummaryBar
          items={[
            { label: 'Active Desks', value: desks.filter((d) => d.status === 'ACTIVE').length, format: 'number', color: 'success' },
            { label: "Today's P&L", value: totalPnl, format: 'money', color: totalPnl >= 0 ? 'success' : 'danger' },
            { label: 'Open Positions', value: totalPositions, format: 'number' },
            { label: 'Avg Utilization', value: avgUtilization, format: 'percent' },
            { label: 'Trading Books', value: books.length, format: 'number' },
            { label: 'Open Orders', value: orders.length, format: 'number' },
          ]}
        />

        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'desks',
              label: 'Dealer Desks',
              icon: Building2,
              badge: desks.length,
              content: <DealerDesksTab />,
            },
            {
              id: 'books',
              label: 'Trading Books',
              icon: BookOpen,
              badge: books.length,
              content: <TradingBooksTab />,
            },
            {
              id: 'positions',
              label: 'Trader Positions',
              icon: User,
              content: <TraderPositionsTab />,
            },
            {
              id: 'orders',
              label: 'Market Orders',
              icon: ShoppingCart,
              badge: orders.length,
              content: <MarketOrdersTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
