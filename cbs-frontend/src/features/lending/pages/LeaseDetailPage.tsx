import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, EmptyState } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { useLease, useLeaseAmortization } from '../hooks/useLeases';
import { LeasedAssetCard } from '../components/leasing/LeasedAssetCard';
import { Ifrs16Panel } from '../components/leasing/Ifrs16Panel';
import { DepreciationChart } from '../components/leasing/DepreciationChart';
import { AssetReturnChecklist } from '../components/leasing/AssetReturnChecklist';
import type { AmortizationRow } from '../types/lease';

const amortizationColumns: ColumnDef<AmortizationRow>[] = [
  {
    accessorKey: 'month',
    header: 'Month',
    cell: ({ row }) => <span className="font-semibold">{row.original.month}</span>,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: 'openingLiability',
    header: 'Opening Liability',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.openingLiability)}</span>,
  },
  {
    accessorKey: 'payment',
    header: 'Payment',
    cell: ({ row }) => <span className="font-mono text-sm font-semibold">{formatMoney(row.original.payment)}</span>,
  },
  {
    accessorKey: 'interestCharge',
    header: 'Interest',
    cell: ({ row }) => <span className="font-mono text-sm text-amber-600">{formatMoney(row.original.interestCharge)}</span>,
  },
  {
    accessorKey: 'principalRepayment',
    header: 'Principal',
    cell: ({ row }) => <span className="font-mono text-sm text-green-600">{formatMoney(row.original.principalRepayment)}</span>,
  },
  {
    accessorKey: 'closingLiability',
    header: 'Closing Liability',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.closingLiability)}</span>,
  },
  {
    accessorKey: 'rouAsset',
    header: 'ROU Asset',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.rouAsset)}</span>,
  },
  {
    accessorKey: 'depreciation',
    header: 'Depreciation',
    cell: ({ row }) => <span className="font-mono text-sm text-red-600">{formatMoney(row.original.depreciation)}</span>,
  },
];

const statusColor = (status: string): string => {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (s === 'OVERDUE' || s === 'DEFAULT') return 'bg-red-100 text-red-800';
  if (s === 'CLOSED' || s === 'TERMINATED') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
};

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const leaseId = Number(id);

  const { data: lease, isLoading } = useLease(leaseId);
  const { data: amortization, isLoading: amortLoading } = useLeaseAmortization(leaseId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!lease) {
    return <EmptyState title="Lease contract not found" description="The requested lease contract could not be found." />;
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={lease.leaseNumber}
        subtitle={`${lease.customerName} — ${lease.assetDescription}`}
        backTo="/lending/leases"
        actions={
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor(lease.status)}`}>
            {lease.status}
          </span>
        }
      />

      {/* Two-column layout */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <LeasedAssetCard lease={lease} />
          <Ifrs16Panel lease={lease} amortization={amortization} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <DepreciationChart data={amortization} currency={lease.currency} />
          <AssetReturnChecklist leaseId={leaseId} />
        </div>
      </div>

      {/* Full amortization schedule */}
      <div className="px-6">
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-foreground">Full Amortization Schedule</h3>
          </div>
          <DataTable
            columns={amortizationColumns}
            data={amortization ?? []}
            isLoading={amortLoading}
            emptyMessage="No amortization schedule available"
            pageSize={24}
            enableExport
            exportFilename={`lease-${lease.leaseNumber}-amortization`}
          />
        </div>
      </div>
    </div>
  );
}
