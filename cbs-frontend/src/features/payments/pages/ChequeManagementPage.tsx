import { useQuery } from '@tanstack/react-query';
import { BookOpen, ListChecks, ArrowRightLeft, Ban, RotateCcw, Clock } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable, EmptyState, StatusBadge } from '@/components/shared';
import { chequeApi, type StopPayment, type ReturnedCheque } from '../api/chequeApi';
import { ChequeBookTable } from '../components/cheques/ChequeBookTable';
import { ClearingQueueTable } from '../components/cheques/ClearingQueueTable';
import { StopPaymentForm } from '../components/cheques/StopPaymentForm';
import { formatDate, formatMoney } from '@/lib/formatters';

function IssuedChequesTab() {
  return (
    <div className="p-6">
      <EmptyState
        icon={ListChecks}
        title="Issued Cheques"
        description="Issued cheques tracking is coming soon. This section will display all cheques issued against active cheque books."
      />
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
      <div className="page-container">
        <TabsPage tabs={tabs} defaultTab="books" syncWithUrl />
      </div>
    </>
  );
}
