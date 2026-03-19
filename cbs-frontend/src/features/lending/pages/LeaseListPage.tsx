import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { useLeaseList } from '../hooks/useLeases';
import type { LeaseContract } from '../types/lease';

const statusColor = (status: string): string => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'OVERDUE' || s === 'DEFAULT') return 'bg-red-100 text-red-800';
  if (s === 'CLOSED' || s === 'TERMINATED') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
};

const columns: ColumnDef<LeaseContract>[] = [
  {
    accessorKey: 'leaseNumber',
    header: 'Lease #',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{row.original.leaseNumber}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'assetDescription',
    header: 'Asset',
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.assetDescription}</p>
        <p className="text-xs text-muted-foreground">{row.original.assetType}</p>
      </div>
    ),
  },
  {
    accessorKey: 'assetValue',
    header: 'Asset Value',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.assetValue, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'rouAsset',
    header: 'ROU Asset',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.rouAsset, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'leaseLiability',
    header: 'Liability',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.leaseLiability, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'monthlyPayment',
    header: 'Monthly',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.monthlyPayment, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'remainingMonths',
    header: 'Remaining',
    cell: ({ row }) => <span>{row.original.remainingMonths} mo.</span>,
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

export default function LeaseListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useLeaseList();

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Lease Contracts"
        subtitle="Manage IFRS 16 compliant lease agreements and right-of-use assets"
      />
      <div className="px-6">
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/lending/leases/${row.id}`)}
          enableExport
          exportFilename="lease-contracts"
          emptyMessage="No lease contracts found"
          pageSize={20}
        />
      </div>
    </div>
  );
}
