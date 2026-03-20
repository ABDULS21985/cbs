import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage, StatCard } from '@/components/shared';
import { Plus, ArrowUpDown, CheckCircle, XCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import { useOrders } from '../hooks/useTreasuryData';
import type { ColumnDef } from '@tanstack/react-table';
import type { MarketOrder } from '../types/treasury';
import { cn } from '@/lib/utils';

const columns: ColumnDef<MarketOrder, any>[] = [
  { accessorKey: 'orderRef', header: 'Order #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.orderRef}</span> },
  { accessorKey: 'createdAt', header: 'Time', cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.createdAt)}</span> },
  { accessorKey: 'instrumentName', header: 'Instrument' },
  { accessorKey: 'direction', header: 'Side', cell: ({ row }) => (
    <span className={cn('text-xs font-bold px-2 py-0.5 rounded', row.original.direction === 'BUY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
      {row.original.direction}
    </span>
  )},
  { accessorKey: 'orderType', header: 'Type' },
  { accessorKey: 'quantity', header: 'Quantity', cell: ({ row }) => <span className="font-mono text-sm">{row.original.quantity.toLocaleString()}</span> },
  { accessorKey: 'price', header: 'Price', cell: ({ row }) => <span className="font-mono text-sm">{row.original.price?.toFixed(2) ?? 'MKT'}</span> },
  { accessorKey: 'filledQuantity', header: 'Filled', cell: ({ row }) => (
    <div className="text-sm">
      <span className="font-mono">{row.original.filledQuantity.toLocaleString()}</span>
      <span className="text-muted-foreground text-xs ml-1">({Math.round(row.original.filledQuantity / row.original.quantity * 100)}%)</span>
    </div>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

// ─── Execution Quality Section ─────────────────────────────────────────────────

function ExecutionQualitySection({ orders }: { orders: MarketOrder[] }) {
  const filled = orders.filter(o => o.status === 'FILLED');

  const avgSlippage = filled.length > 0
    ? filled.reduce((s, o) => s + ((o.avgFillPrice ?? 0) - (o.price ?? o.avgFillPrice ?? 0)), 0) / filled.length
    : 0;
  const fillRate = orders.length > 0
    ? (filled.length / orders.length) * 100
    : 0;
  const totalVolume = filled.reduce((s, o) => s + o.filledQuantity * (o.avgFillPrice ?? 0), 0);

  const qualityCols: ColumnDef<MarketOrder, any>[] = [
    { accessorKey: 'orderRef', header: 'Order #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.orderRef}</span> },
    { accessorKey: 'instrumentName', header: 'Instrument' },
    { accessorKey: 'direction', header: 'Side', cell: ({ row }) => <span className={cn('text-xs font-bold', row.original.direction === 'BUY' ? 'text-green-600' : 'text-red-600')}>{row.original.direction}</span> },
    {
      id: 'slippage',
      header: 'Slippage (bps)',
      cell: ({ row }) => {
        const o = row.original;
        if (!o.avgFillPrice || !o.price) return <span className="text-muted-foreground text-xs">—</span>;
        const slippageBps = Math.abs((o.avgFillPrice - o.price) / o.price) * 10000;
        return <span className={cn('font-mono text-sm', slippageBps > 5 ? 'text-red-600' : slippageBps > 2 ? 'text-amber-600' : 'text-green-600')}>{slippageBps.toFixed(1)}</span>;
      },
    },
    {
      id: 'fillRate',
      header: 'Fill %',
      cell: ({ row }) => {
        const pct = row.original.quantity > 0 ? (row.original.filledQuantity / row.original.quantity) * 100 : 0;
        return <span className={cn('font-mono text-sm', pct < 50 ? 'text-red-600' : pct < 90 ? 'text-amber-600' : 'text-green-600')}>{pct.toFixed(0)}%</span>;
      },
    },
    {
      id: 'marketImpact',
      header: 'Mkt Impact (bps)',
      cell: ({ row }) => {
        const o = row.original;
        if (!o.avgFillPrice || !o.price) return <span className="text-muted-foreground text-xs">—</span>;
        const impact = Math.abs((o.avgFillPrice - o.price) / o.price) * 10000 * 0.6;
        return <span className="font-mono text-sm text-muted-foreground">{impact.toFixed(1)}</span>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Avg Slippage (bps)" value={Math.abs(avgSlippage).toFixed(2)} icon={TrendingDown} />
        <StatCard label="Fill Rate" value={fillRate} format="percent" icon={CheckCircle} />
        <StatCard label="Executed Volume" value={totalVolume} format="money" compact icon={ArrowUpDown} />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Order-Level Execution Quality</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Slippage and market impact per filled order</p>
        </div>
        <div className="p-4">
          <DataTable columns={qualityCols} data={filled} isLoading={false} emptyMessage="No filled orders to analyse" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function OrderManagementPage() {
  useEffect(() => { document.title = 'Order Management | CBS'; }, []);
  const { data: orders = [], isLoading, isError, refetch } = useOrders();

  const openOrders = orders.filter((o) => ['NEW', 'PARTIALLY_FILLED'].includes(o.status));
  const filledOrders = orders.filter((o) => o.status === 'FILLED');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

  return (
    <>
      <PageHeader title="Order Management" subtitle="Order entry, book view, execution log" actions={
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Order
        </button>
      } />
      <div className="page-container space-y-4">
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load orders.</span>
            <button onClick={() => refetch()} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open Orders" value={openOrders.length} format="number" icon={ArrowUpDown} />
          <StatCard label="Filled Today" value={filledOrders.length} format="number" icon={CheckCircle} />
          <StatCard label="Cancelled" value={cancelledOrders.length} format="number" icon={XCircle} />
          <StatCard label="Total Volume" value={orders.reduce((s, o) => s + o.filledQuantity * (o.avgFillPrice || 0), 0)} format="money" compact />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'open', label: 'Open Orders', badge: openOrders.length, content: (
            <div className="p-4"><DataTable columns={columns} data={openOrders} isLoading={isLoading} enableGlobalFilter /></div>
          )},
          { id: 'executed', label: 'Executed', content: (
            <div className="p-4"><DataTable columns={columns} data={filledOrders} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="executed-orders" /></div>
          )},
          { id: 'all', label: 'All Orders', content: (
            <div className="p-4"><DataTable columns={columns} data={orders} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="all-orders" /></div>
          )},
          { id: 'quality', label: 'Execution Quality', content: <ExecutionQualitySection orders={orders} /> },
        ]} />
      </div>
    </>
  );
}
