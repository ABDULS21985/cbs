import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ListOrdered, CalendarDays, Building2, BarChart3,
  ArrowLeftRight, Ticket, Clock, Users, Medal,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatCard, DataTable } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { branchOpsApi, type BranchStats, type BranchRanking, type QueueTicket } from '../api/branchOpsApi';
import { BranchSelector } from '../components/branch/BranchSelector';
import { BranchDashboardCards } from '../components/branch/BranchDashboardCards';
import { LiveQueueStatus } from '../components/branch/LiveQueueStatus';
import { QueueTicketTable } from '../components/branch/QueueTicketTable';
import { QueueIssueForm } from '../components/branch/QueueIssueForm';
import { StaffScheduleCalendar } from '../components/branch/StaffScheduleCalendar';
import { ShiftSwapForm } from '../components/branch/ShiftSwapForm';
import { FacilityRegisterTable } from '../components/branch/FacilityRegisterTable';
import { ServicePlanComparison } from '../components/branch/ServicePlanComparison';

// ---- Aggregate Dashboard (All Branches) ----

const rankingColumns: ColumnDef<BranchRanking, unknown>[] = [
  {
    accessorKey: 'rank',
    header: 'Rank',
    cell: ({ row }) => {
      const r = row.original.rank;
      return (
        <div className="flex items-center gap-2">
          {r === 1 ? (
            <Medal className="w-4 h-4 text-amber-500" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
              {r}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'branchName',
    header: 'Branch',
    cell: ({ row }) => <span className="font-medium text-sm">{row.original.branchName}</span>,
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(row.original.score, 100)}%` }}
          />
        </div>
        <span className="text-sm font-mono font-semibold">{row.original.score.toFixed(1)}</span>
      </div>
    ),
  },
  {
    accessorKey: 'transactionsToday',
    header: 'Transactions',
    cell: ({ row }) => <span className="text-sm">{row.original.transactionsToday.toLocaleString()}</span>,
  },
  {
    accessorKey: 'avgWait',
    header: 'Avg Wait',
    cell: ({ row }) => <span className="text-sm">{row.original.avgWait} min</span>,
  },
  {
    accessorKey: 'satisfactionScore',
    header: 'Satisfaction',
    cell: ({ row }) => <span className="text-sm font-mono">★ {row.original.satisfactionScore.toFixed(1)}</span>,
  },
];

function AggregateDashboard() {
  const { data: rankings = [], isLoading: rankingsLoading } = useQuery<BranchRanking[]>({
    queryKey: ['branches', 'rankings'],
    queryFn: () => branchOpsApi.getBranchRankings(),
    staleTime: 5 * 60 * 1000,
  });

  const total = rankings.reduce(
    (acc, r) => ({
      transactions: acc.transactions + r.transactionsToday,
      avgWait: acc.avgWait + r.avgWait,
      satisfaction: acc.satisfaction + r.satisfactionScore,
    }),
    { transactions: 0, avgWait: 0, satisfaction: 0 },
  );

  const count = rankings.length || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Branches" value={rankings.length} format="number" icon={Building2} loading={rankingsLoading} />
        <StatCard label="Total Transactions" value={total.transactions} format="number" icon={ArrowLeftRight} loading={rankingsLoading} />
        <StatCard label="Network Avg Wait" value={rankingsLoading ? 0 : parseFloat((total.avgWait / count).toFixed(1))} icon={Clock} loading={rankingsLoading} />
        <StatCard label="Avg Satisfaction" value={rankingsLoading ? 0 : parseFloat((total.satisfaction / count).toFixed(1))} icon={Users} loading={rankingsLoading} />
        <StatCard label="Top Branch Score" value={rankingsLoading ? 0 : parseFloat((rankings[0]?.score ?? 0).toFixed(1))} icon={Medal} loading={rankingsLoading} />
        <StatCard label="Branches Active" value={rankingsLoading ? 0 : rankings.length} format="number" icon={LayoutDashboard} loading={rankingsLoading} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Branch Rankings Today</h3>
        <DataTable
          columns={rankingColumns}
          data={rankings}
          isLoading={rankingsLoading}
          enableGlobalFilter
          emptyMessage="No ranking data"
          pageSize={10}
        />
      </div>
    </div>
  );
}

// ---- Per-Branch Dashboard ----

function BranchDashboard({ branchId }: { branchId: string }) {
  const { data: stats, isLoading } = useQuery<BranchStats>({
    queryKey: ['branches', branchId, 'stats'],
    queryFn: () => branchOpsApi.getBranchStats(branchId),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <BranchDashboardCards stats={stats ?? ({} as BranchStats)} isLoading={isLoading} />

      {!isLoading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">Queue Wait Trend (Today)</h3>
            <div className="space-y-1.5">
              {stats.queueWaitTrend.map((point) => (
                <div key={point.hour} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 text-right">
                    {String(point.hour).padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded transition-all',
                        point.avgWait > 15 ? 'bg-red-400' : point.avgWait > 10 ? 'bg-amber-400' : 'bg-primary/70',
                      )}
                      style={{ width: `${Math.min((point.avgWait / 20) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-14">{point.avgWait} min</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-3">Service Mix</h3>
            <div className="space-y-2">
              {stats.serviceMix.map((item) => (
                <div key={item.service}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground truncate max-w-[160px]">{item.service}</span>
                    <span className="font-mono font-medium ml-2">{item.count} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full rounded bg-primary/70"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>Total transactions today</span>
              <span className="font-mono font-semibold text-foreground">{stats.transactionsToday.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Revenue today</span>
              <span className="font-mono font-semibold text-foreground">{formatMoney(stats.revenueToday)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Queue Tab ----

function QueueTab({ branchId }: { branchId: string }) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [activeView, setActiveView] = useState<'live' | 'history'>('live');
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: historyTickets = [], isLoading: historyLoading } = useQuery<QueueTicket[]>({
    queryKey: ['branches', branchId, 'queue', 'history', historyDate],
    queryFn: () => branchOpsApi.getQueueHistory(branchId, historyDate),
    enabled: activeView === 'history',
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex rounded-lg border overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveView('live')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeView === 'live' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            Live Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeView === 'history' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            History
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'history' && (
            <input
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <button
            type="button"
            onClick={() => setIssueOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Issue Ticket
          </button>
        </div>
      </div>

      {activeView === 'live' ? (
        <LiveQueueStatus branchId={branchId} />
      ) : (
        <QueueTicketTable tickets={historyTickets} isLoading={historyLoading} />
      )}

      <QueueIssueForm
        branchId={branchId}
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

// ---- Staff Schedule Tab ----

function StaffScheduleTab({ branchId }: { branchId: string }) {
  const [swapOpen, setSwapOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setSwapOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Swap Shift
        </button>
      </div>

      <StaffScheduleCalendar branchId={branchId} />

      <ShiftSwapForm
        branchId={branchId}
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        onSuccess={() => toast.success('Shift swap request submitted')}
      />
    </div>
  );
}

// ---- Main Page ----

export function BranchOpsPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const isAllBranches = selectedBranchId === null;

  const tabs = isAllBranches
    ? [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          content: (
            <div className="page-container">
              <AggregateDashboard />
            </div>
          ),
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          content: (
            <div className="page-container">
              <BranchDashboard branchId={selectedBranchId} />
            </div>
          ),
        },
        {
          id: 'queue',
          label: 'Queue',
          icon: ListOrdered,
          content: (
            <div className="page-container">
              <QueueTab branchId={selectedBranchId} />
            </div>
          ),
        },
        {
          id: 'schedule',
          label: 'Staff Schedule',
          icon: CalendarDays,
          content: (
            <div className="page-container">
              <StaffScheduleTab branchId={selectedBranchId} />
            </div>
          ),
        },
        {
          id: 'facilities',
          label: 'Facilities',
          icon: Building2,
          content: (
            <div className="page-container">
              <FacilityRegisterTable branchId={selectedBranchId} />
            </div>
          ),
        },
        {
          id: 'service-plan',
          label: 'Service Plan',
          icon: BarChart3,
          content: (
            <div className="page-container">
              <ServicePlanComparison branchId={selectedBranchId} />
            </div>
          ),
        },
      ];

  return (
    <>
      <PageHeader
        title="Branch Operations"
        subtitle="Monitor and manage branch activities, queues, staff, and facilities"
        actions={
          <BranchSelector value={selectedBranchId} onChange={setSelectedBranchId} />
        }
      />
      <TabsPage tabs={tabs} syncWithUrl={false} />
    </>
  );
}
