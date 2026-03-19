import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { useKycStats, useKycList, useKycDecide } from '../hooks/useCustomers';
import { AlertTriangle, Clock, RefreshCw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const KYC_TABS = [
  { id: 'PENDING',  label: 'Pending Verification' },
  { id: 'EXPIRING', label: 'Expiring Soon' },
  { id: 'OVERDUE',  label: 'Overdue Re-KYC' },
  { id: 'FLAGGED',  label: 'Flagged' },
  { id: '',         label: 'All' },
];

export default function KycDashboardPage() {
  const [activeStatus, setActiveStatus] = useState('PENDING');
  const { data: stats } = useKycStats();
  const { data: kycData, isLoading } = useKycList({ status: activeStatus, page: 0, size: 50 });
  const decideMutation = useKycDecide();

  const handleDecide = (customerId: number, decision: 'approve' | 'reject') => {
    decideMutation.mutate(
      { customerId, decision },
      {
        onSuccess: () => toast.success(`KYC ${decision}d successfully`),
        onError: () => toast.error('Failed to update KYC decision'),
      },
    );
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'customerNumber', header: 'Customer #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.customerNumber}</span> },
    { accessorKey: 'fullName', header: 'Name', cell: ({ row }) => <span className="font-medium text-sm">{row.original.fullName}</span> },
    { accessorKey: 'kycStatus', header: 'KYC Status', cell: ({ row }) => <StatusBadge status={row.original.kycStatus ?? 'PENDING'} size="sm" dot /> },
    { accessorKey: 'verificationLevel', header: 'Level', cell: ({ row }) => <span className="text-xs">{row.original.verificationLevel ?? '—'}</span> },
    {
      accessorKey: 'bvnVerified',
      header: 'BVN',
      cell: ({ row }) => (
        <span className={row.original.bvnVerified ? 'text-green-600 text-sm' : 'text-gray-400 text-sm'}>
          {row.original.bvnVerified ? '✓' : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'lastVerifiedAt',
      header: 'Last Verified',
      cell: ({ row }) =>
        row.original.lastVerifiedAt ? (
          <span className="text-xs">{formatDate(row.original.lastVerifiedAt)}</span>
        ) : (
          <span className="text-gray-400 text-xs">Never</span>
        ),
    },
    {
      accessorKey: 'kycExpiryDate',
      header: 'Expiry',
      cell: ({ row }) =>
        row.original.kycExpiryDate ? (
          <span className="text-xs">{formatDate(row.original.kycExpiryDate)}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded transition-colors"
            onClick={() => handleDecide(row.original.id, 'approve')}
          >
            Approve
          </button>
          <button
            className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded transition-colors"
            onClick={() => handleDecide(row.original.id, 'reject')}
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending Verification" value={stats?.pending ?? '—'} icon={Clock} />
        <StatCard label="Expiring in 30 days"  value={stats?.expiringIn30 ?? '—'} icon={RefreshCw} />
        <StatCard label="Overdue Re-KYC"       value={stats?.overdue ?? '—'} icon={AlertTriangle} />
        <StatCard label="Flagged"              value={stats?.flagged ?? '—'} icon={Shield} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {KYC_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeStatus === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={(kycData as any)?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No customers in this KYC state"
      />
    </div>
  );
}
