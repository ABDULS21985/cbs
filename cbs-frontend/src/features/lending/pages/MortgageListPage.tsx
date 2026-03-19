import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { useMortgageList } from '../hooks/useMortgages';
import type { MortgageLoan } from '../types/mortgage';

const ltvColor = (ltv: number): string => {
  if (ltv > 90) return 'text-red-600 font-semibold';
  if (ltv > 80) return 'text-amber-600 font-semibold';
  return 'text-green-600 font-semibold';
};

const statusColor = (status: string): string => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'OVERDUE' || s === 'DEFAULT') return 'bg-red-100 text-red-800';
  if (s === 'CLOSED' || s === 'SETTLED') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
};

const columns: ColumnDef<MortgageLoan>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'propertyAddress',
    header: 'Property',
    cell: ({ row }) => (
      <span className="text-sm max-w-[200px] truncate block" title={row.original.propertyAddress}>
        {row.original.propertyAddress}
      </span>
    ),
  },
  {
    accessorKey: 'disbursedAmount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.disbursedAmount, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'ltv',
    header: 'LTV',
    cell: ({ row }) => (
      <span className={ltvColor(row.original.ltv)}>{formatPercent(row.original.ltv)}</span>
    ),
  },
  {
    accessorKey: 'rate',
    header: 'Rate',
    cell: ({ row }) => <span>{formatPercent(row.original.rate)}</span>,
  },
  {
    accessorKey: 'tenorMonths',
    header: 'Tenor',
    cell: ({ row }) => <span>{row.original.tenorMonths} mo.</span>,
  },
  {
    accessorKey: 'outstandingBalance',
    header: 'Outstanding',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.outstandingBalance, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'dpd',
    header: 'DPD',
    cell: ({ row }) => (
      <span className={row.original.dpd > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
        {row.original.dpd > 0 ? `${row.original.dpd}d` : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(row.original.status)}`}>
        {row.original.status}
      </span>
    ),
  },
];

export default function MortgageListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useMortgageList();

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Mortgage Loans"
        subtitle="Manage residential and commercial mortgage facilities"
      />
      <div className="px-6">
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/lending/mortgages/${row.id}`)}
          enableExport
          exportFilename="mortgage-loans"
          emptyMessage="No mortgage loans found"
          pageSize={20}
        />
      </div>
    </div>
  );
}
