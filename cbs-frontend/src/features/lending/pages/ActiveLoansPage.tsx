import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, SummaryBar } from '@/components/shared';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';

interface LoanRow { id: number; loanNumber: string; customer: string; product: string; disbursed: number; outstanding: number; dpd: number; classification: string; nextPayment: string; status: string; }

const mockLoans: LoanRow[] = [
  { id: 1, loanNumber: 'LN-000123', customer: 'Adebayo Holdings', product: 'SME WC', disbursed: 15000000, outstanding: 12500000, dpd: 45, classification: 'WATCH', nextPayment: '2026-04-01', status: 'ARREARS' },
  { id: 2, loanNumber: 'LN-000234', customer: 'Fatima Enterprises', product: 'Personal', disbursed: 5000000, outstanding: 3200000, dpd: 0, classification: 'CURRENT', nextPayment: '2026-04-18', status: 'ACTIVE' },
  { id: 3, loanNumber: 'LN-000345', customer: 'Chukwuemeka & Sons', product: 'SME Asset', disbursed: 50000000, outstanding: 45000000, dpd: 0, classification: 'CURRENT', nextPayment: '2026-04-10', status: 'ACTIVE' },
  { id: 4, loanNumber: 'LN-000456', customer: 'Lagos Motors Ltd', product: 'Mortgage', disbursed: 100000000, outstanding: 78000000, dpd: 61, classification: 'SUBSTANDARD', nextPayment: '2026-03-15', status: 'ARREARS' },
];

const columns: ColumnDef<LoanRow, any>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customer', header: 'Customer' },
  { accessorKey: 'product', header: 'Product' },
  { accessorKey: 'disbursed', header: 'Disbursed', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.disbursed)}</span> },
  { accessorKey: 'outstanding', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstanding)}</span> },
  { accessorKey: 'dpd', header: 'DPD', cell: ({ row }) => <span className={`font-mono text-sm font-medium ${row.original.dpd > 30 ? 'text-red-600' : row.original.dpd > 0 ? 'text-amber-600' : 'text-green-600'}`}>{row.original.dpd}</span> },
  { accessorKey: 'classification', header: 'Class.', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'nextPayment', header: 'Next Payment', cell: ({ row }) => formatDate(row.original.nextPayment) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function ActiveLoansPage() {
  const navigate = useNavigate();
  const totalOutstanding = mockLoans.reduce((s, l) => s + l.outstanding, 0);

  return (
    <>
      <PageHeader title="Active Loans" subtitle="Active loan portfolio" />
      <div className="page-container">
        <SummaryBar items={[
          { label: 'Total Loans', value: mockLoans.length, format: 'number' },
          { label: 'Total Outstanding', value: totalOutstanding, format: 'money' },
          { label: 'Current', value: mockLoans.filter((l) => l.classification === 'CURRENT').length, format: 'number', color: 'success' },
          { label: 'In Arrears', value: mockLoans.filter((l) => l.dpd > 0).length, format: 'number', color: 'danger' },
        ]} />
        <div className="mt-2">
          <DataTable columns={columns} data={mockLoans} enableGlobalFilter enableExport exportFilename="active-loans" onRowClick={(row) => navigate(`/lending/${row.loanNumber}`)} />
        </div>
      </div>
    </>
  );
}
