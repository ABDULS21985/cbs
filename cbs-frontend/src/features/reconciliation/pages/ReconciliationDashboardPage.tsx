import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Clock, ShieldCheck, TrendingUp,
  BarChart3, CalendarDays, AlertTriangle, Activity, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared';
import {
  getNostroAccounts,
  getReconciliationSession,
  getReconciliationHistory,
  type NostroAccount,
  type ReconciliationSession,
} from '../api/reconciliationApi';
import { AgingChart } from '../components/AgingChart';
import { ReconciliationCalendar } from '../components/ReconciliationCalendar';
import { BreakTrendChart } from '../components/BreakTrendChart';

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardTab = 'overview' | 'aging' | 'calendar' | 'breaks' | 'trends';

const TABS: Array<{ id: DashboardTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'aging', label: 'Aging', icon: Clock },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'breaks', label: 'Breaks', icon: AlertTriangle },
  { id: 'trends', label: 'Trends', icon: Activity },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: typeof CheckCircle2;
  color: 'green' | 'red' | 'amber' | 'blue' | 'purple';
  subtext?: string;
}

function StatCard({ label, value, icon: Icon, color, subtext }: StatCardProps) {
  const colors = {
    green: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    blue: 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  }[color];

  const iconBg = {
    green: 'bg-green-100 dark:bg-green-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
    amber: 'bg-amber-100 dark:bg-amber-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
  }[color];

  return (
    <div className={cn('rounded-xl border px-5 py-4', colors)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          {subtext && <p className="text-[11px] mt-1 opacity-70">{subtext}</p>}
        </div>
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Account Table ────────────────────────────────────────────────────────────

interface AccountRowData {
  account: NostroAccount;
  session: ReconciliationSession | null;
}

function AccountsOverviewTable({ data, onOpenWorkbench }: { data: AccountRowData[]; onOpenWorkbench: (accountId: string) => void }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-3.5 border-b">
        <h3 className="text-sm font-semibold">Reconciliation Positions</h3>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Account</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Correspondent</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Currency</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Difference</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Matched</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Breaks</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ account, session }) => {
              const totalEntries = session
                ? session.matchedCount + session.ourUnmatchedCount + session.bankUnmatchedCount
                : 0;
              const breakCount = session
                ? session.ourUnmatchedCount + session.bankUnmatchedCount
                : 0;

              return (
                <tr key={account.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{account.name}</p>
                    <p className="text-muted-foreground font-mono text-[11px]">{account.number}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{account.correspondentBank}</td>
                  <td className="px-4 py-3 font-mono">{account.currency}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {session ? (
                      <span className={cn(
                        'font-medium',
                        Math.abs(session.difference) < 0.01 ? 'text-green-600' : 'text-red-600',
                      )}>
                        {formatMoney(Math.abs(session.difference))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono tabular-nums">
                    {session ? session.matchedCount : '--'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session ? (
                      breakCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                          {breakCount}
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">0</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {session ? (
                      <StatusBadge
                        status={
                          session.status === 'COMPLETED' ? 'success'
                            : session.status === 'IN_PROGRESS' ? 'warning'
                              : 'default'
                        }
                      />
                    ) : (
                      <StatusBadge status="default" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onOpenWorkbench(account.id)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-muted transition-colors"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No accounts found</div>
        )}
      </div>
    </div>
  );
}

// ─── Breaks Panel ─────────────────────────────────────────────────────────────

function BreaksPanel({ data }: { data: AccountRowData[] }) {
  const breaksData = data.filter(d => d.session && (d.session.ourUnmatchedCount + d.session.bankUnmatchedCount) > 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Outstanding Breaks</h3>
      {breaksData.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          No outstanding breaks - all positions are reconciled.
        </div>
      ) : (
        <div className="space-y-3">
          {breaksData.map(({ account, session }) => {
            if (!session) return null;
            return (
              <div key={account.id} className="surface-card px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{account.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{account.number}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    {session.ourUnmatchedCount + session.bankUnmatchedCount} breaks
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs mt-3">
                  <div>
                    <p className="text-muted-foreground">Our Unmatched</p>
                    <p className="font-semibold mt-0.5">{session.ourUnmatchedCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bank Unmatched</p>
                    <p className="font-semibold mt-0.5">{session.bankUnmatchedCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Net Difference</p>
                    <p className={cn(
                      'font-mono font-semibold mt-0.5',
                      Math.abs(session.difference) > 0 ? 'text-red-600' : 'text-green-600',
                    )}>
                      {formatMoney(Math.abs(session.difference))}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReconciliationDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const today = new Date().toISOString().slice(0, 10);

  // Fetch nostro accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['reconciliation', 'nostro-accounts'],
    queryFn: getNostroAccounts,
    refetchInterval: 60_000,
  });

  // Fetch sessions for each account
  const { data: sessions = [] } = useQuery({
    queryKey: ['reconciliation', 'sessions-all', today],
    queryFn: async () => {
      if (accounts.length === 0) return [];
      const results = await Promise.allSettled(
        accounts.map((acc) => getReconciliationSession(acc.id, today)),
      );
      return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    },
    enabled: accounts.length > 0,
    refetchInterval: 60_000,
  });

  // Fetch history for trend data
  const { data: historyMap = {} } = useQuery({
    queryKey: ['reconciliation', 'history-all'],
    queryFn: async () => {
      if (accounts.length === 0) return {};
      const map: Record<string, Awaited<ReturnType<typeof getReconciliationHistory>>> = {};
      const results = await Promise.allSettled(
        accounts.map((acc) => getReconciliationHistory(acc.id)),
      );
      accounts.forEach((acc, i) => {
        const r = results[i];
        map[acc.id] = r.status === 'fulfilled' ? r.value : [];
      });
      return map;
    },
    enabled: accounts.length > 0,
    refetchInterval: 60_000,
  });

  // Combined data
  const accountData: AccountRowData[] = useMemo(() =>
    accounts.map((account, i) => ({
      account,
      session: sessions[i] ?? null,
    })),
    [accounts, sessions],
  );

  // Computed stats
  const stats = useMemo(() => {
    const totalPositions = accountData.length;
    const fullyReconciled = accountData.filter(
      (d) => d.session?.status === 'COMPLETED' && (d.session.ourUnmatchedCount + d.session.bankUnmatchedCount) === 0,
    ).length;
    const outstandingBreaks = accountData.reduce(
      (sum, d) => sum + (d.session ? d.session.ourUnmatchedCount + d.session.bankUnmatchedCount : 0),
      0,
    );

    // Average aging: use history to compute average days since first unmatched
    let totalAgingDays = 0;
    let agingCount = 0;
    Object.values(historyMap).forEach((history) => {
      history.forEach((h) => {
        if (h.status !== 'COMPLETED') {
          const days = Math.round((Date.now() - new Date(h.date).getTime()) / (1000 * 60 * 60 * 24));
          totalAgingDays += days;
          agingCount += 1;
        }
      });
    });
    const avgAging = agingCount > 0 ? Math.round(totalAgingDays / agingCount) : 0;

    // SLA compliance: positions completed within 1 day
    const slaCompliance = totalPositions > 0
      ? Math.round((fullyReconciled / totalPositions) * 100)
      : 100;

    return { totalPositions, fullyReconciled, outstandingBreaks, avgAging, slaCompliance };
  }, [accountData, historyMap]);

  const handleOpenWorkbench = (accountId: string) => {
    navigate(`/accounts/reconciliation/workbench?accountId=${accountId}`);
  };

  return (
    <>
      <PageHeader
        title="Reconciliation Operations"
        subtitle="Monitor and manage reconciliation positions across all nostro/vostro accounts"
        actions={
          <button
            onClick={() => navigate('/accounts/reconciliation/workbench')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Open Workbench
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Total Positions"
            value={stats.totalPositions}
            icon={BarChart3}
            color="blue"
            subtext="Nostro accounts"
          />
          <StatCard
            label="Fully Reconciled"
            value={stats.fullyReconciled}
            icon={CheckCircle2}
            color="green"
            subtext={`${stats.totalPositions > 0 ? Math.round((stats.fullyReconciled / stats.totalPositions) * 100) : 0}% of total`}
          />
          <StatCard
            label="Outstanding Breaks"
            value={stats.outstandingBreaks}
            icon={XCircle}
            color="red"
            subtext="Items pending resolution"
          />
          <StatCard
            label="Avg Aging"
            value={`${stats.avgAging}d`}
            icon={Clock}
            color="amber"
            subtext="Average break age"
          />
          <StatCard
            label="SLA Compliance"
            value={`${stats.slaCompliance}%`}
            icon={ShieldCheck}
            color={stats.slaCompliance >= 90 ? 'green' : stats.slaCompliance >= 70 ? 'amber' : 'red'}
            subtext="Positions within SLA"
          />
        </div>

        {/* Tabs */}
        <div className="border-b flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-1">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Auto-refresh: 60s</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <AccountsOverviewTable data={accountData} onOpenWorkbench={handleOpenWorkbench} />
        )}

        {activeTab === 'aging' && (
          <div className="space-y-6">
            <AgingChart sessions={sessions.filter((s): s is ReconciliationSession => s !== null)} />
            <AccountsOverviewTable data={accountData} onOpenWorkbench={handleOpenWorkbench} />
          </div>
        )}

        {activeTab === 'calendar' && (
          <ReconciliationCalendar
            accounts={accounts}
            historyMap={historyMap}
          />
        )}

        {activeTab === 'breaks' && (
          <BreaksPanel data={accountData} />
        )}

        {activeTab === 'trends' && (
          <BreakTrendChart historyMap={historyMap} />
        )}

        {loadingAccounts && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading reconciliation data...
          </div>
        )}
      </div>
    </>
  );
}
