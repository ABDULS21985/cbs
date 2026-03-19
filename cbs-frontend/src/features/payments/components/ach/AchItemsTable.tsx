import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { MoneyDisplay, StatusBadge } from '@/components/shared';
import { ACH_RETURN_CODES, type AchItem } from '../../api/achApi';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface AchItemsTableProps {
  items: AchItem[];
  mode: 'view' | 'inbound-action';
  onPost?: (itemId: string) => void;
  onReturn?: (itemId: string, code: string) => void;
}

function ReturnReasonDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">Select Return Reason</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Return Code</label>
            <select
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason code</option>
              {Object.entries(ACH_RETURN_CODES).map(([k, v]) => (
                <option key={k} value={k}>{k} - {v}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!code}
              onClick={() => { if (code) { onConfirm(code); onClose(); } }}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Return Item
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AchItemsTable({ items, mode, onPost, onReturn }: AchItemsTableProps) {
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const columns: ColumnDef<AchItem, unknown>[] = [
    {
      accessorKey: 'sequenceNumber',
      header: 'Seq #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'accountNumber',
      header: 'Account #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'routingNumber',
      header: 'Routing #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'transactionCode',
      header: 'Txn Code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => <MoneyDisplay amount={getValue() as number} currency="USD" />,
    },
    {
      accessorKey: 'addenda',
      header: 'Addenda',
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return v ? (
          <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[120px] truncate block" title={v}>{v}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
    },
    {
      accessorKey: 'returnCode',
      header: 'Return Code',
      cell: ({ getValue }) => {
        const code = getValue() as string | undefined;
        if (!code) return <span className="text-gray-400 text-xs">—</span>;
        const desc = ACH_RETURN_CODES[code];
        return (
          <span className="text-xs font-mono text-red-600 dark:text-red-400">
            {code}{desc ? ` - ${desc}` : ''}
          </span>
        );
      },
    },
    ...(mode === 'inbound-action'
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }: { row: { original: AchItem } }) => {
              const item = row.original;
              const needsAction = item.status === 'PENDING' || item.status === 'CREATED';
              if (!needsAction) return null;
              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onPost?.(item.id); }}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(item.id);
                      setReturnDialogOpen(true);
                    }}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Return
                  </button>
                </div>
              );
            },
          } as ColumnDef<AchItem, unknown>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        enableGlobalFilter
        emptyMessage="No items found"
        pageSize={10}
      />
      <ReturnReasonDialog
        open={returnDialogOpen}
        onClose={() => { setReturnDialogOpen(false); setSelectedItemId(null); }}
        onConfirm={(code) => {
          if (selectedItemId) onReturn?.(selectedItemId, code);
        }}
      />
    </>
  );
}
