import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowRight,
  FileX,
  ListChecks,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/shared';
import { formatDate, formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';
import {
  useCollectionCases,
  useCollectionStats,
  useDpdAging,
  useDunningQueue,
  useRecovery,
  useWriteOffRequests,
} from '../hooks/useCollections';
import { CollectionCaseTable } from '../components/collections/CollectionCaseTable';
import { CollectionStatsCards } from '../components/collections/CollectionStatsCards';
import { DpdAgingChart } from '../components/collections/DpdAgingChart';
import { DunningQueueTable } from '../components/collections/DunningQueueTable';
import { DunningTimeline } from '../components/collections/DunningTimeline';
import { RecoveryTrackingTable } from '../components/collections/RecoveryTrackingTable';
import { WriteOffRequestForm } from '../components/collections/WriteOffRequestForm';
import type { WriteOffRequest } from '../types/collections';

const TAB_CONFIG = [
  {
    id: 'active-cases',
    label: 'Active Cases',
    description: 'Work the live case inventory and drill into account detail.',
    icon: AlertCircle,
  },
  {
    id: 'dunning-queue',
    label: 'Dunning Queue',
    description: 'Run outreach steps and log borrower-contact actions.',
    icon: ListChecks,
  },
  {
    id: 'write-offs',
    label: 'Write-Offs',
    description: 'Process case-based write-off resolutions and approvals.',
    icon: FileX,
  },
  {
    id: 'recovery',
    label: 'Recovery Tracking',
    description: 'Track recoveries on written-off exposures and servicing owners.',
    icon: TrendingUp,
  },
] as const;

const writeOffColumns: ColumnDef<WriteOffRequest>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.loanNumber}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'outstanding',
    header: 'Outstanding',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstanding)}</span>,
  },
  {
    accessorKey: 'provisionHeld',
    header: 'Provision Held',
    cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provisionHeld)}</span>,
  },
  {
    accessorKey: 'recoveryProbability',
    header: 'Recovery Prob.',
    cell: ({ row }) => <span>{formatPercent(row.original.recoveryProbability)}</span>,
  },
  {
    accessorKey: 'requestedBy',
    header: 'Requested By',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const color =
        row.original.status === 'APPROVED'
          ? 'bg-emerald-100 text-emerald-800'
          : row.original.status === 'REJECTED'
            ? 'bg-rose-100 text-rose-800'
            : 'bg-amber-100 text-amber-800';

      return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
          {row.original.status}
        </span>
      );
    },
  },
  {
    accessorKey: 'requestedAt',
    header: 'Requested',
    cell: ({ row }) => formatDate(row.original.requestedAt),
  },
];

function CollectionEfficiencyGauge({
  efficiency,
  recoveredMtd,
  totalDelinquent,
}: {
  efficiency: number | null;
  recoveredMtd: number;
  totalDelinquent: number;
}) {
  const data = efficiency == null
    ? []
    : [
        { name: 'Recovered', value: efficiency },
        { name: 'Remaining', value: Math.max(0, 100 - efficiency) },
      ];

  return (
    <div className="lending-section-card h-full">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Recovery Yield</p>
          <h3 className="mt-2 text-lg font-semibold">Collection Efficiency</h3>
          <p className="mt-1 text-sm text-muted-foreground">Recovered share of the current delinquent and recovered balance base.</p>
        </div>
        <div className="lending-hero-chip">
          {efficiency == null ? 'No recovery base' : `${efficiency.toFixed(1)}% MTD`}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-4">
        {efficiency == null ? (
          <div className="flex h-[220px] w-full items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/55 text-sm text-muted-foreground">
            No recovery efficiency signal is available yet.
          </div>
        ) : (
          <div className="relative h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold">{efficiency.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">recovered</span>
            </div>
          </div>
        )}

        <div className="grid w-full gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Recovered MTD</span>
            <span className="font-semibold">{formatMoney(recoveredMtd)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Remaining delinquent base</span>
            <span className="font-semibold">{formatMoney(totalDelinquent)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  useEffect(() => {
    document.title = 'Collections & Recovery | CBS';
  }, []);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: stats, isLoading: statsLoading } = useCollectionStats();
  const { data: agingData = [] } = useDpdAging();
  const { data: cases = [], isLoading: casesLoading } = useCollectionCases();
  const { data: dunningQueue = [], isLoading: dunningLoading } = useDunningQueue();
  const { data: writeOffRequests = [], isLoading: writeOffLoading } = useWriteOffRequests();
  const { data: rawRecovery, isLoading: recoveryLoading } = useRecovery();
  const recovery = Array.isArray(rawRecovery) ? rawRecovery : [];

  const tabFromUrl = searchParams.get('tab');
  const activeTabId = TAB_CONFIG.some((tab) => tab.id === tabFromUrl) ? tabFromUrl! : 'active-cases';
  const activeTab = TAB_CONFIG.find((tab) => tab.id === activeTabId) ?? TAB_CONFIG[0];

  const efficiencyBase = (stats?.totalDelinquent ?? 0) + (stats?.recoveredMtd ?? 0);
  const efficiency = efficiencyBase > 0 ? ((stats?.recoveredMtd ?? 0) / efficiencyBase) * 100 : null;
  const severeExposure = agingData
    .filter((bucket) => bucket.bucket === '91-180' || bucket.bucket === '180+')
    .reduce((sum, bucket) => sum + (bucket.amount || 0), 0);
  const severeCases = cases.filter((item) => item.bucket === '91-180' || item.bucket === '180+').length;
  const pendingWriteOffs = writeOffRequests.filter((item) => item.status === 'PENDING').length;
  const totalRecoveries = recovery.reduce((sum, item) => sum + (item.recovered || 0), 0);
  const legalQueue = dunningQueue.filter((item) => item.nextAction === 'LEGAL_NOTICE').length;

  const setActiveTab = (tabId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next);
  };

  return (
    <div className="page-container space-y-6">
      <section className="lending-hero-shell">
        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="lending-hero-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Collections operations
              </div>
              <div className="lending-hero-chip">Delinquency control</div>
              <div className="lending-hero-chip">Recovery tracking</div>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Collections & Recovery</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Monitor delinquent exposures, execute borrower outreach, process write-off resolutions, and track post-write-off recoveries from one collections workspace.
              </p>
            </div>

            <CollectionStatsCards stats={stats} isLoading={statsLoading} />
          </div>

          <div className="grid gap-4 self-start">
            <div className="lending-section-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Primary Actions</p>
                  <h2 className="mt-2 text-lg font-semibold">Collections Workspace</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Jump directly into the queue that needs attention.</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <button type="button" onClick={() => setActiveTab('active-cases')} className="btn-primary w-full justify-center">
                  <AlertCircle className="h-4 w-4" /> Open Active Cases
                </button>
                <button type="button" onClick={() => setActiveTab('dunning-queue')} className="btn-outline w-full justify-center">
                  <ListChecks className="h-4 w-4" /> Review Dunning Queue
                </button>
                <button type="button" onClick={() => navigate('/lending')} className="btn-outline w-full justify-center">
                  <TrendingUp className="h-4 w-4" /> Back to Lending Dashboard
                </button>
              </div>
            </div>

            <div className="lending-section-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Pressure Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Severe exposure</span>
                  <span className="text-sm font-semibold">{formatMoneyCompact(severeExposure)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">High-risk cases</span>
                  <span className="text-sm font-semibold">{severeCases}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Pending write-offs</span>
                  <span className="text-sm font-semibold">{pendingWriteOffs}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Legal notices queued</span>
                  <span className="text-sm font-semibold">{legalQueue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <DpdAgingChart data={agingData} />

        <div className="space-y-6">
          <CollectionEfficiencyGauge
            efficiency={efficiency}
            recoveredMtd={stats?.recoveredMtd ?? 0}
            totalDelinquent={stats?.totalDelinquent ?? 0}
          />

          <div className="lending-section-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Operational Signals</p>
                <h3 className="mt-2 text-lg font-semibold">Collections Priorities</h3>
                <p className="mt-1 text-sm text-muted-foreground">Quick view of the queues and balances demanding attention right now.</p>
              </div>
              <div className="lending-hero-chip">{formatMoneyCompact(totalRecoveries)} recovered</div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="lending-note-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dunning Queue</p>
                    <p className="mt-2 text-base font-semibold">{dunningQueue.length} accounts queued</p>
                    <p className="mt-1 text-sm text-muted-foreground">Borrowers currently due for the next outreach action.</p>
                  </div>
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="lending-note-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Write-Off Queue</p>
                    <p className="mt-2 text-base font-semibold">{pendingWriteOffs} pending requests</p>
                    <p className="mt-1 text-sm text-muted-foreground">Cases awaiting resolution or approval through write-off processing.</p>
                  </div>
                  <FileX className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="lending-note-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Severe Buckets</p>
                    <p className="mt-2 text-base font-semibold">{severeCases} cases above 90 DPD</p>
                    <p className="mt-1 text-sm text-muted-foreground">Accounts already in the most pressured arrears bands.</p>
                  </div>
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lending-workspace-shell">
        <div className="lending-workspace-banner">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Collections Workspace</p>
                <h2 className="mt-2 text-xl font-semibold">{activeTab.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activeTab.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="lending-hero-chip">Live collections feed</div>
                <div className="lending-hero-chip">{activeTab.label}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const badge = tab.id === 'active-cases'
                  ? cases.length
                  : tab.id === 'dunning-queue'
                    ? dunningQueue.length
                    : tab.id === 'write-offs'
                      ? pendingWriteOffs
                      : recovery.length;
                const isActive = tab.id === activeTabId;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'lending-nav-card',
                      isActive && 'border-primary bg-primary/10 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.72),0_14px_28px_hsl(var(--primary)_/_0.12)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="lending-hero-chip">{badge}</span>
                    </div>
                    <div className="mt-4 text-left">
                      <h3 className="text-sm font-semibold">{tab.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lending-content-shell space-y-6">
          {activeTabId === 'active-cases' ? (
            <CollectionCaseTable
              data={cases}
              isLoading={casesLoading}
              onRowClick={(row) => navigate(`/lending/collections/cases/${row.id}`)}
            />
          ) : null}

          {activeTabId === 'dunning-queue' ? (
            <div className="space-y-6">
              <DunningTimeline />
              <DunningQueueTable data={dunningQueue} isLoading={dunningLoading} />
            </div>
          ) : null}

          {activeTabId === 'write-offs' ? (
            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <WriteOffRequestForm />

              <div className="lending-section-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Approval Queue</p>
                    <h3 className="mt-2 text-lg font-semibold">Write-Off Requests</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Pending and completed requests raised from collections-case resolution flows.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="lending-hero-chip">{writeOffRequests.length} requests</div>
                    <div className="lending-hero-chip">{pendingWriteOffs} pending</div>
                  </div>
                </div>

                <div className="mt-5">
                  <DataTable
                    columns={writeOffColumns}
                    data={writeOffRequests}
                    isLoading={writeOffLoading}
                    emptyMessage="No write-off requests found"
                    pageSize={10}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTabId === 'recovery' ? (
            <RecoveryTrackingTable data={recovery} isLoading={recoveryLoading} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
