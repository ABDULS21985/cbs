import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable, MoneyDisplay } from '@/components/shared';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { achApi, type AchBatch } from '../../api/achApi';
import { AchBatchDetail } from './AchBatchDetail';
import { AchBatchUploader } from './AchBatchUploader';

interface AchBatchTableProps {
  mode: 'outbound' | 'inbound';
}

const STATUS_COLORS: Record<AchBatch['status'], string> = {
  CREATED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  VALIDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUBMITTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ACCEPTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SETTLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RETURNED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function AchBatchTable({ mode }: AchBatchTableProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const queryClient = useQueryClient();

  const queryKey = ['ach-batches', mode];
  const { data: batches = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      mode === 'outbound' ? achApi.getOutboundBatches() : achApi.getInboundBatches(),
  });

  const columns: ColumnDef<AchBatch, unknown>[] = [
    {
      accessorKey: 'batchNumber',
      header: 'Batch #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-medium">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as AchBatch['type'];
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              type === 'CREDIT'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            )}
          >
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: 'itemCount',
      header: 'Items',
      cell: ({ getValue }) => (
        <span className="text-sm">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total Amount',
      cell: ({ row }) => (
        <MoneyDisplay amount={row.original.totalAmount} currency={row.original.currency} />
      ),
    },
    {
      accessorKey: 'submittedAt',
      header: 'Submitted',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {formatDateTime(String(getValue()))}
        </span>
      ),
    },
    {
      accessorKey: 'effectiveDate',
      header: 'Effective Date',
      cell: ({ getValue }) => (
        <span className="text-xs">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'settlementDate',
      header: 'Settlement Date',
      cell: ({ getValue }) => (
        <span className="text-xs">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as AchBatch['status'];
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              STATUS_COLORS[status],
            )}
          >
            {status}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        {mode === 'outbound' && (
          <button
            onClick={() => setUploaderOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New ACH Batch
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={batches}
        isLoading={isLoading}
        enableGlobalFilter
        onRowClick={(row) => {
          setSelectedBatchId(row.id);
          setDetailOpen(true);
        }}
        emptyMessage="No batches found"
        pageSize={10}
      />

      <AchBatchDetail
        batchId={selectedBatchId}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedBatchId(null); }}
        mode={mode}
      />

      <AchBatchUploader
        open={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
        onSuccess={() => {
          setUploaderOpen(false);
          queryClient.invalidateQueries({ queryKey });
        }}
      />
    </div>
  );
}
