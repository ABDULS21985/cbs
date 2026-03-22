import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ListChecks, ArrowRightLeft, Ban, RotateCcw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable, EmptyState, StatusBadge, StatCard } from '@/components/shared';
import { chequeApi, type StopPayment, type ReturnedCheque, type ChequeLeaf } from '../api/chequeApi';
import { ChequeBookTable } from '../components/cheques/ChequeBookTable';
import { ClearingQueueTable } from '../components/cheques/ClearingQueueTable';
import { StopPaymentForm } from '../components/cheques/StopPaymentForm';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const CHEQUE_STATUS_FILTERS = ['ALL', 'ISSUED', 'PRESENTED', 'CLEARED', 'STOPPED', 'RETURNED'] as const;
type ChequeStatusFilter = (typeof CHEQUE_STATUS_FILTERS)[number];

const issuedChequeColumns: ColumnDef<ChequeLeaf>[] = [
  {
    accessorKey: 'leafNumber',
    header: 'Cheque Number',
    cell: ({ row }) => <span className="font-mono text-sm font-medium">#{row.original.leafNumber}</span>,
  },
  {
    accessorKey: 'accountId',
    header: 'Account',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.accountId ?? '—'}</span>,
  },
  {
    accessorKey: 'payee',
    header: 'Payee Name',
    cell: ({ row }) => <span className="text-sm">{row.original.payee ?? '—'}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-right block">
        {row.original.amount != null ? formatMoney(row.original.amount) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'issuedDate',
    header: 'Issue Date',
    cell: ({ row }) => <span className="text-sm">{row.original.issuedDate ? formatDate(row.original.issuedDate) : '—'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'clearedDate',
    header: 'Clearing Date',
    cell: ({ row }) => <span className="text-sm">{row.original.clearedDate ? formatDate(row.original.clearedDate) : '—'}</span>,
  },
];

function IssuedChequesTab() {
  const [statusFilter, setStatusFilter] = useState<ChequeStatusFilter>('ALL');

  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ['cheque-books'],
    queryFn: () => chequeApi.getChequeBooks(),
  });

  const allLeaves = useMemo(() => {
    return books.flatMap((book) =>
      (book.leaves ?? [])
        .filter((leaf) => leaf.status !== 'AVAILABLE' && leaf.status !== 'VOID')
        .map((leaf) => ({ ...leaf, accountId: book.accountNumber } as ChequeLeaf & { accountId: string })),
    );
  }, [books]);

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return allLeaves;
    return allLeaves.filter((l) => l.status === statusFilter);
  }, [allLeaves, statusFilter]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Issued Cheques</h3>
        <p className="text-sm text-muted-foreground">Track all cheques issued against active cheque books.</p>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {CHEQUE_STATUS_FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              statusFilter === status
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !booksLoading ? (
        <EmptyState
          icon={ListChecks}
          title="No cheques found"
          description={statusFilter === 'ALL'
            ? 'No issued cheques found across any cheque books.'
            : `No cheques with status "${statusFilter.toLowerCase()}" found.`}
        />
      ) : (
        <DataTable
          columns={issuedChequeColumns}
          data={filtered}
          isLoading={booksLoading}
          enableGlobalFilter
          emptyMessage="No cheques found"
        />
      )}
    </div>
  );
}

const stopPaymentColumns: ColumnDef<StopPayment>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.reference}</span>,
  },
  {
    accessorKey: 'accountNumber',
    header: 'Account Number',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.accountNumber}</span>,
  },
  {
    accessorKey: 'chequeFrom',
    header: 'Cheque Range',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.chequeFrom}
        {row.original.chequeTo ? ` – ${row.original.chequeTo}` : ''}
      </span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-sm capitalize">{row.original.reason.replace(/_/g, ' ').toLowerCase()}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
  },
  {
    accessorKey: 'fee',
    header: 'Fee',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.fee)}</span>,
  },
];

function StopPaymentsTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stop-payments'],
    queryFn: () => chequeApi.getStopPayments(),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-1">New Stop Payment Request</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Stop a cheque or range of cheques from being honoured.
        </p>
        <StopPaymentForm onSuccess={() => refetch()} />
      </div>

      <div>
        <h3 className="text-base font-semibold mb-3">Existing Stop Payments</h3>
        <DataTable
          columns={stopPaymentColumns}
          data={data ?? []}
          isLoading={isLoading}
          enableGlobalFilter
          emptyMessage="No stop payments on record"
        />
      </div>
    </div>
  );
}

const returnColumns: ColumnDef<ReturnedCheque>[] = [
  {
    accessorKey: 'chequeNumber',
    header: 'Cheque #',
    cell: ({ row }) => <span className="font-mono text-sm font-medium">#{row.original.chequeNumber}</span>,
  },
  {
    accessorKey: 'drawerAccount',
    header: 'Drawer Account',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.drawerAccount}</span>,
  },
  {
    accessorKey: 'drawerName',
    header: 'Drawer Name',
    cell: ({ row }) => <span className="text-sm">{row.original.drawerName}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span>,
  },
  {
    accessorKey: 'presentingBank',
    header: 'Presenting Bank',
    cell: ({ row }) => <span className="text-sm">{row.original.presentingBank}</span>,
  },
  {
    accessorKey: 'returnedDate',
    header: 'Returned Date',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.returnedDate)}</span>,
  },
  {
    accessorKey: 'reasonCode',
    header: 'Reason',
    cell: ({ row }) => (
      <div>
        <span className="font-mono text-xs font-medium text-muted-foreground">{row.original.reasonCode}</span>
        <p className="text-xs text-muted-foreground">{row.original.reasonDescription}</p>
      </div>
    ),
  },
];

function ReturnsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['cheque-returns'],
    queryFn: () => chequeApi.getReturns(),
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold">Returned Cheques</h3>
        <p className="text-sm text-muted-foreground">Cheques that were returned during the clearing process.</p>
      </div>
      <DataTable
        columns={returnColumns}
        data={data ?? []}
        isLoading={isLoading}
        enableGlobalFilter
        enableColumnVisibility
        emptyMessage="No returned cheques on record"
      />
    </div>
  );
}

export function ChequeManagementPage() {
  useEffect(() => { document.title = 'Cheque Management | CBS'; }, []);

  const { data: chequeBooks = [], isLoading: booksLoading } = useQuery({
    queryKey: ['cheque-books'],
    queryFn: () => chequeApi.getChequeBooks(),
  });

  const { data: clearingQueue = [], isLoading: clearingLoading } = useQuery({
    queryKey: ['clearing-queue'],
    queryFn: () => chequeApi.getClearingQueue(),
  });

  const { data: stopPayments = [], isLoading: stopsLoading } = useQuery({
    queryKey: ['stop-payments'],
    queryFn: () => chequeApi.getStopPayments(),
  });

  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['cheque-returns'],
    queryFn: () => chequeApi.getReturns(),
  });

  const booksIssuedCount = chequeBooks.length;
  const chequesInClearing = clearingQueue.filter((c) => c.status === 'PENDING' || c.status === 'ON_HOLD').length;
  const activeStopPayments = stopPayments.filter((s) => s.status === 'ACTIVE' || s.status === 'PENDING').length;
  const now = new Date();
  const returnsThisMonth = returns.filter((r) => {
    const d = new Date(r.returnedDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const statsLoading = booksLoading || clearingLoading || stopsLoading || returnsLoading;

  const tabs = [
    {
      id: 'books',
      label: 'Cheque Books',
      icon: BookOpen,
      content: <ChequeBookTable />,
    },
    {
      id: 'issued',
      label: 'Issued Cheques',
      icon: ListChecks,
      content: <IssuedChequesTab />,
    },
    {
      id: 'clearing',
      label: 'Clearing',
      icon: ArrowRightLeft,
      content: <ClearingQueueTable />,
    },
    {
      id: 'stop-payments',
      label: 'Stop Payments',
      icon: Ban,
      content: <StopPaymentsTab />,
    },
    {
      id: 'returns',
      label: 'Returns',
      icon: RotateCcw,
      content: <ReturnsTab />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Cheque Management"
        subtitle="Manage cheque books, clearing queue, stop payments and returns"
      />
      <div className="page-container space-y-6">
        {/* Analytics Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Books Issued"
            value={booksIssuedCount}
            format="number"
            icon={BookOpen}
            loading={statsLoading}
          />
          <StatCard
            label="Cheques in Clearing"
            value={chequesInClearing}
            format="number"
            icon={ArrowRightLeft}
            loading={statsLoading}
          />
          <StatCard
            label="Stop Payments Active"
            value={activeStopPayments}
            format="number"
            icon={Ban}
            loading={statsLoading}
          />
          <StatCard
            label="Returns This Month"
            value={returnsThisMonth}
            format="number"
            icon={RotateCcw}
            loading={statsLoading}
          />
        </div>

        <TabsPage tabs={tabs} defaultTab="books" syncWithUrl />
      </div>
    </>
  );
}
