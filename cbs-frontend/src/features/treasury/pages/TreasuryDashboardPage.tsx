import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, EmptyState } from '@/components/shared';
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  BarChart2,
  ShieldCheck,
  Plus,
  Inbox,
  AlertTriangle,
} from 'lucide-react';
import { formatMoney, formatPercent, formatDate, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useTreasuryDeals, useDealerDesks, useTreasuryAnalytics } from '../hooks/useTreasury';
import type { ColumnDef } from '@tanstack/react-table';
import type { TreasuryDeal, DealerDesk } from '../api/tradingApi';

// ─── Column Definitions ────────────────────────────────────────────────────────

const deskColumns: ColumnDef<DealerDesk, any>[] = [
  { accessorKey: 'name', header: 'Desk Name' },
  {
    accessorKey: 'assetClass',
    header: 'Asset Class',
    cell: ({ row }) => <StatusBadge status={row.original.assetClass} />,
  },
  {
    accessorKey: 'todayPnl',
    header: "Today's P&L",
    cell: ({ row }) => (
      <span
        className={cn(
          'font-mono text-sm font-semibold',
          row.original.todayPnl >= 0 ? 'text-green-600' : 'text-red-600',
        )}
      >
        {row.original.todayPnl >= 0 ? '+' : ''}
        {formatMoney(row.original.todayPnl)}
      </span>
    ),
  },
  {
    accessorKey: 'positionCount',
    header: 'Positions',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.positionCount.toLocaleString()}</span>
    ),
  },
  {
    accessorKey: 'utilizationPct',
    header: 'Utilization',
    cell: ({ row }) => {
      const pct = row.original.utilizationPct;
      return (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500',
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono">{pct.toFixed(1)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'activeDeelersCount',
    header: 'Dealers',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.activeDeelersCount}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

const dealColumns: ColumnDef<TreasuryDeal, any>[] = [
  {
    accessorKey: 'dealRef',
    header: 'Deal Ref',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">{row.original.dealRef}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.type} />,
  },
  { accessorKey: 'counterparty', header: 'Counterparty' },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  { accessorKey: 'currency', header: 'Ccy' },
  {
    accessorKey: 'rate',
    header: 'Rate',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatPercent(row.original.rate)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'bookedAt',
    header: 'Booked',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(row.original.bookedAt)}</span>
    ),
  },
];

// ─── NIM Chart ─────────────────────────────────────────────────────────────────

function NimTrendChart({ currency = 'NGN' }: { currency?: string }) {
  const { data: records = [], isLoading } = useTreasuryAnalytics(currency);

  const chartData = records.map((r) => ({
    date: formatDate(r.recordedAt),
    nim: Number(r.nim.toFixed(3)),
    yield: Number(r.yield.toFixed(3)),
    roa: Number(r.roa.toFixed(3)),
  }));

  if (isLoading) {
    return (
      <div className="animate-pulse h-56 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading chart…</span>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
        No analytics data available for {currency}.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={45} />
        <Tooltip
          formatter={(value: number, name: string) => [`${value.toFixed(3)}%`, name.toUpperCase()]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="nim" stroke="#2563eb" strokeWidth={2} dot={false} name="NIM" />
        <Line type="monotone" dataKey="yield" stroke="#16a34a" strokeWidth={2} dot={false} name="Yield" />
        <Line type="monotone" dataKey="roa" stroke="#d97706" strokeWidth={1.5} dot={false} name="ROA" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-4 w-28 bg-muted rounded mb-2" />
      <div className="h-8 w-36 bg-muted rounded" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function TreasuryDashboardPage() {
  useEffect(() => { document.title = 'Treasury Dashboard | CBS'; }, []);
  const navigate = useNavigate();
  const { data: deals = [], isLoading: dealsLoading, isError: dealsError, refetch: refetchDeals } = useTreasuryDeals();
  const { data: desks = [], isLoading: desksLoading, isError: desksError, refetch: refetchDesks } = useDealerDesks();

  const totalVolume = deals.reduce((s, d) => s + d.amount, 0);
  const openPositions = desks.reduce((s, d) => s + d.positionCount, 0);
  const todayPnl = desks.reduce((s, d) => s + d.todayPnl, 0);
  const avgUtilization =
    desks.length > 0 ? desks.reduce((s, d) => s + d.utilizationPct, 0) / desks.length : 0;

  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime())
    .slice(0, 10);

  return (
    <>
      <PageHeader
        title="Treasury Dashboard"
        subtitle="Real-time overview of deals, dealer desks, and analytics"
        actions={
          <button
            onClick={() => navigate('/treasury/deals')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book New Deal
          </button>
        }
      />

      <div className="page-container space-y-6">
        {(dealsError || desksError) && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load dashboard data.</span>
            <button onClick={() => { refetchDeals(); refetchDesks(); }} className="ml-auto text-xs font-medium underline hover:no-underline">Retry</button>
          </div>
        )}
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {dealsLoading || desksLoading ? (
            Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Total Deal Volume"
                value={totalVolume}
                format="money"
                compact
                icon={DollarSign}
              />
              <StatCard
                label="Open Positions"
                value={openPositions}
                format="number"
                icon={Briefcase}
              />
              <StatCard
                label="Today's P&L"
                value={todayPnl}
                format="money"
                compact
                icon={TrendingUp}
                trend={todayPnl >= 0 ? 'up' : 'down'}
              />
              <StatCard
                label="Avg Utilization"
                value={avgUtilization}
                format="percent"
                icon={BarChart2}
              />
              <StatCard
                label="Active Desks"
                value={desks.filter((d) => d.status === 'ACTIVE').length}
                format="number"
                icon={ShieldCheck}
              />
            </>
          )}
        </div>

        {/* NIM Trend Chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">NIM &amp; Yield Trend (NGN)</h2>
          <NimTrendChart currency="NGN" />
        </div>

        {/* Dealer Desks Table */}
        <div className="card">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Dealer Desks</h2>
            <button
              onClick={() => navigate('/treasury/trading-desk')}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="p-4">
            <DataTable
              columns={deskColumns}
              data={desks}
              isLoading={desksLoading}
              enableGlobalFilter
            />
            {!desksLoading && desks.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="No dealer desks found"
                description="Dealer desks will appear here once configured."
              />
            )}
          </div>
        </div>

        {/* Recent Deals Table */}
        <div className="card">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Deals</h2>
            <button
              onClick={() => navigate('/treasury/deals')}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="p-4">
            <DataTable
              columns={dealColumns}
              data={recentDeals}
              isLoading={dealsLoading}
              enableGlobalFilter
            />
            {!dealsLoading && deals.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="No deals found"
                description="Booked deals will appear here."
                action={{ label: 'Book Deal', onClick: () => navigate('/treasury/deals'), icon: Plus }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
