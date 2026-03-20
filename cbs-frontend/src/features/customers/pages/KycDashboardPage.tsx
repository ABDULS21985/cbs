import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Eye,
  Shield,
  CalendarClock,
  BarChart3,
  Users,
  CheckSquare,
} from 'lucide-react';
import { DataTable, StatCard, StatusBadge, FormSection } from '@/components/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useKycList, useKycStats } from '../hooks/useCustomers';
import {
  useKycDashboardStats,
  useKycReviewsDue,
  useInitiateEdd,
  useCompleteKycReview,
} from '../hooks/useKycWorkflow';
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

  useEffect(() => {
    document.title = 'KYC Command Center';
  }, []);

  // Data hooks
  const { data: stats } = useKycStats();
  const { data: dashboardStats } = useKycDashboardStats();
  const { data: kycData, isLoading } = useKycList({ status: activeStatus, page, size });
  const { data: reviewsDue = [] } = useKycReviewsDue();
  const initiateEddMut = useInitiateEdd();
  const completeReviewMut = useCompleteKycReview();

  // Derived counts
  const pendingCount = stats?.pending ?? dashboardStats?.pending ?? 0;
  const verifiedCount = stats?.verified ?? dashboardStats?.verified ?? 0;
  const expiredCount = stats?.expired ?? dashboardStats?.expired ?? 0;
  const eddActiveCount = Array.isArray(reviewsDue)
    ? (reviewsDue as Record<string, unknown>[]).filter(
        (r) => (r.riskRating as string) === 'HIGH' || (r.riskRating as string) === 'PEP',
      ).length
    : 0;
  const reviewsDueCount = Array.isArray(reviewsDue) ? reviewsDue.length : 0;

  const handleCompleteReview = (customerId: number) => {
    completeReviewMut.mutate(
      { customerId, reviewedBy: 'CURRENT_USER' },
      { onError: () => toast.error('Failed to complete review') },
    );
  };

  const handleInitiateEdd = (customerId: number) => {
    initiateEddMut.mutate(customerId, {
      onError: () => toast.error('Failed to initiate EDD'),
    });
  };

  // Table columns
  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'customerNumber',
      header: 'Customer #',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/customers/kyc/${row.original.id}`);
          }}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.customerNumber}
        </button>
      ),
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
      header: 'KYC Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot />,
    },
    {
      accessorKey: 'riskRating',
      header: 'Risk Rating',
      cell: ({ row }) => {
        const risk = row.original.riskRating ?? 'MEDIUM';
        return (
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold',
              RISK_COLORS[risk] ?? RISK_COLORS.MEDIUM,
            )}
          >
            {risk}
          </span>
        );
      },
    },
    {
      id: 'expiry',
      header: 'Expiry',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {(row.original as Record<string, unknown>).kycExpiryDate
            ? formatDate((row.original as Record<string, unknown>).kycExpiryDate as string)
            : '--'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Last Reviewed',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.createdAt ? formatDate(row.original.createdAt) : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/customers/kyc/${row.original.id}`);
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20"
        >
          <Eye className="w-3 h-3" /> Review
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="KYC Command Center"
        subtitle="Customer verification, document review, risk assessment, and periodic reviews"
      />

      <div className="page-container space-y-6">
        {/* Row 1: Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Pending Review" value={pendingCount} icon={Clock} />
          <StatCard label="Verified" value={verifiedCount} icon={CheckCircle2} />
          <StatCard label="Expired IDs" value={expiredCount} icon={AlertTriangle} />
          <StatCard label="EDD Active" value={eddActiveCount} icon={ShieldAlert} />
          <StatCard label="Reviews Due" value={reviewsDueCount} icon={CalendarClock} />
        </div>

        {/* Row 2: Summary charts / stat panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              KYC Status Distribution
            </div>
            <div className="space-y-2">
              {[
                { label: 'Pending', count: pendingCount, color: 'bg-amber-500' },
                { label: 'Verified', count: verifiedCount, color: 'bg-green-500' },
                { label: 'Expired', count: expiredCount, color: 'bg-red-500' },
              ].map((item) => {
                const total = pendingCount + verifiedCount + expiredCount;
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16">{item.label}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', item.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-10 text-right">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="w-4 h-4 text-muted-foreground" />
              Risk Rating Breakdown
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Low', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Medium', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'High / PEP', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
              ].map((item) => (
                <div key={item.label} className={cn('rounded-lg p-3 text-center', item.bgColor)}>
                  <p className={cn('text-lg font-bold font-mono', item.color)}>--</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk distribution data is derived from individual customer profiles.
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border">
          {KYC_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveStatus(tab.id);
                setPage(0);
              }}
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
            onPageSizeChange: (nextSize) => {
              setSize(nextSize);
              setPage(0);
            },
          }}
          emptyMessage="No customers match the selected KYC state"
        />

        {/* Reviews Due This Month */}
        <FormSection title="Reviews Due This Month" collapsible defaultOpen>
          {Array.isArray(reviewsDue) && reviewsDue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2 pr-4">Customer</th>
                    <th className="pb-2 pr-4">Risk Rating</th>
                    <th className="pb-2 pr-4">Due Date</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(reviewsDue as Record<string, unknown>[]).map((review, idx) => {
                    const risk = (review.riskRating as string) ?? 'MEDIUM';
                    return (
                      <tr key={(review.id as number) ?? idx} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-4 font-medium">
                          {(review.fullName as string) ?? (review.customerName as string) ?? `Customer #${review.id}`}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold',
                              RISK_COLORS[risk] ?? RISK_COLORS.MEDIUM,
                            )}
                          >
                            {risk}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                          {(review.dueDate as string)
                            ? formatDate(review.dueDate as string)
                            : (review.kycExpiryDate as string)
                              ? formatDate(review.kycExpiryDate as string)
                              : '--'}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleCompleteReview(review.id as number)}
                            disabled={completeReviewMut.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckSquare className="w-3 h-3" />
                            Complete Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No periodic reviews due this month.
            </p>
          )}
        </FormSection>

        {/* EDD Section */}
        <FormSection title="Enhanced Due Diligence (EDD)" collapsible defaultOpen={false}>
          <p className="text-xs text-muted-foreground mb-3">
            Customers with HIGH or PEP risk rating requiring Enhanced Due Diligence.
          </p>
          {Array.isArray(reviewsDue) &&
          (reviewsDue as Record<string, unknown>[]).filter(
            (r) => (r.riskRating as string) === 'HIGH' || (r.riskRating as string) === 'PEP' || (r.riskRating as string) === 'VERY_HIGH',
          ).length > 0 ? (
            <div className="space-y-2">
              {(reviewsDue as Record<string, unknown>[])
                .filter(
                  (r) =>
                    (r.riskRating as string) === 'HIGH' ||
                    (r.riskRating as string) === 'PEP' ||
                    (r.riskRating as string) === 'VERY_HIGH',
                )
                .map((customer, idx) => {
                  const risk = (customer.riskRating as string) ?? 'HIGH';
                  return (
                    <div
                      key={(customer.id as number) ?? idx}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {(customer.fullName as string) ??
                              (customer.customerName as string) ??
                              `Customer #${customer.id}`}
                          </p>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-0.5',
                              RISK_COLORS[risk] ?? RISK_COLORS.HIGH,
                            )}
                          >
                            {risk}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInitiateEdd(customer.id as number)}
                        disabled={initiateEddMut.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        <ShieldAlert className="w-3 h-3" />
                        Initiate EDD
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No customers currently require EDD initiation.
            </p>
          )}
        </FormSection>
      </div>
    </>
  );
}
