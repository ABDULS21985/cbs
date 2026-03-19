import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { DataTable, StatusBadge, DateRangePicker, MoneyDisplay } from '@/components/shared';
import { formatDateTime } from '@/lib/formatters';
import { gatewayApi, type SwiftMessage, type GetSwiftMessagesParams } from '../api/gatewayApi';
import { SwiftMessageViewer } from './SwiftMessageViewer';

interface DateRange {
  from?: Date;
  to?: Date;
}

const SWIFT_TYPES = ['ALL', 'MT103', 'MT202', 'MT940', 'MT950'];

const columns: ColumnDef<SwiftMessage, any>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Message Type',
    cell: ({ getValue }) => (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: 'senderBic',
    header: 'Sender BIC',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'receiverBic',
    header: 'Receiver BIC',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <MoneyDisplay amount={row.original.amount} currency={row.original.currency} />
    ),
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
];

export function SwiftMessageSearch() {
  const [reference, setReference] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [type, setType] = useState('ALL');
  const [searchParams, setSearchParams] = useState<GetSwiftMessagesParams>({});
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState<SwiftMessage | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['gateway', 'swift', searchParams],
    queryFn: () => gatewayApi.getSwiftMessages(searchParams),
    enabled: hasSearched,
  });

  const handleSearch = () => {
    const params: GetSwiftMessagesParams = {};
    if (reference.trim()) params.reference = reference.trim();
    if (type !== 'ALL') params.type = type;
    if (dateRange.from) params.dateFrom = dateRange.from.toISOString();
    if (dateRange.to) params.dateTo = dateRange.to.toISOString();
    setSearchParams(params);
    setHasSearched(true);
  };

  const handleReset = () => {
    setReference('');
    setDateRange({});
    setType('ALL');
    setSearchParams({});
    setHasSearched(false);
  };

  const handleRowClick = (msg: SwiftMessage) => {
    setSelectedMessage(msg);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search Form */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Search SWIFT Messages</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-muted-foreground mb-1">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. SW1234567890"
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date Range</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Message Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SWIFT_TYPES.map((t) => (
                  <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              {hasSearched && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {hasSearched ? (
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            enableGlobalFilter
            onRowClick={handleRowClick}
            emptyMessage="No SWIFT messages found"
            pageSize={15}
          />
        ) : (
          <div className="rounded-lg border bg-card py-16 flex flex-col items-center justify-center gap-2 text-center">
            <Search className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Search for SWIFT messages</p>
            <p className="text-xs text-muted-foreground">Use the form above to search by reference, date range, or message type.</p>
          </div>
        )}
      </div>

      <SwiftMessageViewer
        message={selectedMessage}
        open={viewerOpen}
        onClose={() => { setViewerOpen(false); setSelectedMessage(null); }}
      />
    </>
  );
}
