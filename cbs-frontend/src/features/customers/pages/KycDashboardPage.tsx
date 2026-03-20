import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, Search, Eye } from 'lucide-react';
import { DataTable, StatCard } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useKycList, useKycStats } from '../hooks/useCustomers';
import type { CustomerListItem } from '../types/customer';

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  VERY_HIGH: 'bg-red-200 text-red-900 dark:bg-red-800/40 dark:text-red-300',
  PEP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  SANCTIONED: 'bg-black text-white',
};

const KYC_TABS = [
  { id: 'UNVERIFIED', label: 'Pending Review' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'EXPIRED', label: 'Expired IDs' },
  { id: '', label: 'All' },
];

export default function KycDashboardPage() {
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState('UNVERIFIED');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const { data: stats } = useKycStats();
  const { data: kycData, isLoading } = useKycList({ status: activeStatus, page, size });

  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'customerNumber', header: 'Customer #',
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); navigate(`/customers/kyc/${row.original.id}`); }}
          className="font-mono text-xs text-primary hover:underline">{row.original.customerNumber}</button>
      ),
    },
    { accessorKey: 'fullName', header: 'Full Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.fullName}</span> },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.type}</span> },
    { accessorKey: 'status', header: 'KYC Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot /> },
    {
      accessorKey: 'riskRating', header: 'Risk Rating',
      cell: ({ row }) => {
        const risk = row.original.riskRating ?? 'MEDIUM';
        return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold', RISK_COLORS[risk] ?? RISK_COLORS.MEDIUM)}>{risk}</span>;
      },
    },
    {
      accessorKey: 'createdAt', header: 'Last Reviewed',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.createdAt ? formatDate(row.original.createdAt) : 'Never'}</span>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <button onClick={(e) => { e.stopPropagation(); navigate(`/customers/kyc/${row.original.id}`); }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20">
          <Eye className="w-3 h-3" /> Review
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="KYC Dashboard" subtitle="Customer verification, document review, and risk assessment" />
      <div className="page-container space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pending Review" value={stats?.pending ?? '—'} icon={Clock} />
          <StatCard label="Verified" value={stats?.verified ?? '—'} icon={CheckCircle2} />
          <StatCard label="Expired IDs" value={stats?.expired ?? '—'} icon={AlertTriangle} />
          <StatCard label="Total Active" value={stats?.total ?? '—'} icon={ShieldAlert} />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border">
          {KYC_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveStatus(tab.id); setPage(0); }}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                activeStatus === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={kycData?.items ?? []}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="kyc-review-list"
          onRowClick={(row) => navigate(`/customers/kyc/${row.id}`)}
          manualPagination={{
            pageIndex: kycData?.page.page ?? page,
            pageSize: kycData?.page.size ?? size,
            pageCount: kycData?.page.totalPages ?? 0,
            rowCount: kycData?.page.totalElements ?? 0,
            onPageChange: setPage,
            onPageSizeChange: (nextSize) => { setSize(nextSize); setPage(0); },
          }}
          emptyMessage="No customers match the selected KYC state"
        />
      </div>
    </>
  );
}
