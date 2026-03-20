import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, SummaryBar } from '@/components/shared';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatDate } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';
import type { LoanAccount } from '../types/loan';

const columns: ColumnDef<LoanAccount, any>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'disbursedAmount', header: 'Disbursed', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.disbursedAmount)}</span> },
  { accessorKey: 'outstandingPrincipal', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstandingPrincipal)}</span> },
  { accessorKey: 'daysPastDue', header: 'DPD', cell: ({ row }) => <span className={`font-mono text-sm font-medium ${row.original.daysPastDue > 30 ? 'text-red-600' : row.original.daysPastDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>{row.original.daysPastDue}</span> },
  { accessorKey: 'classification', header: 'Class.', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'nextPaymentDate', header: 'Next Payment', cell: ({ row }) => formatDate(row.original.nextPaymentDate) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function ActiveLoansPage() {
  const navigate = useNavigate();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans', 'active'],
    queryFn: () => apiGet<LoanAccount[]>('/api/v1/loans', { status: 'ACTIVE' }),
    staleTime: 30_000,
  });

  const totalOutstanding = loans.reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);

  return (
    <>
      <PageHeader title="Active Loans" subtitle="Active loan portfolio" />
      <div className="page-container">
        <SummaryBar items={[
          { label: 'Total Loans', value: loans.length, format: 'number' },
          { label: 'Total Outstanding', value: totalOutstanding, format: 'money' },
          { label: 'Current', value: loans.filter((l) => l.classification === 'CURRENT').length, format: 'number', color: 'success' },
          { label: 'In Arrears', value: loans.filter((l) => (l.daysPastDue || 0) > 0).length, format: 'number', color: 'danger' },
        ]} />
        <div className="mt-2">
          <DataTable columns={columns} data={loans} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="active-loans" onRowClick={(row) => navigate(`/lending/${row.id}`)} />
        </div>
      </div>
    </>
  );
}
