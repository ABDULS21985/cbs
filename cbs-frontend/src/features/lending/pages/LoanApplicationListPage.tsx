import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, DateRangePicker } from '@/components/shared';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

interface AppRow { id: number; ref: string; customer: string; product: string; amount: number; tenor: number; status: string; submittedDate: string; officer: string; }

const mockApps: AppRow[] = [
  { id: 1, ref: 'LA-2026-A1B2C3', customer: 'Amaka Nwosu', product: 'Personal Loan', amount: 2500000, tenor: 24, status: 'PENDING_APPROVAL', submittedDate: '2026-03-17', officer: 'J. Obi' },
  { id: 2, ref: 'LA-2026-D4E5F6', customer: 'Oluwaseun Adeleke', product: 'SME Working Capital', amount: 15000000, tenor: 12, status: 'SCORING', submittedDate: '2026-03-16', officer: 'N. Eze' },
  { id: 3, ref: 'LA-2026-G7H8I9', customer: 'Ibrahim Musa Trading', product: 'SME Asset Finance', amount: 35000000, tenor: 36, status: 'APPROVED', submittedDate: '2026-03-14', officer: 'A. Musa' },
  { id: 4, ref: 'LA-2026-J0K1L2', customer: 'Grace Udo', product: 'Personal Loan', amount: 1000000, tenor: 12, status: 'DISBURSED', submittedDate: '2026-03-10', officer: 'J. Obi' },
  { id: 5, ref: 'LA-2026-M3N4O5', customer: 'Kemi Ogundimu', product: 'Mortgage', amount: 45000000, tenor: 240, status: 'REJECTED', submittedDate: '2026-03-08', officer: 'B. Taiwo' },
];

const columns: ColumnDef<AppRow, any>[] = [
  { accessorKey: 'ref', header: 'Reference', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.ref}</span> },
  { accessorKey: 'customer', header: 'Customer' },
  { accessorKey: 'product', header: 'Product' },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span> },
  { accessorKey: 'tenor', header: 'Tenor', cell: ({ row }) => `${row.original.tenor} mo` },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'submittedDate', header: 'Submitted', cell: ({ row }) => formatDate(row.original.submittedDate) },
  { accessorKey: 'officer', header: 'Officer' },
];

export function LoanApplicationListPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  return (
    <>
      <PageHeader title="Loan Applications" subtitle="Application pipeline and processing" actions={
        <div className="flex gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button onClick={() => navigate('/lending/applications/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Application
          </button>
        </div>
      } />
      <div className="page-container">
        <DataTable columns={columns} data={mockApps} enableGlobalFilter enableExport exportFilename="loan-applications" onRowClick={(row) => navigate(`/lending/applications/${row.id}`)} />
      </div>
    </>
  );
}
