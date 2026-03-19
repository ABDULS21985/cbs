import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, SummaryBar } from '@/components/shared';
import { WidgetCard } from '@/features/dashboard/components/WidgetCard';
import { BarChartWidget } from '@/features/dashboard/widgets/BarChartWidget';
import { PieChartWidget } from '@/features/dashboard/widgets/PieChartWidget';
import { Plus, Landmark, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { formatMoney } from '@/lib/formatters';

interface WatchListItem { loanNumber: string; customerName: string; product: string; outstanding: number; dpd: number; classification: string; provision: number; officer: string; }

const mockWatchList: WatchListItem[] = [
  { loanNumber: 'LN-000123', customerName: 'Adebayo Holdings', product: 'SME Working Capital', outstanding: 12500000, dpd: 45, classification: 'WATCH', provision: 625000, officer: 'J. Obi' },
  { loanNumber: 'LN-000234', customerName: 'Fatima Enterprises', product: 'Personal Loan', outstanding: 3200000, dpd: 92, classification: 'SUBSTANDARD', provision: 800000, officer: 'A. Musa' },
  { loanNumber: 'LN-000345', customerName: 'Chukwuemeka & Sons', product: 'SME Asset Finance', outstanding: 45000000, dpd: 33, classification: 'WATCH', provision: 2250000, officer: 'N. Eze' },
  { loanNumber: 'LN-000456', customerName: 'Lagos Motors Ltd', product: 'Mortgage', outstanding: 78000000, dpd: 61, classification: 'SUBSTANDARD', provision: 19500000, officer: 'B. Taiwo' },
];

const columns: ColumnDef<WatchListItem, any>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'product', header: 'Product' },
  { accessorKey: 'outstanding', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstanding)}</span> },
  { accessorKey: 'dpd', header: 'DPD', cell: ({ row }) => <span className={`font-mono text-sm font-medium ${row.original.dpd > 60 ? 'text-red-600' : 'text-amber-600'}`}>{row.original.dpd}</span> },
  { accessorKey: 'classification', header: 'Classification', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'provision', header: 'Provision', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provision)}</span> },
  { accessorKey: 'officer', header: 'Officer' },
];

export function LoanDashboardPage() {
  const navigate = useNavigate();

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
          <StatCard label="Total Outstanding" value={12_300_000_000} format="money" compact icon={Landmark} />
          <StatCard label="Active Loans" value={3456} format="number" change={2.1} trend="up" changePeriod="vs last month" />
          <StatCard label="NPL Ratio" value={3.8} format="percent" change={-0.3} trend="down" icon={AlertTriangle} />
          <StatCard label="Disbursed MTD" value={890_000_000} format="money" compact icon={TrendingUp} />
          <StatCard label="Collections MTD" value={1_100_000_000} format="money" compact icon={TrendingDown} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <WidgetCard title="DPD Distribution" colSpan={6}>
            <BarChartWidget data={[
              { name: 'Current', value: 2800 }, { name: '1-30', value: 320 }, { name: '31-60', value: 180 },
              { name: '61-90', value: 95 }, { name: '91-180', value: 42 }, { name: '180+', value: 19 },
            ]} />
          </WidgetCard>
          <WidgetCard title="Classification Breakdown" colSpan={6}>
            <PieChartWidget />
          </WidgetCard>
        </div>

        {/* Watch List */}
        <div>
          <SummaryBar items={[
            { label: 'Watch List', value: mockWatchList.length, format: 'number' },
            { label: 'Total Exposure', value: mockWatchList.reduce((s, w) => s + w.outstanding, 0), format: 'money', color: 'danger' },
            { label: 'Total Provision', value: mockWatchList.reduce((s, w) => s + w.provision, 0), format: 'money', color: 'warning' },
          ]} />
          <div className="mt-2">
            <DataTable columns={columns} data={mockWatchList} onRowClick={(row) => navigate(`/lending/${row.loanNumber}`)} enableGlobalFilter enableExport exportFilename="watch-list" />
          </div>
        </div>
      </div>
    </>
  );
}
