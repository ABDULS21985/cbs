import { useState, useMemo } from 'react';
import { RefreshCw, Trash2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/formatters';
import type { ImportRecord } from '../api/reconciliationApi';

interface ImportHistoryTableProps {
  records: ImportRecord[];
  isLoading: boolean;
  onReImport: (importId: string) => void;
  onDelete: (importId: string) => void;
}

export function ImportHistoryTable({ records, isLoading, onReImport, onDelete }: ImportHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<ImportRecord, any>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        size: 36,
        cell: ({ row }) => {
          const hasErrors = row.original.errors && row.original.errors.length > 0;
          if (!hasErrors) return null;
          const isExpanded = expandedId === row.original.id;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedId(isExpanded ? null : row.original.id);
              }}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          );
        },
      },
      {
        accessorKey: 'id',
        header: 'Import ID',
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string).slice(0, 8)}</span>,
      },
      {
        accessorKey: 'importDate',
        header: 'Date',
        cell: ({ getValue }) => formatDateTime(getValue() as string),
      },
      { accessorKey: 'accountNumber', header: 'Account' },
      { accessorKey: 'bankName', header: 'Bank' },
      {
        accessorKey: 'filename',
        header: 'Filename',
        cell: ({ getValue }) => (
          <span className="max-w-[160px] truncate block" title={getValue() as string}>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'format',
        header: 'Format',
        cell: ({ getValue }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted">
            {getValue() as string}
          </span>
        ),
      },
      { accessorKey: 'entriesCount', header: 'Entries' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      { accessorKey: 'importedBy', header: 'Imported By' },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReImport(row.original.id);
              }}
              title="Re-import"
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original.id);
              }}
              title="Delete"
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [expandedId, onReImport, onDelete],
  );

  return (
    <div className="space-y-0">
      <DataTable columns={columns} data={records} isLoading={isLoading} enableGlobalFilter pageSize={15} emptyMessage="No import history found" />

      {/* Expanded error rows */}
      {expandedId && (() => {
        const record = records.find((r) => r.id === expandedId);
        if (!record?.errors?.length) return null;
        return (
          <div className="mx-4 mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-xs text-red-700 dark:text-red-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Parse Errors ({record.errors.length})
            </div>
            {record.errors.map((err, i) => (
              <p key={i} className="pl-5">
                {i + 1}. {err}
              </p>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
