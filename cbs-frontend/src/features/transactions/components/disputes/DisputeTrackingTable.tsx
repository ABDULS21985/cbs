import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDateTime, formatMoney } from '@/lib/formatters';
import type { DisputeRecord } from '../../api/disputeApi';

interface DisputeTrackingTableProps {
  disputes: DisputeRecord[];
  isLoading: boolean;
  onView: (dispute: DisputeRecord) => void;
  onRespond?: (dispute: DisputeRecord) => void;
  onEscalate?: (dispute: DisputeRecord) => void;
  onClose?: (dispute: DisputeRecord) => void;
  pageIndex?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DisputeTrackingTable({
  disputes,
  isLoading,
  onView,
  onRespond,
  onEscalate,
  onClose,
  pageIndex = 0,
  pageSize = 10,
  totalRows,
  onPageChange,
  onPageSizeChange,
}: DisputeTrackingTableProps) {
  const columns = useMemo<ColumnDef<DisputeRecord>[]>(
    () => [
      { accessorKey: 'disputeRef', header: 'Dispute Ref' },
      { accessorKey: 'transactionRef', header: 'Txn Ref' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currencyCode)}</span>
        ),
      },
      {
        accessorKey: 'reasonCode',
        header: 'Reason',
        cell: ({ row }) => row.original.reasonCode?.replaceAll('_', ' '),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'filedAt',
        header: 'Filed',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.filedAt)}</span>,
      },
      {
        accessorKey: 'lastUpdatedAt',
        header: 'Last Update',
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.lastUpdatedAt)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => {
          const canRespond = row.original.status === 'PENDING' && Boolean(onRespond);
          const canEscalate = ['PENDING', 'UNDER_REVIEW'].includes(row.original.status) && Boolean(onEscalate);
          const canClose = !['RESOLVED', 'REJECTED'].includes(row.original.status) && Boolean(onClose);

          return (
            <div className="flex flex-wrap gap-2 py-2">
              <button onClick={(event) => { event.stopPropagation(); onView(row.original); }} className="text-xs text-primary hover:underline">
                View
              </button>
              {canRespond && (
                <button onClick={(event) => { event.stopPropagation(); onRespond?.(row.original); }} className="text-xs text-primary hover:underline">
                  Respond
                </button>
              )}
              {canEscalate && (
                <button onClick={(event) => { event.stopPropagation(); onEscalate?.(row.original); }} className="text-xs text-primary hover:underline">
                  Escalate
                </button>
              )}
              {canClose && (
                <button onClick={(event) => { event.stopPropagation(); onClose?.(row.original); }} className="text-xs text-primary hover:underline">
                  Close
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [onClose, onEscalate, onRespond, onView],
  );

  return (
    <DataTable
      columns={columns}
      data={disputes}
      isLoading={isLoading}
      emptyMessage="No disputes found"
      manualPagination={
        totalRows !== undefined && onPageChange
          ? {
              pageIndex,
              pageSize,
              pageCount: Math.max(1, Math.ceil(totalRows / pageSize)),
              rowCount: totalRows,
              onPageChange,
              onPageSizeChange,
            }
          : undefined
      }
    />
  );
}
