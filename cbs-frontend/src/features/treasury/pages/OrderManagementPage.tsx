import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, TabsPage, StatCard } from '@/components/shared';
import { Plus, ArrowUpDown, CheckCircle, XCircle } from 'lucide-react';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { mockOrders } from '../api/mockTreasuryData';
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

export function OrderManagementPage() {
  const openOrders = mockOrders.filter((o) => ['NEW', 'PARTIALLY_FILLED'].includes(o.status));
  const filledOrders = mockOrders.filter((o) => o.status === 'FILLED');

  return (
    <>
      <PageHeader title="Order Management" subtitle="Order entry, book view, execution log" actions={
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Order
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open Orders" value={openOrders.length} format="number" icon={ArrowUpDown} />
          <StatCard label="Filled Today" value={filledOrders.length} format="number" icon={CheckCircle} />
          <StatCard label="Cancelled" value={mockOrders.filter((o) => o.status === 'CANCELLED').length} format="number" icon={XCircle} />
          <StatCard label="Total Volume" value={mockOrders.reduce((s, o) => s + o.filledQuantity * (o.avgFillPrice || 0), 0)} format="money" compact />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'open', label: 'Open Orders', badge: openOrders.length, content: (
            <div className="p-4"><DataTable columns={columns} data={openOrders} enableGlobalFilter /></div>
          )},
          { id: 'executed', label: 'Executed', content: (
            <div className="p-4"><DataTable columns={columns} data={filledOrders} enableGlobalFilter enableExport exportFilename="executed-orders" /></div>
          )},
          { id: 'all', label: 'All Orders', content: (
            <div className="p-4"><DataTable columns={columns} data={mockOrders} enableGlobalFilter enableExport exportFilename="all-orders" /></div>
          )},
        ]} />
      </div>
    </>
  );
}
