import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney } from '@/lib/formatters';
import { bulkPaymentApi, type BulkPaymentBatch, type BulkPaymentRow } from '../../api/bulkPaymentApi';

const failedColumns: ColumnDef<BulkPaymentRow, any>[] = [
  { accessorKey: 'rowNumber', header: '#' },
  { accessorKey: 'beneficiaryName', header: 'Beneficiary' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.amount, 'NGN')}</span> },
  { accessorKey: 'failureReason', header: 'Error' },
];

interface Props {
  batchId: number;
}

export function ProcessingProgressStep({ batchId }: Props) {
  const { data: batch, refetch } = useQuery({
    queryKey: ['bulk-payment', 'status', batchId],
    queryFn: () => bulkPaymentApi.getProcessingStatus(batchId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'COMPLETED' || data.status === 'PARTIALLY_COMPLETED')) return false;
      return 3000;
    },
  });

  if (!batch) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  const total = batch.validRows;
  const processed = batch.processedCount;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isComplete = batch.status === 'COMPLETED' || batch.status === 'PARTIALLY_COMPLETED';
  const failedRows = batch.rows.filter((r) => r.executionStatus === 'FAILED');

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Processing Progress</span>
          <span className="font-mono">{processed} of {total} ({pct}%)</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2 p-3 rounded-lg border">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div><div className="text-lg font-bold font-mono">{batch.successCount}</div><div className="text-xs text-muted-foreground">Successful</div></div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg border">
          <XCircle className="w-5 h-5 text-red-600" />
          <div><div className="text-lg font-bold font-mono">{batch.failedCount}</div><div className="text-xs text-muted-foreground">Failed</div></div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg border">
          <Loader2 className={`w-5 h-5 text-blue-600 ${!isComplete ? 'animate-spin' : ''}`} />
          <div><div className="text-lg font-bold font-mono">{total - processed}</div><div className="text-xs text-muted-foreground">Pending</div></div>
        </div>
      </div>

      {/* Failed items */}
      {failedRows.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Failed Items</h4>
          <DataTable columns={failedColumns} data={failedRows} pageSize={10} emptyMessage="No failures" />
        </div>
      )}

      {isComplete && (
        <div className="flex gap-3 justify-end">
          <button className="inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm hover:bg-muted">
            <Download className="w-4 h-4" /> Export Results (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
