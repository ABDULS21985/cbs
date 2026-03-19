import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, SummaryBar, DateRangePicker } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { useCardTransactions } from '../hooks/useCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { CardTransaction } from '../types/card';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Loader2, ReceiptText } from 'lucide-react';

const columns: ColumnDef<CardTransaction, any>[] = [
  { accessorKey: 'transactionDate', header: 'Date/Time', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.transactionDate)}</span> },
  { accessorKey: 'cardMasked', header: 'Card', cell: ({ row }) => <span className="font-mono text-xs">{row.original.cardMasked}</span> },
  { accessorKey: 'merchantName', header: 'Merchant' },
  { accessorKey: 'mccDescription', header: 'MCC', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.mcc} — {row.original.mccDescription}</span> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'authCode', header: 'Auth Code', cell: ({ row }) => <span className="font-mono text-xs">{row.original.authCode || '—'}</span> },
  { accessorKey: 'responseCode', header: 'Response', cell: ({ row }) => (
    <span className={cn('font-mono text-xs font-medium', row.original.responseCode === '00' ? 'text-green-600' : 'text-red-600')}>
      {row.original.responseCode}
    </span>
  )},
  { accessorKey: 'channel', header: 'Channel', cell: ({ row }) => <StatusBadge status={row.original.channel} /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'fraudScore', header: 'Fraud', cell: ({ row }) => (
    <span className={cn('font-mono text-xs font-medium', row.original.fraudScore > 50 ? 'text-red-600' : row.original.fraudScore > 30 ? 'text-amber-600' : 'text-green-600')}>
      {row.original.fraudScore}/100
    </span>
  )},
];

export function CardTransactionsPage() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const filters: Record<string, unknown> = {};
  if (dateRange.from) filters.fromDate = dateRange.from.toISOString();
  if (dateRange.to) filters.toDate = dateRange.to.toISOString();

  const { data: transactions = [], isLoading } = useCardTransactions(Object.keys(filters).length > 0 ? filters : undefined);

  const approved = transactions.filter((t) => t.status === 'APPROVED');
  const declined = transactions.filter((t) => t.status === 'DECLINED');
  const totalValue = approved.reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader title="Card Transactions" subtitle="Authorization log, decline analysis, dispute initiation"
        actions={<DateRangePicker value={dateRange} onChange={setDateRange} />}
      />
      <div className="page-container">
        <SummaryBar items={[
          { label: 'Total', value: transactions.length, format: 'number' },
          { label: 'Approved', value: approved.length, format: 'number', color: 'success' },
          { label: 'Declined', value: declined.length, format: 'number', color: 'danger' },
          { label: 'Total Value', value: totalValue, format: 'money' },
        ]} />
        <div className="mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading transactions…
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ReceiptText className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">No transactions found.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={transactions} enableGlobalFilter enableExport exportFilename="card-transactions" />
          )}
        </div>
      </div>
    </>
  );
}
