import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ShoppingCart, ListOrdered, CheckCircle2, XCircle,
  Plus, X, Loader2, Search, ChevronRight,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarketOrder {
  id: number;
  orderRef: string;
  orderSource: string;
  customerId: number;
  dealerId: string;
  deskId: number;
  portfolioCode: string;
  orderType: string;
  side: string;
  instrumentType: string;
  instrumentCode: string;
  instrumentName: string;
  exchange: string;
  quantity: number;
  limitPrice: number;
  stopPrice: number;
  currency: string;
  timeInForce: string;
  expiryDate: string;
  filledQuantity: number;
  avgFilledPrice: number;
  filledAmount: number;
  remainingQuantity: number;
  commissionAmount: number;
  commissionCurrency: string;
  suitabilityCheckId: number;
  suitabilityResult: string;
  validationErrors: Record<string, string>;
  routedTo: string;
  routedAt: string;
  filledAt: string;
  cancelledReason: string;
  status: string;
  createdAt?: string;
}

// ─── API ────────────────────────────────────────────────────────────────────

const orderKeys = {
  all: ['market-orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
  open: () => [...orderKeys.all, 'open'] as const,
  detail: (ref: string) => [...orderKeys.all, 'detail', ref] as const,
  byCustomer: (id: string) => [...orderKeys.all, 'customer', id] as const,
};

const fetchOrders = () => apiGet<MarketOrder[]>('/api/v1/market-orders');
const fetchOpenOrders = () => apiGet<MarketOrder[]>('/api/v1/market-orders/open');
const fetchOrder = (ref: string) => apiGet<MarketOrder>(`/api/v1/market-orders/${ref}`);
const fetchCustomerOrders = (id: string) => apiGet<MarketOrder[]>(`/api/v1/market-orders/customer/${id}`);
const createOrder = (data: Partial<MarketOrder>) => apiPost<MarketOrder>('/api/v1/market-orders', data);
const validateOrder = (ref: string) => apiPost<MarketOrder>(`/api/v1/market-orders/${ref}/validate`);
const routeOrder = (ref: string, destination: string) =>
  apiPost<MarketOrder>(`/api/v1/market-orders/${ref}/route?destination=${encodeURIComponent(destination)}`);
const cancelOrder = (ref: string, reason: string) =>
  apiPost<MarketOrder>(`/api/v1/market-orders/${ref}/cancel?reason=${encodeURIComponent(reason)}`);

// ─── Hooks ──────────────────────────────────────────────────────────────────

function useOrders() {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: fetchOrders,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

function useOpenOrders() {
  return useQuery({
    queryKey: orderKeys.open(),
    queryFn: fetchOpenOrders,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

function useCustomerOrders(customerId: string) {
  return useQuery({
    queryKey: orderKeys.byCustomer(customerId),
    queryFn: () => fetchCustomerOrders(customerId),
    enabled: !!customerId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

function useValidateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ref: string) => validateOrder(ref),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

function useRouteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, destination }: { ref: string; destination: string }) => routeOrder(ref, destination),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ref, reason }: { ref: string; reason: string }) => cancelOrder(ref, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SIDE_STYLES: Record<string, string> = {
  BUY: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SELL: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const TERMINAL_STATUSES = new Set(['FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED']);

const EMPTY_ORDER: Partial<MarketOrder> = {
  orderSource: '',
  customerId: undefined as unknown as number,
  orderType: 'LIMIT',
  side: 'BUY',
  instrumentCode: '',
  quantity: 0,
  limitPrice: 0,
  currency: 'USD',
  timeInForce: 'DAY',
};

// ─── Columns ────────────────────────────────────────────────────────────────

const orderColumns: ColumnDef<MarketOrder, any>[] = [
  {
    accessorKey: 'orderRef',
    header: 'Order Ref',
    cell: ({ getValue }) => <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{getValue()}</code>,
  },
  {
    accessorKey: 'side',
    header: 'Side',
    cell: ({ getValue }) => {
      const side = getValue() as string;
      return (
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', SIDE_STYLES[side] ?? 'bg-muted')}>
          {side}
        </span>
      );
    },
  },
  {
    accessorKey: 'instrumentCode',
    header: 'Instrument',
    cell: ({ row }) => (
      <div>
        <span className="font-medium text-sm">{row.original.instrumentCode}</span>
        {row.original.instrumentName && (
          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{row.original.instrumentName}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'quantity',
    header: 'Qty',
    cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span>,
  },
  {
    accessorKey: 'limitPrice',
    header: 'Limit Price',
    cell: ({ row }) =>
      row.original.limitPrice ? (
        <span className="font-mono text-xs">{formatMoney(row.original.limitPrice, row.original.currency)}</span>
      ) : (
        <span className="text-xs text-muted-foreground">MKT</span>
      ),
  },
  {
    accessorKey: 'filledQuantity',
    header: 'Filled Qty',
    cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number)?.toLocaleString()}</span>,
  },
  {
    accessorKey: 'avgFilledPrice',
    header: 'Avg Price',
    cell: ({ row }) =>
      row.original.avgFilledPrice ? (
        <span className="font-mono text-xs">{formatMoney(row.original.avgFilledPrice, row.original.currency)}</span>
      ) : (
        <span className="text-xs text-muted-foreground">--</span>
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
  },
  {
    accessorKey: 'timeInForce',
    header: 'TIF',
    cell: ({ getValue }) => <span className="text-xs">{getValue()}</span>,
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorFn: (row) => row.createdAt ?? row.routedAt,
    cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      return v ? <span className="text-xs text-muted-foreground">{formatDateTime(v)}</span> : <span className="text-xs text-muted-foreground">--</span>;
    },
  },
];

// ─── Detail Drawer ──────────────────────────────────────────────────────────

function OrderDetailDrawer({
  order,
  onClose,
}: {
  order: MarketOrder;
  onClose: () => void;
}) {
  const [routeDestination, setRouteDestination] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showRouteInput, setShowRouteInput] = useState(false);
  const [showCancelInput, setShowCancelInput] = useState(false);

  const validateMut = useValidateOrder();
  const routeMut = useRouteOrder();
  const cancelMut = useCancelOrder();

  const handleValidate = () => {
    validateMut.mutate(order.orderRef, {
      onSuccess: () => { toast.success('Order validated'); onClose(); },
      onError: () => toast.error('Validation failed'),
    });
  };

  const handleRoute = () => {
    if (!routeDestination.trim()) return;
    routeMut.mutate(
      { ref: order.orderRef, destination: routeDestination.trim() },
      {
        onSuccess: () => { toast.success('Order routed'); onClose(); },
        onError: () => toast.error('Routing failed'),
      },
    );
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) return;
    cancelMut.mutate(
      { ref: order.orderRef, reason: cancelReason.trim() },
      {
        onSuccess: () => { toast.success('Order cancelled'); onClose(); },
        onError: () => toast.error('Cancellation failed'),
      },
    );
  };

  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const isPending = validateMut.isPending || routeMut.isPending || cancelMut.isPending;

  const detailRows: [string, React.ReactNode][] = [
    ['Order Ref', <code className="font-mono text-xs">{order.orderRef}</code>],
    ['Status', <StatusBadge status={order.status} />],
    ['Side', <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', SIDE_STYLES[order.side])}>{order.side}</span>],
    ['Order Type', order.orderType],
    ['Instrument', `${order.instrumentCode} — ${order.instrumentName || ''}`],
    ['Exchange', order.exchange || '--'],
    ['Quantity', order.quantity?.toLocaleString()],
    ['Limit Price', order.limitPrice ? formatMoney(order.limitPrice, order.currency) : 'MKT'],
    ['Stop Price', order.stopPrice ? formatMoney(order.stopPrice, order.currency) : '--'],
    ['Currency', order.currency],
    ['Time in Force', order.timeInForce],
    ['Expiry Date', order.expiryDate || '--'],
    ['Filled Qty', order.filledQuantity?.toLocaleString()],
    ['Avg Filled Price', order.avgFilledPrice ? formatMoney(order.avgFilledPrice, order.currency) : '--'],
    ['Filled Amount', order.filledAmount ? formatMoney(order.filledAmount, order.currency) : '--'],
    ['Remaining Qty', order.remainingQuantity?.toLocaleString() ?? '--'],
    ['Commission', order.commissionAmount ? formatMoney(order.commissionAmount, order.commissionCurrency || order.currency) : '--'],
    ['Order Source', order.orderSource || '--'],
    ['Customer ID', order.customerId?.toString() ?? '--'],
    ['Dealer', order.dealerId || '--'],
    ['Desk ID', order.deskId?.toString() ?? '--'],
    ['Portfolio', order.portfolioCode || '--'],
    ['Routed To', order.routedTo || '--'],
    ['Routed At', order.routedAt ? formatDateTime(order.routedAt) : '--'],
    ['Filled At', order.filledAt ? formatDateTime(order.filledAt) : '--'],
    ['Suitability Result', order.suitabilityResult || '--'],
    ['Cancelled Reason', order.cancelledReason || '--'],
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold">Order Detail</h3>
            <code className="text-xs text-muted-foreground font-mono">{order.orderRef}</code>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {detailRows.map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
                <dd className="text-sm mt-0.5">{value}</dd>
              </div>
            ))}
          </div>

          {/* Validation errors */}
          {order.validationErrors && Object.keys(order.validationErrors).length > 0 && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-4">
              <p className="text-xs font-semibold text-amber-700 mb-2">Validation Errors</p>
              <ul className="text-xs space-y-1">
                {Object.entries(order.validationErrors).map(([field, msg]) => (
                  <li key={field}>
                    <span className="font-mono text-amber-600">{field}:</span> {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t space-y-3">
          {order.status === 'NEW' && (
            <button
              onClick={handleValidate}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {validateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" /> Validate
            </button>
          )}

          {order.status === 'VALIDATED' && (
            <>
              {showRouteInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Destination (e.g. NSE, LSE)"
                    value={routeDestination}
                    onChange={(e) => setRouteDestination(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                  <button
                    onClick={handleRoute}
                    disabled={isPending || !routeDestination.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {routeMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Route
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRouteInput(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                  <ChevronRight className="w-4 h-4" /> Route Order
                </button>
              )}
            </>
          )}

          {!isTerminal && (
            <>
              {showCancelInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cancellation reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                  <button
                    onClick={handleCancel}
                    disabled={isPending || !cancelReason.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelInput(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10"
                >
                  <XCircle className="w-4 h-4" /> Cancel Order
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MarketOrdersPage() {
  useEffect(() => { document.title = 'Market Orders | CBS'; }, []);

  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MarketOrder | null>(null);
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [form, setForm] = useState<Partial<MarketOrder>>({ ...EMPTY_ORDER });

  const ordersQuery = useOrders();
  const openOrdersQuery = useOpenOrders();
  const customerOrdersQuery = useCustomerOrders(customerIdInput);
  const createMut = useCreateOrder();

  const orders = ordersQuery.data ?? [];
  const openOrders = openOrdersQuery.data ?? [];
  const customerOrders = customerOrdersQuery.data ?? [];

  const filledToday = orders.filter((o) => {
    if (o.status !== 'FILLED' || !o.filledAt) return false;
    return o.filledAt.startsWith(new Date().toISOString().split('T')[0]);
  });
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

  const handleCreate = () => {
    createMut.mutate(form, {
      onSuccess: () => {
        toast.success('Order created');
        setShowNewOrderDialog(false);
        setForm({ ...EMPTY_ORDER });
      },
      onError: () => toast.error('Failed to create order'),
    });
  };

  const updateField = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        title="Market Orders"
        subtitle="Order management and execution"
        actions={
          <button
            onClick={() => setShowNewOrderDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total Orders"
            value={orders.length}
            format="number"
            icon={ListOrdered}
            loading={ordersQuery.isLoading}
          />
          <StatCard
            label="Open Orders"
            value={openOrders.length}
            format="number"
            icon={ShoppingCart}
            loading={openOrdersQuery.isLoading}
          />
          <StatCard
            label="Filled Today"
            value={filledToday.length}
            format="number"
            icon={CheckCircle2}
            loading={ordersQuery.isLoading}
          />
          <StatCard
            label="Cancelled"
            value={cancelledCount}
            format="number"
            icon={XCircle}
            loading={ordersQuery.isLoading}
          />
        </div>

        {/* Error state */}
        {ordersQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">Failed to load orders.</p>
            </div>
            <button onClick={() => ordersQuery.refetch()} className="text-xs text-primary hover:underline">Retry</button>
          </div>
        )}

        {/* Tabs */}
        <TabsPage
          tabs={[
            {
              id: 'all',
              label: 'All Orders',
              icon: ListOrdered,
              badge: orders.length,
              content: (
                <div className="p-4">
                  <DataTable
                    columns={orderColumns}
                    data={orders}
                    isLoading={ordersQuery.isLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename="market-orders-all"
                    onRowClick={(row) => setSelectedOrder(row)}
                    emptyMessage="No orders found"
                    pageSize={15}
                  />
                </div>
              ),
            },
            {
              id: 'open',
              label: 'Open Orders',
              icon: ShoppingCart,
              badge: openOrders.length,
              content: (
                <div className="p-4">
                  <DataTable
                    columns={orderColumns}
                    data={openOrders}
                    isLoading={openOrdersQuery.isLoading}
                    enableGlobalFilter
                    onRowClick={(row) => setSelectedOrder(row)}
                    emptyMessage="No open orders"
                    pageSize={15}
                  />
                </div>
              ),
            },
            {
              id: 'customer',
              label: 'By Customer',
              icon: Search,
              content: (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-muted-foreground">Customer ID</label>
                    <input
                      type="text"
                      placeholder="Enter customer ID"
                      value={customerIdInput}
                      onChange={(e) => setCustomerIdInput(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border bg-background text-sm w-48"
                    />
                    {customerOrdersQuery.isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                  {customerIdInput ? (
                    customerOrdersQuery.isError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 px-4 py-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <p className="text-sm text-red-700">Failed to load customer orders.</p>
                      </div>
                    ) : (
                      <DataTable
                        columns={orderColumns}
                        data={customerOrders}
                        isLoading={customerOrdersQuery.isLoading}
                        enableGlobalFilter
                        onRowClick={(row) => setSelectedOrder(row)}
                        emptyMessage={`No orders for customer ${customerIdInput}`}
                        pageSize={15}
                      />
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed p-12 text-center">
                      <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Enter a customer ID to view their orders</p>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* New Order Dialog */}
      {showNewOrderDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNewOrderDialog(false)} />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="font-semibold">New Market Order</h3>
                <button onClick={() => setShowNewOrderDialog(false)} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Order Source</label>
                    <input
                      type="text"
                      value={form.orderSource ?? ''}
                      onChange={(e) => updateField('orderSource', e.target.value)}
                      placeholder="e.g. WEB, API, FIX"
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
                    <input
                      type="number"
                      value={form.customerId ?? ''}
                      onChange={(e) => updateField('customerId', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Order Type</label>
                    <select
                      value={form.orderType ?? 'LIMIT'}
                      onChange={(e) => updateField('orderType', e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="LIMIT">LIMIT</option>
                      <option value="MARKET">MARKET</option>
                      <option value="STOP">STOP</option>
                      <option value="STOP_LIMIT">STOP LIMIT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Side</label>
                    <select
                      value={form.side ?? 'BUY'}
                      onChange={(e) => updateField('side', e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Instrument Code</label>
                    <input
                      type="text"
                      value={form.instrumentCode ?? ''}
                      onChange={(e) => updateField('instrumentCode', e.target.value)}
                      placeholder="e.g. AAPL, DANGCEM"
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                    <input
                      type="number"
                      value={form.quantity ?? ''}
                      onChange={(e) => updateField('quantity', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Limit Price</label>
                    <input
                      type="number"
                      step="any"
                      value={form.limitPrice ?? ''}
                      onChange={(e) => updateField('limitPrice', Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Currency</label>
                    <input
                      type="text"
                      value={form.currency ?? 'USD'}
                      onChange={(e) => updateField('currency', e.target.value)}
                      maxLength={3}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Time in Force</label>
                    <select
                      value={form.timeInForce ?? 'DAY'}
                      onChange={(e) => updateField('timeInForce', e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="DAY">DAY</option>
                      <option value="GTC">GTC (Good Till Cancel)</option>
                      <option value="IOC">IOC (Immediate or Cancel)</option>
                      <option value="FOK">FOK (Fill or Kill)</option>
                      <option value="GTD">GTD (Good Till Date)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowNewOrderDialog(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMut.isPending || !form.instrumentCode || !form.quantity}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Order
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
