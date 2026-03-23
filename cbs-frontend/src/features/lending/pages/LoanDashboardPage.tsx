import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Car,
  CreditCard,
  FileText,
  GitBranch,
  HandCoins,
  Home,
  Landmark,
  Percent,
  Plus,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DataTable, StatusBadge, SummaryBar } from '@/components/shared';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useActiveLoans, usePortfolioStats } from '../hooks/useLoanData';
import type { LoanAccount, PortfolioStats } from '../types/loan';

const CLASS_COLORS: Record<string, string> = {
  CURRENT: '#10b981',
  WATCH: '#eab308',
  WATCHLIST: '#eab308',
  SUBSTANDARD: '#f97316',
  DOUBTFUL: '#ef4444',
  LOSS: '#dc2626',
  LOST: '#dc2626',
};

const DPD_COLORS = ['#94a3b8', '#38bdf8', '#f59e0b', '#ef4444'];

const columns: ColumnDef<LoanAccount, unknown>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'outstandingPrincipal', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstandingPrincipal)}</span> },
  { accessorKey: 'daysPastDue', header: 'DPD', cell: ({ row }) => <span className={cn('font-mono text-sm font-medium', (row.original.daysPastDue || 0) > 60 ? 'text-red-600' : (row.original.daysPastDue || 0) > 0 ? 'text-amber-600' : '')}>{row.original.daysPastDue}</span> },
  { accessorKey: 'classification', header: 'Classification', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'provisionAmount', header: 'Provision', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provisionAmount || 0)}</span> },
];

type MetricFormat = 'money' | 'moneyCompact' | 'number' | 'percent';

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isCurrentMonth(dateValue?: string): boolean {
  if (!dateValue) {
    return false;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = new Date();
  return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth();
}

function formatMetricValue(value: number | null, format: MetricFormat): string {
  if (value == null) {
    return '—';
  }

  if (format === 'money') {
    return formatMoney(value);
  }

  if (format === 'moneyCompact') {
    return formatMoneyCompact(value);
  }

  if (format === 'percent') {
    return formatPercent(value);
  }

  return value.toLocaleString();
}

function normalizePortfolioSnapshot(rawStats: Record<string, unknown> | undefined, loans: LoanAccount[]) {
  const activeLoans = loans.filter((loan) => loan.status === 'ACTIVE');
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + (loan.outstandingPrincipal || 0), 0);
  const totalProvision = activeLoans.reduce((sum, loan) => sum + (loan.provisionAmount || 0), 0);
  const nplCount = activeLoans.filter((loan) => (loan.daysPastDue || 0) > 90 || ['SUBSTANDARD', 'DOUBTFUL', 'LOST'].includes(loan.classification)).length;
  const nplRatio = activeLoans.length > 0 ? (nplCount / activeLoans.length) * 100 : 0;
  const avgDpd = activeLoans.length > 0 ? activeLoans.reduce((sum, loan) => sum + (loan.daysPastDue || 0), 0) / activeLoans.length : 0;
  const provisionCoverage = totalOutstanding > 0 ? (totalProvision / totalOutstanding) * 100 : 0;
  const totalDisbursed = loans.reduce((sum, loan) => sum + (loan.disbursedAmount || 0), 0);
  const disbursedMtd = loans.filter((loan) => isCurrentMonth(loan.disbursedDate)).reduce((sum, loan) => sum + (loan.disbursedAmount || 0), 0);
  const collectionsMtd = loans
    .filter((loan) => isCurrentMonth(loan.lastPaymentDate))
    .reduce((sum, loan) => sum + (loan.monthlyPayment || loan.nextPaymentAmount || 0), 0);

  return {
    totalOutstanding: parseNumber(rawStats?.totalOutstanding) ?? totalOutstanding,
    activeCount: parseNumber(rawStats?.activeLoansCount ?? rawStats?.activeLoans) ?? activeLoans.length,
    nplRatio: parseNumber(rawStats?.nplRatio) ?? nplRatio,
    disbursedMtd: parseNumber(rawStats?.disbursedMtd) ?? disbursedMtd,
    collectionsMtd: parseNumber(rawStats?.collectionsMtd) ?? collectionsMtd,
    totalProvision: parseNumber(rawStats?.totalProvision) ?? totalProvision,
    provisionCoverage: parseNumber(rawStats?.provisionCoverage) ?? provisionCoverage,
    avgDpd: parseNumber(rawStats?.avgDpd) ?? avgDpd,
    totalDisbursed: parseNumber(rawStats?.totalDisbursed) ?? totalDisbursed,
  };
}

function buildDpdDistribution(rawStats: Record<string, unknown> | undefined, loans: LoanAccount[]) {
  const rawBuckets = rawStats?.dpdDistribution;
  if (Array.isArray(rawBuckets) && rawBuckets.length > 0) {
    return rawBuckets.map((bucket) => {
      const data = bucket as Record<string, unknown>;
      return {
        bucket: String(data.bucket ?? 'Unknown'),
        count: parseNumber(data.count) ?? 0,
        amount: parseNumber(data.amount) ?? 0,
      };
    });
  }

  const definitions = [
    { bucket: '0-30', min: 0, max: 30 },
    { bucket: '31-60', min: 31, max: 60 },
    { bucket: '61-90', min: 61, max: 90 },
    { bucket: '90+', min: 91, max: Number.POSITIVE_INFINITY },
  ];

  return definitions.map(({ bucket, min, max }) => {
    const matching = loans.filter((loan) => {
      const daysPastDue = loan.daysPastDue || 0;
      return daysPastDue >= min && daysPastDue <= max;
    });

    return {
      bucket,
      count: matching.length,
      amount: matching.reduce((sum, loan) => sum + (loan.outstandingPrincipal || 0), 0),
    };
  });
}

function buildClassificationBreakdown(rawStats: Record<string, unknown> | undefined, loans: LoanAccount[]) {
  const rawBreakdown = rawStats?.classificationBreakdown;
  if (Array.isArray(rawBreakdown) && rawBreakdown.length > 0) {
    return rawBreakdown.map((entry) => {
      const data = entry as Record<string, unknown>;
      const classification = String(data.classification ?? 'CURRENT');
      return {
        name: classification,
        value: parseNumber(data.count) ?? 0,
        exposure: parseNumber(data.amount) ?? 0,
        color: CLASS_COLORS[classification] ?? '#64748b',
      };
    }).sort((left, right) => right.value - left.value || right.exposure - left.exposure);
  }

  const grouped = new Map<string, { count: number; amount: number }>();
  loans.filter((loan) => loan.status === 'ACTIVE').forEach((loan) => {
    const classification = loan.classification || 'CURRENT';
    const existing = grouped.get(classification) ?? { count: 0, amount: 0 };
    grouped.set(classification, {
      count: existing.count + 1,
      amount: existing.amount + (loan.outstandingPrincipal || 0),
    });
  });

  return Array.from(grouped.entries())
    .map(([name, data]) => ({
      name,
      value: data.count,
      exposure: data.amount,
      color: CLASS_COLORS[name] ?? '#64748b',
    }))
    .sort((left, right) => right.value - left.value || right.exposure - left.exposure);
}

function MetricCard({
  label,
  value,
  format,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | null;
  format: MetricFormat;
  subtitle: string;
  icon: React.ElementType;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}) {
  return (
    <div className={cn('lending-kpi-card', tone === 'danger' && 'border-red-200', tone === 'success' && 'border-emerald-200', tone === 'warning' && 'border-amber-200')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">{label}</p>
          <p className={cn('mt-3 text-2xl font-semibold tracking-tight', tone === 'danger' && 'text-red-600', tone === 'success' && 'text-emerald-600', tone === 'warning' && 'text-amber-600')}>
            {formatMetricValue(value, format)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, detail, tone }: { title: string; value: string; detail: string; tone?: 'default' | 'danger' | 'success' | 'warning' }) {
  return (
    <div className={cn('lending-insight-card', tone === 'danger' && 'border-red-200', tone === 'success' && 'border-emerald-200', tone === 'warning' && 'border-amber-200')}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className={cn('mt-3 text-xl font-semibold', tone === 'danger' && 'text-red-600', tone === 'success' && 'text-emerald-600', tone === 'warning' && 'text-amber-600')}>{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function NavCard({
  icon: Icon,
  title,
  description,
  path,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  path: string;
  badge?: string;
}) {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate(path)} className="lending-nav-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        {badge ? <span className="lending-hero-chip">{badge}</span> : null}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
        Open module <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

export function LoanDashboardPage() {
  useEffect(() => { document.title = 'Loan Portfolio | CBS'; }, []);
  const navigate = useNavigate();
  const { data: portfolioStatsRaw, isLoading: isLoadingStats } = usePortfolioStats();
  const { data: loansData = [], isLoading: isLoadingLoans } = useActiveLoans();

  const loans = Array.isArray(loansData) ? loansData : [];
  const rawStats = (portfolioStatsRaw ?? undefined) as Record<string, unknown> | undefined;
  const isLoading = isLoadingLoans || isLoadingStats;

  const snapshot = useMemo(() => normalizePortfolioSnapshot(rawStats, loans), [rawStats, loans]);
  const dpdDistribution = useMemo(() => buildDpdDistribution(rawStats, loans), [rawStats, loans]);
  const classificationData = useMemo(() => buildClassificationBreakdown(rawStats, loans), [rawStats, loans]);

  const watchList = useMemo(
    () => loans.filter((loan) => (loan.daysPastDue || 0) >= 30 || ['WATCH', 'SUBSTANDARD', 'DOUBTFUL', 'LOST'].includes(loan.classification)),
    [loans],
  );

  const highestRiskLoan = useMemo(
    () => [...watchList].sort((left, right) => (right.daysPastDue || 0) - (left.daysPastDue || 0))[0],
    [watchList],
  );

  const watchListExposure = watchList.reduce((sum, loan) => sum + (loan.outstandingPrincipal || 0), 0);
  const watchListProvision = watchList.reduce((sum, loan) => sum + (loan.provisionAmount || 0), 0);
  const mortgageCount = loans.filter((loan) => loan.productName?.toLowerCase().includes('mortgage')).length;
  const collateralCount = loans.filter((loan) => loan.status === 'ACTIVE').length;

  return (
    <div className="page-container space-y-6">
      <section className="lending-hero-shell">
        <div className="relative grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:p-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="lending-hero-chip">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Lending command center
              </div>
              <div className="lending-hero-chip">Portfolio book</div>
              <div className="lending-hero-chip">Risk and collections</div>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.5rem]">Loan Portfolio</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Portfolio-level view of lending analytics, risk posture, collections, and origination activity across the live loan book.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Total Outstanding"
                value={snapshot.totalOutstanding}
                format="moneyCompact"
                subtitle="Outstanding principal across active facilities"
                icon={Landmark}
              />
              <MetricCard
                label="Active Loans"
                value={snapshot.activeCount}
                format="number"
                subtitle="Live accounts currently in the portfolio"
                icon={HandCoins}
              />
              <MetricCard
                label="NPL Ratio"
                value={snapshot.nplRatio}
                format="percent"
                subtitle="Non-performing share of active facilities"
                icon={AlertTriangle}
                tone={snapshot.nplRatio > 5 ? 'danger' : 'warning'}
              />
              <MetricCard
                label="Disbursed MTD"
                value={snapshot.disbursedMtd}
                format="moneyCompact"
                subtitle="Current-month disbursements from the loan feed"
                icon={TrendingUp}
                tone="success"
              />
              <MetricCard
                label="Collections MTD"
                value={snapshot.collectionsMtd}
                format="moneyCompact"
                subtitle="Current-month repayments observed on the portfolio"
                icon={TrendingDown}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="lending-section-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Primary Action</p>
                  <h2 className="mt-2 text-lg font-semibold">Originate New Credit</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Launch the loan application workflow from the portfolio dashboard.</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
              </div>
              <button type="button" onClick={() => navigate('/lending/applications/new')} className="btn-primary mt-5 w-full justify-center">
                <Plus className="h-4 w-4" /> New Application
              </button>
            </div>

            <div className="lending-section-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Portfolio Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Total disbursed</span>
                  <span className="text-sm font-semibold">{formatMoneyCompact(snapshot.totalDisbursed)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Watch-list accounts</span>
                  <span className="text-sm font-semibold">{watchList.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Average DPD</span>
                  <span className="text-sm font-semibold">{snapshot.avgDpd.toFixed(0)} days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-6">
          <div className="lending-workspace-shell">
            <div className="lending-workspace-banner">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Portfolio Signals</p>
                  <h2 className="mt-2 text-xl font-semibold">Risk, coverage, and aging signals</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Track emerging credit stress before it becomes a collections event.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="lending-hero-chip">Live loan feed</div>
                  <div className="lending-hero-chip">Portfolio stats service</div>
                </div>
              </div>
            </div>

            <div className="lending-content-shell space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <InsightCard
                  title="Provision Coverage"
                  value={formatPercent(snapshot.provisionCoverage)}
                  detail="Coverage of outstanding principal with booked provisions."
                  tone={snapshot.provisionCoverage >= 20 ? 'success' : 'warning'}
                />
                <InsightCard
                  title="Average DPD"
                  value={`${snapshot.avgDpd.toFixed(0)} days`}
                  detail="Average arrears position across active loan accounts."
                  tone={snapshot.avgDpd > 30 ? 'warning' : 'default'}
                />
                <InsightCard
                  title="Watch-List Exposure"
                  value={formatMoneyCompact(watchListExposure)}
                  detail="Outstanding principal currently under closer monitoring."
                  tone={watchList.length > 0 ? 'danger' : 'success'}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="lending-section-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">DPD Distribution</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Aging buckets built from the live loan dataset.</p>
                    </div>
                    <div className="lending-hero-chip">Past due view</div>
                  </div>
                  <div className="mt-5 h-[260px]">
                    {dpdDistribution.some((bucket) => bucket.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
                        <BarChart data={dpdDistribution}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            formatter={(value: number, name: string) => [name === 'count' ? value.toLocaleString() : formatMoney(value), name === 'count' ? 'Loans' : 'Exposure']}
                            contentStyle={{ fontSize: 12, borderRadius: '1rem' }}
                          />
                          <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                            {dpdDistribution.map((bucket, index) => (
                              <Cell key={bucket.bucket} fill={DPD_COLORS[index % DPD_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No past-due loans in the current feed.</div>
                    )}
                  </div>
                </div>

                <div className="lending-section-card">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Classification Breakdown</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Portfolio risk staging across current and impaired facilities.</p>
                    </div>
                    <div className="lending-hero-chip">Credit quality</div>
                  </div>
                  <div className="mt-5 h-[260px]">
                    {classificationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
                        <PieChart>
                          <Pie data={classificationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={84} label={({ name, value }) => `${name}: ${value}`}>
                            {classificationData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, _name: string, context: { payload?: { exposure?: number } }) => [value.toLocaleString(), `Loans • ${formatMoney(context.payload?.exposure || 0)}`]}
                            contentStyle={{ fontSize: 12, borderRadius: '1rem' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No active loans available for classification analysis.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lending-workspace-shell">
            <div className="lending-workspace-banner">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Watch List</p>
                  <h2 className="mt-2 text-xl font-semibold">Loans requiring closer attention</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Monitor accounts that are deteriorating before they move deeper into impairment.</p>
                </div>
                <div className="lending-hero-chip">{watchList.length} accounts tracked</div>
              </div>
            </div>
            <div className="lending-content-shell space-y-4">
              <SummaryBar
                isLoading={isLoadingLoans}
                items={[
                  { label: 'Watch List', value: watchList.length, format: 'number' },
                  { label: 'Total Exposure', value: watchListExposure, format: 'money', color: 'danger' },
                  { label: 'Total Provision', value: watchListProvision, format: 'money', color: 'warning' },
                ]}
              />
              <DataTable
                columns={columns}
                data={watchList}
                isLoading={isLoadingLoans}
                onRowClick={(row) => navigate(`/lending/${row.id}`)}
                enableGlobalFilter
                enableExport
                exportFilename="watch-list"
                searchPlaceholder="Search the watch list"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="lending-workspace-shell">
            <div className="lending-workspace-banner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Quick Access</p>
              <h2 className="mt-2 text-xl font-semibold">Lending modules</h2>
              <p className="mt-1 text-sm text-muted-foreground">Move directly into collateral, mortgages, lease books, and loss analytics.</p>
            </div>
            <div className="lending-content-shell">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <NavCard icon={FileText} title="Collateral Register" description="Manage pledged assets, valuations, and lien status." path="/lending/collateral" badge={`${collateralCount}`} />
                <NavCard icon={Home} title="Mortgages" description="Residential and commercial mortgage portfolio." path="/lending/mortgages" badge={`${mortgageCount}`} />
                <NavCard icon={Car} title="Leases" description="Track leased assets and corporate lease contracts." path="/lending/leases" />
                <NavCard icon={GitBranch} title="Syndication" description="Monitor syndicated facilities and participant drawdowns." path="/lending/syndication" />
                <NavCard icon={CreditCard} title="POS Lending" description="Point-of-sale and buy-now-pay-later exposure." path="/lending/pos-loans" />
                <NavCard icon={BarChart3} title="ECL Dashboard" description="Expected credit loss analytics and stage migration." path="/lending/ecl" />
              </div>
            </div>
          </div>

          <div className="lending-workspace-shell">
            <div className="lending-workspace-banner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Priority Signals</p>
              <h2 className="mt-2 text-xl font-semibold">What deserves attention now</h2>
              <p className="mt-1 text-sm text-muted-foreground">A concise view of the current concentration of risk.</p>
            </div>
            <div className="lending-content-shell space-y-4">
              <div className="lending-note-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Highest DPD</p>
                <p className="mt-2 text-base font-semibold">{highestRiskLoan ? highestRiskLoan.customerName : 'No stressed loans detected'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {highestRiskLoan
                    ? `${highestRiskLoan.loanNumber} is ${highestRiskLoan.daysPastDue} days past due with ${formatMoney(highestRiskLoan.outstandingPrincipal)} outstanding.`
                    : 'The current portfolio feed does not show any watch-list loan above the alert threshold.'}
                </p>
              </div>

              <div className="lending-note-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Largest class</p>
                <p className="mt-2 text-base font-semibold">{classificationData[0]?.name ?? 'CURRENT'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {classificationData[0]
                    ? `${classificationData[0].value} loans classified here with ${formatMoney(classificationData[0].exposure)} exposure.`
                    : 'Classification insight becomes available once live loans are returned.'}
                </p>
              </div>

              <div className="lending-note-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Collections pressure</p>
                <p className="mt-2 text-base font-semibold">{watchList.length > 0 ? `${watchList.length} accounts queued` : 'Collections queue is clear'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {watchList.length > 0
                    ? `${formatMoney(watchListProvision)} is already provisioned against the current watch-list exposure.`
                    : 'No loans currently qualify for the watch list threshold.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
