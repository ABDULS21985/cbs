import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, SummaryBar } from '@/components/shared';
import { WidgetCard } from '@/features/dashboard/components/WidgetCard';
import { BarChartWidget } from '@/features/dashboard/widgets/BarChartWidget';
import { PieChartWidget } from '@/features/dashboard/widgets/PieChartWidget';
import { Plus, Landmark, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { formatMoney } from '@/lib/formatters';
import { usePortfolioStats, useActiveLoans } from '../hooks/useLoanData';
import type { LoanAccount } from '../types/loan';

const columns: ColumnDef<LoanAccount, any>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'totalOutstanding', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalOutstanding)}</span> },
  { accessorKey: 'daysPastDue', header: 'DPD', cell: ({ row }) => <span className={`font-mono text-sm font-medium ${row.original.daysPastDue > 60 ? 'text-red-600' : 'text-amber-600'}`}>{row.original.daysPastDue}</span> },
  { accessorKey: 'classification', header: 'Classification', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'provisionAmount', header: 'Provision', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provisionAmount)}</span> },
  { accessorKey: 'assignedOfficer', header: 'Officer' },
];

export function LoanDashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = usePortfolioStats();
  const { data: watchList = [], isLoading: watchListLoading } = useActiveLoans({ status: 'ARREARS' });

  const dpdChartData = stats?.dpdDistribution?.map((d: { bucket: string; count: number }) => ({
    name: d.bucket,
    value: d.count,
  })) ?? [];

  return (
    <>
      <PageHeader title="Loan Portfolio" subtitle="Portfolio-level view of all lending activities" actions={
        <button onClick={() => navigate('/lending/applications/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Application
        </button>
      } />
      <div className="page-container space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Outstanding" value={stats?.totalOutstanding ?? 0} format="money" compact icon={Landmark} loading={statsLoading} />
          <StatCard label="Active Loans" value={stats?.activeLoansCount ?? 0} format="number" loading={statsLoading} />
          <StatCard label="NPL Ratio" value={stats?.nplRatio ?? 0} format="percent" icon={AlertTriangle} loading={statsLoading} />
          <StatCard label="Disbursed MTD" value={stats?.disbursedMtd ?? 0} format="money" compact icon={TrendingUp} loading={statsLoading} />
          <StatCard label="Collections MTD" value={stats?.collectionsMtd ?? 0} format="money" compact icon={TrendingDown} loading={statsLoading} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="DPD Distribution" colSpan={6}>
            <BarChartWidget data={dpdChartData} />
          </WidgetCard>
          <WidgetCard title="Classification Breakdown" colSpan={6}>
            <PieChartWidget />
          </WidgetCard>
        </div>

        {/* Watch List */}
        <div>
          <SummaryBar items={[
            { label: 'Watch List', value: watchList.length, format: 'number' },
            { label: 'Total Exposure', value: watchList.reduce((s, w) => s + w.totalOutstanding, 0), format: 'money', color: 'danger' },
            { label: 'Total Provision', value: watchList.reduce((s, w) => s + w.provisionAmount, 0), format: 'money', color: 'warning' },
          ]} />
          <div className="mt-2">
            <DataTable columns={columns} data={watchList} isLoading={watchListLoading} onRowClick={(row) => navigate(`/lending/${row.loanNumber}`)} enableGlobalFilter enableExport exportFilename="watch-list" emptyMessage="No loans currently in arrears" />
          </div>
        </div>
      </div>
    </>
  );
}
