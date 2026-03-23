import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  AlertTriangle, Clock, RotateCw, DollarSign, FileText, Settings,
  AlertCircle, Info,
} from 'lucide-react';
import { FdStatsCards } from '../components/FdStatsCards';
import { MaturityProcessingPanel } from '../components/MaturityProcessingPanel';
import { AccrualRunPanel } from '../components/AccrualRunPanel';
import { DepositReportGenerator } from '../components/DepositReportGenerator';
import { useAllFixedDeposits, useFdStats } from '../hooks/useFixedDeposits';

function OperationsDashboard() {
  const navigate = useNavigate();
  const { data: allFds = [], isLoading } = useAllFixedDeposits();
  const { data: stats, isLoading: statsLoading } = useFdStats();

  const today = new Date().toISOString().split('T')[0];
  const weekAhead = new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0];

  const maturingToday = useMemo(() => allFds.filter((fd) => fd.status === 'ACTIVE' && fd.maturityDate.startsWith(today)), [allFds, today]);
  const maturingThisWeek = useMemo(() => allFds.filter((fd) => fd.status === 'ACTIVE' && fd.maturityDate >= today && fd.maturityDate <= weekAhead), [allFds, today, weekAhead]);

  const manualToday = maturingToday.filter((fd) => fd.maturityInstruction === 'MANUAL');
  const autoRolloverToday = maturingToday.filter((fd) => fd.maturityInstruction === 'ROLLOVER_ALL' || fd.maturityInstruction === 'ROLLOVER_PRINCIPAL');
  const maturingTodayValue = maturingToday.reduce((s, fd) => s + fd.maturityValue, 0);
  const maturingWeekValue = maturingThisWeek.reduce((s, fd) => s + fd.maturityValue, 0);

  const actions = [
    { icon: RotateCw, label: 'Run Maturity Processing', desc: 'Process all matured deposits', color: 'text-blue-600', tab: 'maturity' },
    { icon: DollarSign, label: 'Run Interest Accrual', desc: 'Daily batch interest accrual', color: 'text-green-600', tab: 'accrual' },
    { icon: FileText, label: 'Generate Report', desc: 'Portfolio reports and analytics', color: 'text-purple-600', tab: 'reports' },
    { icon: Settings, label: 'Rate Table Management', desc: 'View and manage rate tables', color: 'text-amber-600', href: '/accounts/fixed-deposits' },
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Stats */}
      <FdStatsCards stats={stats} deposits={allFds} isLoading={statsLoading || isLoading} />

      {/* Additional Ops Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={cn('surface-card p-4', maturingToday.length > 0 && manualToday.length > 0 && 'border-red-200 dark:border-red-800')}>
          <p className="text-xs text-muted-foreground">Maturing Today</p>
          <p className="text-xl font-bold tabular-nums">{maturingToday.length}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(maturingTodayValue)}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Maturing This Week</p>
          <p className="text-xl font-bold tabular-nums">{maturingThisWeek.length}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(maturingWeekValue)}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Active FDs</p>
          <p className="text-xl font-bold tabular-nums">{allFds.filter((fd) => fd.status === 'ACTIVE').length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs text-muted-foreground">Pending Accrual</p>
          <p className="text-xl font-bold tabular-nums">{allFds.filter((fd) => fd.status === 'ACTIVE').length}</p>
          <p className="text-[10px] text-muted-foreground">estimated today</p>
        </div>
      </div>

      {/* Alert Banners */}
      {manualToday.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-300">
            <strong>{manualToday.length}</strong> deposit{manualToday.length !== 1 ? 's' : ''} require manual maturity processing today
          </p>
        </div>
      )}
      {autoRolloverToday.length > 0 && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{autoRolloverToday.length}</strong> deposit{autoRolloverToday.length !== 1 ? 's' : ''} will auto-rollover at EOD
          </p>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => action.href ? navigate(action.href) : undefined}
            className="surface-card p-4 text-left hover:shadow-sm hover:border-primary/30 transition-all"
          >
            <action.icon className={cn('w-6 h-6 mb-2', action.color)} />
            <p className="text-sm font-medium">{action.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DepositOperationsPage() {
  return (
    <>
      <PageHeader title="Deposit Operations" subtitle="Batch processing, accrual, and reporting" />
      <div className="page-container space-y-6">
        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'dashboard', label: 'Operations Dashboard', content: <div className="p-4"><OperationsDashboard /></div> },
              { id: 'maturity', label: 'Maturity Processing', content: <div className="p-4"><MaturityProcessingPanel /></div> },
              { id: 'accrual', label: 'Interest Accrual', content: <div className="p-4"><AccrualRunPanel /></div> },
              { id: 'reports', label: 'Reports', content: <div className="p-4"><DepositReportGenerator /></div> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
