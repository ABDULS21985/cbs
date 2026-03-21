import { useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage, StatCard } from '@/components/shared';
import { Plus, ArrowUpDown, CheckCircle, XCircle, AlertTriangle, TrendingDown, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import { useOrders } from '../hooks/useTreasuryData';
import { useDealerDesks, useSubmitMarketOrder } from '../hooks/useTreasury';
import { tradingApi, type SubmitOrderRequest } from '../api/tradingApi';
import type { ColumnDef } from '@tanstack/react-table';
import type { MarketOrder } from '../types/treasury';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ExecutionQualityCharts } from '../components/orders/ExecutionQualityCharts';

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

type OrderSide = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT' | 'STOP';
type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK';

interface NewOrderDialogProps {
  open: boolean;
  onClose: () => void;
}

function NewOrderDialog({ open, onClose }: NewOrderDialogProps) {
  const submitOrder = useSubmitMarketOrder();
  const { data: desks = [] } = useDealerDesks();
  const [instrumentQuery, setInstrumentQuery] = useState('');
  const deferredInstrumentQuery = useDeferredValue(instrumentQuery);
  const [selectedInstrumentCode, setSelectedInstrumentCode] = useState('');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('DAY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [deskId, setDeskId] = useState('');

  const { data: instruments = [], isLoading: instrumentsLoading } = useQuery({
    queryKey: ['treasury', 'instrument-search', deferredInstrumentQuery],
    queryFn: () => tradingApi.searchInstruments(deferredInstrumentQuery),
    enabled: open && deferredInstrumentQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const selectedInstrument = instruments.find((instrument) => instrument.code === selectedInstrumentCode)
    ?? (selectedInstrumentCode ? {
      code: selectedInstrumentCode,
      name: selectedInstrumentCode,
      instrumentType: 'SECURITY',
      assetClass: 'TREASURY',
      currency: 'NGN',
    } : null);

  const reset = () => {
    setInstrumentQuery('');
    setSelectedInstrumentCode('');
    setSide('BUY');
    setOrderType('MARKET');
    setTimeInForce('DAY');
    setQuantity('');
    setPrice('');
    setDeskId('');
  };

  if (!open) return null;

  const submitDisabled = !selectedInstrumentCode || !deskId || !quantity
    || Number(quantity) <= 0
    || ((orderType === 'LIMIT' || orderType === 'STOP') && (!price || Number(price) <= 0));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInstrument) return;
    const payload: SubmitOrderRequest = {
      instrumentCode: selectedInstrument.code,
      instrumentName: selectedInstrument.name,
      instrumentType: selectedInstrument.instrumentType,
      currency: selectedInstrument.currency,
      side,
      quantity: Number(quantity),
      price: price ? Number(price) : undefined,
      orderType,
      deskId,
      timeInForce,
    };

    try {
      await submitOrder.mutateAsync(payload);
      toast.success('Treasury order submitted');
      reset();
      onClose();
    } catch {
      toast.error('Failed to submit order');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">New Treasury Order</h2>
            <p className="mt-1 text-sm text-muted-foreground">Capture a live market order and route it to the selected desk.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Instrument Search</label>
                <input
                  value={instrumentQuery}
                  onChange={(event) => setInstrumentQuery(event.target.value)}
                  placeholder="Search by code, name, ticker, or ISIN"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-background">
                  {instrumentsLoading ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Searching instruments…</div>
                  ) : instruments.length > 0 ? (
                    instruments.map((instrument) => (
                      <button
                        key={instrument.code}
                        type="button"
                        onClick={() => {
                          setSelectedInstrumentCode(instrument.code);
                          setInstrumentQuery(`${instrument.code} · ${instrument.name}`);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50',
                          selectedInstrumentCode === instrument.code && 'bg-primary/10',
                        )}
                      >
                        <span>
                          <span className="font-medium">{instrument.code}</span>
                          <span className="ml-2 text-muted-foreground">{instrument.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{instrument.currency}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {deferredInstrumentQuery.trim().length >= 2 ? 'No active instrument matched the query.' : 'Type at least 2 characters to search.'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Desk Assignment</label>
                <select
                  value={deskId}
                  onChange={(event) => setDeskId(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select dealing desk…</option>
                  {desks.map((desk) => (
                    <option key={desk.id} value={desk.id}>
                      {desk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Side</label>
                <select value={side} onChange={(event) => setSide(event.target.value as OrderSide)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Order Type</label>
                <select value={orderType} onChange={(event) => setOrderType(event.target.value as OrderType)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                  <option value="STOP">STOP</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</label>
                <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="0" step="0.0001" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {orderType === 'MARKET' ? 'Reference Price' : 'Limit / Stop Price'}
                </label>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  type="number"
                  min="0"
                  step="0.0001"
                  disabled={orderType === 'MARKET'}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Time in Force</label>
                <select value={timeInForce} onChange={(event) => setTimeInForce(event.target.value as TimeInForce)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="DAY">DAY</option>
                  <option value="GTC">GTC</option>
                  <option value="IOC">IOC</option>
                  <option value="FOK">FOK</option>
                </select>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">
                <p className="font-medium text-foreground">Selected Instrument</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedInstrument ? `${selectedInstrument.code} · ${selectedInstrument.name}` : 'No instrument selected yet.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { reset(); onClose(); }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitDisabled || submitOrder.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Order
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

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
      <ExecutionQualityCharts orders={orders} />
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
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const { data: orders = [], isLoading, isError, refetch } = useOrders();

  const openOrders = orders.filter((o) => ['NEW', 'VALIDATED', 'ROUTED', 'PARTIALLY_FILLED'].includes(o.status));
  const filledOrders = orders.filter((o) => o.status === 'FILLED');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

  return (
    <>
      <PageHeader title="Order Management" subtitle="Order entry, book view, execution log" actions={
        <button onClick={() => setOrderDialogOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
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
      <NewOrderDialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} />
    </>
  );
}
