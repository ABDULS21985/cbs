import { useQuery } from '@tanstack/react-query';
import { X, BookOpen } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { chequeApi, type ChequeBook, type ChequeLeaf } from '../../api/chequeApi';
import { DataTable, InfoGrid } from '@/components/shared';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  book: ChequeBook | null;
  open: boolean;
  onClose: () => void;
}

const leafStatusColors: Record<ChequeLeaf['status'], string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ISSUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PRESENTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CLEARED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  STOPPED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  VOID: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const columns: ColumnDef<ChequeLeaf>[] = [
  {
    accessorKey: 'leafNumber',
    header: 'Leaf #',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.leafNumber}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', leafStatusColors[row.original.status])}>
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'issuedDate',
    header: 'Issued Date',
    cell: ({ row }) => row.original.issuedDate ? formatDate(row.original.issuedDate) : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'presentedDate',
    header: 'Presented Date',
    cell: ({ row }) => row.original.presentedDate ? formatDate(row.original.presentedDate) : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => row.original.amount != null
      ? <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span>
      : <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'payee',
    header: 'Payee',
    cell: ({ row }) => row.original.payee ?? <span className="text-muted-foreground">—</span>,
  },
];

export function ChequeLeafTracker({ book, open, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['cheque-book-leaves', book?.id],
    queryFn: () => chequeApi.getChequeBook(book!.id),
    enabled: open && book != null,
  });

  if (!open || !book) return null;

  const leaves = data?.leaves ?? [];

  const infoItems = [
    { label: 'Book Number', value: book.bookNumber, mono: true },
    { label: 'Account Number', value: book.accountNumber, format: 'account' as const },
    { label: 'Account Title', value: book.accountTitle },
    { label: 'Leaf Range', value: `${book.leafFrom} – ${book.leafTo}` },
    { label: 'Total Leaves', value: String(book.totalLeaves) },
    { label: 'Used', value: String(book.usedLeaves) },
    { label: 'Available', value: String(book.availableLeaves) },
    { label: 'Issued Date', value: book.issuedDate, format: 'date' as const },
    { label: 'Collection Branch', value: book.collectionBranch },
    { label: 'Status', value: book.status },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-5xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Cheque Book — {book.bookNumber}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            <div className="rounded-lg border bg-muted/20 p-5">
              <InfoGrid items={infoItems} columns={4} />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Leaf Status Tracker</h3>
              <DataTable
                columns={columns}
                data={leaves}
                isLoading={isLoading}
                enableGlobalFilter
                emptyMessage="No leaf data available for this cheque book"
                pageSize={15}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
