import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { DataTable } from '@/components/shared/DataTable';
import type { Webhook } from '../../api/marketplaceApi';
import { MoreHorizontal, ExternalLink, Trash2, Pause, Play } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WebhookTableProps {
  webhooks: Webhook[];
  loading?: boolean;
  onSelect: (webhook: Webhook) => void;
  onToggleStatus: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
}

// ─── Status Dot ─────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  DISABLED: 'bg-gray-400',
  FAILED: 'bg-red-500',
};

const STATUS_TEXT: Record<string, string> = {
  ACTIVE: 'text-green-600 dark:text-green-400',
  DISABLED: 'text-muted-foreground',
  FAILED: 'text-red-600 dark:text-red-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhookTable({
  webhooks,
  loading,
  onSelect,
  onToggleStatus,
  onDelete,
}: WebhookTableProps) {
  const columns = useMemo<ColumnDef<Webhook, unknown>[]>(
    () => [
      {
        accessorKey: 'url',
        header: 'URL',
        cell: ({ row }) => (
          <div className="flex items-center gap-2 max-w-[280px]">
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-mono truncate" title={row.original.url}>
              {row.original.url}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'events',
        header: 'Events',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {row.original.events.slice(0, 3).map((event) => (
              <span
                key={event}
                className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono"
              >
                {event}
              </span>
            ))}
            {row.original.events.length > 3 && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                +{row.original.events.length - 3}
              </span>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'tppClientName',
        header: 'TPP',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.tppClientName ?? `TPP #${row.original.tppClientId}`}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', STATUS_TEXT[row.original.status])}>
            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[row.original.status])} />
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'successRate',
        header: 'Success Rate',
        cell: ({ row }) => {
          const rate = row.original.successRate;
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    rate >= 95 ? 'bg-green-500' : rate >= 80 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="text-xs tabular-nums font-medium">{rate.toFixed(1)}%</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'lastDeliveredAt',
        header: 'Last Delivered',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.lastDeliveredAt ? formatDateTime(row.original.lastDeliveredAt) : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(row.original);
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title={row.original.status === 'ACTIVE' ? 'Disable' : 'Enable'}
            >
              {row.original.status === 'ACTIVE' ? (
                <Pause className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Play className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(row.original);
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Details"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onSelect, onToggleStatus, onDelete],
  );

  return (
    <DataTable
      columns={columns}
      data={webhooks}
      isLoading={loading}
      onRowClick={onSelect}
      enableGlobalFilter
      emptyMessage="No webhooks registered yet."
    />
  );
}
