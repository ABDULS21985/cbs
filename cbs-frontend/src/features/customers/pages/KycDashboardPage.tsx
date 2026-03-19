import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { DataTable, StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/formatters';
import { useKycList, useKycStats } from '../hooks/useCustomers';
import type { CustomerListItem } from '../types/customer';

const KYC_TABS = [
  { id: 'UNVERIFIED', label: 'Pending Review' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'EXPIRED', label: 'Expired IDs' },
  { id: '', label: 'All Active' },
];

export default function KycDashboardPage() {
  const [activeStatus, setActiveStatus] = useState('UNVERIFIED');
  const { data: stats } = useKycStats();
  const { data: kycData, isLoading } = useKycList({ status: activeStatus, page: 0, size: 50 });

  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'customerNumber',
      header: 'Customer #',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.customerNumber}</span>,
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.fullName}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs">{row.original.type}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Lifecycle',
      cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot />,
    },
    {
      accessorKey: 'riskRating',
      header: 'Risk',
      cell: ({ row }) => <StatusBadge status={row.original.riskRating ?? 'MEDIUM'} size="sm" />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.original.createdAt ? formatDateTime(row.original.createdAt) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pending" value={stats?.pending ?? '—'} icon={Clock} />
        <StatCard label="Verified" value={stats?.verified ?? '—'} icon={CheckCircle2} />
        <StatCard label="Expired IDs" value={stats?.expired ?? '—'} icon={AlertTriangle} />
        <StatCard label="Total Active" value={stats?.total ?? '—'} icon={ShieldAlert} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {KYC_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveStatus(tab.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeStatus === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
        KYC approve/reject actions are not exposed by the current backend yet. This screen is live for review and monitoring only.
      </div>

      <DataTable
        columns={columns}
        data={kycData?.items ?? []}
        isLoading={isLoading}
        pageSize={kycData?.page.size ?? 20}
        emptyMessage="No customers match the selected KYC state"
      />
    </div>
  );
}
