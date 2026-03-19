import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { chequeApi, type ChequeBook } from '../../api/chequeApi';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { ChequeBookRequestForm } from './ChequeBookRequestForm';
import { ChequeLeafTracker } from './ChequeLeafTracker';

const columns: ColumnDef<ChequeBook>[] = [
  {
    accessorKey: 'bookNumber',
    header: 'Book #',
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.bookNumber}</span>,
  },
  {
    accessorKey: 'accountNumber',
    header: 'Account',
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-sm">{row.original.accountNumber}</p>
        <p className="text-xs text-muted-foreground">{row.original.accountTitle}</p>
      </div>
    ),
  },
  {
    accessorKey: 'leafFrom',
    header: 'Leaf Range',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.leafFrom} – {row.original.leafTo}
      </span>
    ),
  },
  {
    accessorKey: 'issuedDate',
    header: 'Issued Date',
    cell: ({ row }) => formatDate(row.original.issuedDate),
  },
  {
    accessorKey: 'usedLeaves',
    header: 'Used',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.usedLeaves} / {row.original.totalLeaves}</span>
    ),
  },
  {
    accessorKey: 'availableLeaves',
    header: 'Available',
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.availableLeaves}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function ChequeBookTable() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<ChequeBook | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cheque-books'],
    queryFn: () => chequeApi.getChequeBooks(),
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['cheque-books'] });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Cheque Books</h3>
          <p className="text-sm text-muted-foreground">Manage issued and requested cheque books</p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Request Cheque Book
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        enableGlobalFilter
        enableColumnVisibility
        onRowClick={setSelectedBook}
        emptyMessage="No cheque books found"
      />

      <ChequeBookRequestForm
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSuccess={handleSuccess}
      />

      <ChequeLeafTracker
        book={selectedBook}
        open={selectedBook != null}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
