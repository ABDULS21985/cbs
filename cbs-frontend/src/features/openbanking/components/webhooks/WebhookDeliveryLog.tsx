import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { DataTable } from '@/components/shared/DataTable';
import type { WebhookDelivery } from '../../api/marketplaceApi';
import { RotateCcw, Loader2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WebhookDeliveryLogProps {
  deliveries: WebhookDelivery[];
  loading?: boolean;
  onRetry: (deliveryId: number) => void;
  retryingId?: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function httpStatusBadge(status: number) {
  const color =
    status >= 200 && status < 300
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : status >= 400 && status < 500
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium', color)}>
      {status}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhookDeliveryLog({
  deliveries,
  loading,
  onRetry,
  retryingId,
}: WebhookDeliveryLogProps) {
  const successCount = deliveries.filter((delivery) => delivery.status === 'SUCCESS').length;
  const retryableCount = deliveries.filter((delivery) => delivery.status !== 'SUCCESS').length;

  const columns = useMemo<ColumnDef<WebhookDelivery, unknown>[]>(
    () => [
      {
        accessorKey: 'deliveredAt',
        header: 'Timestamp',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.deliveredAt)}
          </span>
        ),
      },
      {
        accessorKey: 'event',
        header: 'Event',
        cell: ({ row }) => (
          <span className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {row.original.event}
          </span>
        ),
      },
      {
        accessorKey: 'httpStatus',
        header: 'HTTP Status',
        cell: ({ row }) => httpStatusBadge(row.original.httpStatus),
      },
      {
        accessorKey: 'durationMs',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums font-medium">
            {row.original.durationMs} ms
          </span>
        ),
      },
      {
        accessorKey: 'responseBody',
        header: 'Response',
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground font-mono truncate max-w-[180px] block"
            title={row.original.responseBody ?? ''}
          >
            {row.original.responseBody
              ? row.original.responseBody.length > 60
                ? row.original.responseBody.slice(0, 60) + '...'
                : row.original.responseBody
              : '—'}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'attemptCount',
        header: 'Attempts',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{row.original.attemptCount}</span>
        ),
      },
      {
        id: 'retry',
        header: '',
        cell: ({ row }) => {
          if (row.original.status === 'SUCCESS') return null;
          const isRetrying = retryingId === row.original.id;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(row.original.id);
              }}
              disabled={isRetrying}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              Retry
            </button>
          );
        },
        enableSorting: false,
      },
    ],
    [onRetry, retryingId],
  );

  return (
    <div className="ob-page-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Delivery Log</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Review HTTP outcomes and replay failed attempts directly from the ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
            {successCount} successful
          </span>
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
            {retryableCount} retryable
          </span>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={deliveries}
        isLoading={loading}
        emptyMessage="No deliveries recorded yet."
        pageSize={10}
      />
    </div>
  );
}
