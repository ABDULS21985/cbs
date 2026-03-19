import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { DataTable, StatusBadge, DateRangePicker } from '@/components/shared';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { qrApi, type MobileTransaction } from '../../api/qrApi';

const PROVIDER_LABELS: Record<string, string> = {
  MTN_MOMO: 'MTN MoMo',
  AIRTEL_MONEY: 'Airtel Money',
  '9PSB': '9PSB',
  OPAY: 'OPay',
  PALMPAY: 'PalmPay',
};

const ALL_PROVIDERS = ['MTN_MOMO', 'AIRTEL_MONEY', '9PSB', 'OPAY', 'PALMPAY'];

const columns: ColumnDef<MobileTransaction>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{formatDateTime(row.original.date)}</span>
    ),
  },
  {
    accessorKey: 'direction',
    header: 'Direction',
    cell: ({ row }) => {
      const isIn = row.original.direction === 'IN';
      return (
        <div className={cn('flex items-center gap-1.5 text-xs font-medium', isIn ? 'text-green-600' : 'text-red-500')}>
          {isIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
          {isIn ? 'Incoming' : 'Outgoing'}
        </div>
      );
    },
  },
  {
    accessorKey: 'provider',
    header: 'Provider',
    cell: ({ row }) => (
      <span className="text-sm">{PROVIDER_LABELS[row.original.provider] || row.original.provider}</span>
    ),
  },
  {
    accessorKey: 'mobileNumber',
    header: 'Mobile #',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.mobileNumber}</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const isIn = row.original.direction === 'IN';
      return (
        <span className={cn('font-mono text-sm font-medium', isIn ? 'text-green-600' : 'text-red-500')}>
          {isIn ? '+' : '-'}{formatMoney(row.original.amount)}
        </span>
      );
    },
  },
  {
    accessorKey: 'fee',
    header: 'Fee',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">{formatMoney(row.original.fee)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

export function MobileMoneyTransactions() {
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined });

  const { data = [], isLoading } = useQuery({
    queryKey: ['mobile-transactions'],
    queryFn: () => qrApi.getMobileTransactions(),
  });

  const filtered = data.filter((tx) => {
    if (directionFilter !== 'ALL' && tx.direction !== directionFilter) return false;
    if (providerFilter !== 'ALL' && tx.provider !== providerFilter) return false;
    if (dateRange.from) {
      const txDate = new Date(tx.date);
      if (txDate < dateRange.from) return false;
      if (dateRange.to && txDate > dateRange.to) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(['ALL', 'IN', 'OUT'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirectionFilter(dir)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                directionFilter === dir
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {dir === 'ALL' ? 'All' : dir === 'IN' ? 'Incoming' : 'Outgoing'}
            </button>
          ))}
        </div>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">All Providers</option>
          {ALL_PROVIDERS.map((p) => (
            <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
          ))}
        </select>

        <DateRangePicker
          value={dateRange}
          onChange={(range) => setDateRange(range ?? {})}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        enableGlobalFilter
        enableColumnVisibility
        enableExport
        exportFilename="mobile-money-transactions"
        emptyMessage="No mobile money transactions found"
      />
    </div>
  );
}
