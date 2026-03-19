import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, SummaryBar } from '@/components/shared';
import { WidgetCard } from '@/features/dashboard/components/WidgetCard';
import { BarChartWidget } from '@/features/dashboard/widgets/BarChartWidget';
import { PieChartWidget } from '@/features/dashboard/widgets/PieChartWidget';
import { Plus, Landmark, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { formatMoney } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import type { LoanAccount, PortfolioStats } from '../types/loan';

const columns: ColumnDef<LoanAccount, any>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'outstandingPrincipal', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstandingPrincipal)}</span> },
  { accessorKey: 'daysPastDue', header: 'DPD', cell: ({ row }) => <span className={`font-mono text-sm font-medium ${(row.original.daysPastDue || 0) > 60 ? 'text-red-600' : 'text-amber-600'}`}>{row.original.daysPastDue}</span> },
  { accessorKey: 'classification', header: 'Classification', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'provisionAmount', header: 'Provision', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provisionAmount || 0)}</span> },
];

export function LoanDashboardPage() {
  const navigate = useNavigate();

  const { data: allLoans = [] } = useQuery({
    queryKey: ['loans', 'all'],
    queryFn: () => apiGet<LoanAccount[]>('/api/v1/loans').catch(() => []),
    staleTime: 30_000,
  });

  const stats: PortfolioStats = {
    totalOutstanding: allLoans.reduce((s, l) => s + (l.outstandingPrincipal || 0), 0),
    activeLoansCount: allLoans.filter(l => l.status === 'ACTIVE').length,
    activeLoans: allLoans.filter(l => l.status === 'ACTIVE').length,
    nplRatio: allLoans.length > 0 ? allLoans.filter(l => (l.daysPastDue || 0) > 90).length / allLoans.length * 100 : 0,
    disbursedMtd: 0,
    collectionsMtd: 0,
    dpdDistribution: [],
    classificationBreakdown: [],
    sectorConcentration: [],
  };

  const watchList = allLoans.filter(l => (l.daysPastDue || 0) >= 30);
  const watchLoading = false;

  return (
    <>
      <PageHeader title="Loan Portfolio" subtitle="Portfolio-level view of all lending activities" actions={
        <button onClick={() => navigate('/lending/applications/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Application
        </button>
      } />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Outstanding" value={stats.totalOutstanding} format="money" compact icon={Landmark} />
          <StatCard label="Active Loans" value={stats.activeLoansCount} format="number" />
          <StatCard label="NPL Ratio" value={stats.nplRatio} format="percent" icon={AlertTriangle} />
          <StatCard label="Disbursed MTD" value={stats.disbursedMtd} format="money" compact icon={TrendingUp} />
          <StatCard label="Collections MTD" value={stats.collectionsMtd} format="money" compact icon={TrendingDown} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="DPD Distribution" colSpan={6}>
            <BarChartWidget />
          </WidgetCard>
          <WidgetCard title="Classification Breakdown" colSpan={6}>
            <PieChartWidget />
          </WidgetCard>
        </div>

        <div>
          <SummaryBar items={[
            { label: 'Watch List', value: watchList.length, format: 'number' },
            { label: 'Total Exposure', value: watchList.reduce((s, w) => s + (w.outstandingPrincipal || 0), 0), format: 'money', color: 'danger' },
            { label: 'Total Provision', value: watchList.reduce((s, w) => s + (w.provisionAmount || 0), 0), format: 'money', color: 'warning' },
          ]} />
          <div className="mt-2">
            <DataTable columns={columns} data={watchList} isLoading={watchLoading} onRowClick={(row) => navigate(`/lending/${row.loanNumber}`)} enableGlobalFilter enableExport exportFilename="watch-list" />
          </div>
        </div>
      </div>
    </>
  );
}
