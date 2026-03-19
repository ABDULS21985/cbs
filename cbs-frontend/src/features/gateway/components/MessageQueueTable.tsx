import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge, MoneyDisplay } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { gatewayApi, type GatewayMessage } from '../api/gatewayApi';
import { MessageDetailModal } from './MessageDetailModal';

const TYPE_COLORS: Record<string, string> = {
  NIP: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SWIFT_MT103: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SWIFT_MT202: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  ACH: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RTGS: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600')}>
      {type}
    </span>
  );
}

function DirectionArrow({ direction }: { direction: 'INBOUND' | 'OUTBOUND' }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <span className={cn('text-base leading-none', direction === 'INBOUND' ? 'text-blue-500' : 'text-green-500')}>
        {direction === 'INBOUND' ? '←' : '→'}
      </span>
      {direction}
    </span>
  );
}

const columns: ColumnDef<GatewayMessage, any>[] = [
  {
    accessorKey: 'reference',
    header: 'Ref',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'direction',
    header: 'Direction',
    cell: ({ getValue }) => <DirectionArrow direction={getValue<'INBOUND' | 'OUTBOUND'>()} />,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => <TypeBadge type={getValue<string>()} />,
  },
  {
    accessorKey: 'counterparty',
    header: 'Counterparty',
    cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => {
      const { amount, currency } = row.original;
      if (amount == null) return <span className="text-muted-foreground text-xs">—</span>;
      return <MoneyDisplay amount={amount} currency={currency ?? 'NGN'} />;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
  },
  {
    accessorKey: 'sentAt',
    header: 'Sent At',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: 'latencyMs',
    header: 'Latency',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>();
      return v != null ? (
        <span className="text-xs font-mono">{v}ms</span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
];

export function MessageQueueTable() {
  const [selectedMessage, setSelectedMessage] = useState<GatewayMessage | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['gateway', 'messages'],
    queryFn: () => gatewayApi.getMessages({}),
    refetchInterval: 10_000,
  });

  const handleRowClick = (msg: GatewayMessage) => {
    setSelectedMessage(msg);
    setDetailOpen(true);
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={handleRowClick}
        emptyMessage="No messages in queue"
        pageSize={15}
      />
      <MessageDetailModal
        message={selectedMessage}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedMessage(null); }}
      />
    </>
  );
}
