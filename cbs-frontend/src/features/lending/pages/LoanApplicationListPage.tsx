import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, DateRangePicker } from '@/components/shared';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import type { LoanApplication } from '../types/loan';

const columns: ColumnDef<LoanApplication, any>[] = [
  { accessorKey: 'applicationRef', header: 'Reference', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.applicationRef}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'requestedAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.requestedAmount)}</span> },
  { accessorKey: 'tenorMonths', header: 'Tenor', cell: ({ row }) => `${row.original.tenorMonths} mo` },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'createdAt', header: 'Submitted', cell: ({ row }) => formatDate(row.original.createdAt) },
  { accessorKey: 'assignedOfficer', header: 'Officer' },
];

export function LoanApplicationListPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const applications: LoanApplication[] = [];
  const isLoading = false;

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
        <DataTable columns={columns} data={applications} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="loan-applications" onRowClick={(row) => navigate(`/lending/applications/${row.id}`)} />
      </div>
    </>
  );
}
