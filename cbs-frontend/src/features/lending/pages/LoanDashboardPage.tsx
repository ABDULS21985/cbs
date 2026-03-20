import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Landmark, AlertTriangle, TrendingUp, TrendingDown, Percent, Shield,
  FileText, Home, Car, GitBranch, CreditCard, BarChart3, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, SummaryBar } from '@/components/shared';
import { formatMoney, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import type { LoanAccount, PortfolioStats } from '../types/loan';

const CLASS_COLORS: Record<string, string> = {
  CURRENT: '#10b981', WATCHLIST: '#eab308', SUBSTANDARD: '#f97316', DOUBTFUL: '#ef4444', LOSS: '#dc2626',
};

const columns: ColumnDef<LoanAccount, unknown>[] = [
  { accessorKey: 'loanNumber', header: 'Loan #', cell: ({ row }) => <span className="font-mono text-sm text-primary">{row.original.loanNumber}</span> },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'productName', header: 'Product' },
  { accessorKey: 'outstandingPrincipal', header: 'Outstanding', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.outstandingPrincipal)}</span> },
  { accessorKey: 'daysPastDue', header: 'DPD', cell: ({ row }) => <span className={cn('font-mono text-sm font-medium', (row.original.daysPastDue || 0) > 60 ? 'text-red-600' : (row.original.daysPastDue || 0) > 0 ? 'text-amber-600' : '')}>{row.original.daysPastDue}</span> },
  { accessorKey: 'classification', header: 'Classification', cell: ({ row }) => <StatusBadge status={row.original.classification} /> },
  { accessorKey: 'provisionAmount', header: 'Provision', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.provisionAmount || 0)}</span> },
];

function NavCard({ icon: Icon, title, description, path, badge }: { icon: React.ElementType; title: string; description: string; path: string; badge?: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(path)} className="text-left bg-card rounded-lg border p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 rounded-lg bg-muted"><Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" /></div>
        {badge && <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>}
      </div>
      <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </button>
  );
}

export function LoanDashboardPage() {
  useEffect(() => { document.title = 'Loan Portfolio | CBS'; }, []);
  const navigate = useNavigate();

  const { data: allLoans = [], isLoading } = useQuery({
    queryKey: ['loans', 'all'],
    queryFn: () => apiGet<LoanAccount[]>('/api/v1/loans'),
    staleTime: 30_000,
  });

  const loans = Array.isArray(allLoans) ? allLoans : [];

  // Portfolio stats
  const stats = useMemo(() => {
    const active = loans.filter(l => l.status === 'ACTIVE');
    const totalOutstanding = active.reduce((s, l) => s + (l.outstandingPrincipal || 0), 0);
    const nplCount = active.filter(l => (l.daysPastDue || 0) > 90).length;
    const nplRatio = active.length > 0 ? (nplCount / active.length) * 100 : 0;
    const totalProvision = active.reduce((s, l) => s + (l.provisionAmount || 0), 0);
    const provisionCoverage = totalOutstanding > 0 ? (totalProvision / totalOutstanding) * 100 : 0;
    const avgDpd = active.length > 0 ? active.reduce((s, l) => s + (l.daysPastDue || 0), 0) / active.length : 0;
    return { totalOutstanding, activeCount: active.length, nplRatio, provisionCoverage, avgDpd, totalProvision };
  }, [loans]);

  // Classification breakdown for pie chart
  const classificationData = useMemo(() => {
    const map: Record<string, number> = {};
    loans.filter(l => l.status === 'ACTIVE').forEach(l => {
      const cls = l.classification || 'CURRENT';
      map[cls] = (map[cls] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value, color: CLASS_COLORS[name] || '#6b7280' }));
  }, [loans]);

  const watchList = useMemo(() => loans.filter(l => (l.daysPastDue || 0) >= 30), [loans]);

  // Counts for nav cards
  const mortgageCount = loans.filter(l => l.productName?.toLowerCase().includes('mortgage')).length;
  const collateralCount = loans.filter(l => l.status === 'ACTIVE').length; // approximate

  return (
    <>
      <PageHeader title="Loan Portfolio" subtitle="Lending command center — portfolio analytics, risk metrics, collections"
        actions={<button onClick={() => navigate('/lending/applications/new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="w-4 h-4" /> New Application</button>} />

      <div className="page-container space-y-6">
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Outstanding" value={stats.totalOutstanding} format="money" compact icon={Landmark} loading={isLoading} />
          <StatCard label="Active Loans" value={stats.activeCount} format="number" loading={isLoading} />
          <StatCard label="NPL Ratio" value={`${stats.nplRatio.toFixed(1)}%`} icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Disbursed MTD" value={0} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Collections MTD" value={0} format="money" compact icon={TrendingDown} loading={isLoading} />
        </div>

        {/* Portfolio Health */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between"><div className="stat-label">NPL Ratio</div><Percent className="w-4 h-4 text-muted-foreground/50" /></div>
            <div className={cn('stat-value font-mono', stats.nplRatio > 5 ? 'text-red-600' : 'text-green-600')}>{stats.nplRatio.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between"><div className="stat-label">Provision Coverage</div><Shield className="w-4 h-4 text-muted-foreground/50" /></div>
            <div className="stat-value font-mono">{stats.provisionCoverage.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg DPD</div>
            <div className={cn('stat-value font-mono', stats.avgDpd > 30 ? 'text-amber-600' : '')}>{stats.avgDpd.toFixed(0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Provisions</div>
            <div className="stat-value font-mono text-red-600">{formatMoney(stats.totalProvision)}</div>
          </div>
        </div>

        {/* Classification Chart + Quick Nav */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classification PieChart */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-sm font-semibold mb-4">Loan Classification</h3>
            {classificationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={classificationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {classificationData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Access</h3>
            <div className="grid grid-cols-2 gap-3">
              <NavCard icon={FileText} title="Collateral Register" description="Manage pledged assets and valuations" path="/lending/collateral" badge={`${collateralCount}`} />
              <NavCard icon={Home} title="Mortgages" description="Residential & commercial mortgages" path="/lending/mortgages" badge={`${mortgageCount}`} />
              <NavCard icon={Car} title="Leases" description="Asset leasing & corporate leases" path="/lending/leases" />
              <NavCard icon={GitBranch} title="Syndication" description="Syndicated loan facilities" path="/lending/syndication" />
              <NavCard icon={CreditCard} title="POS Lending" description="Point of sale financing" path="/lending/pos-loans" />
              <NavCard icon={BarChart3} title="ECL Dashboard" description="Expected credit loss analytics" path="/lending/ecl" />
            </div>
          </div>
        </div>

        {/* Watch List */}
        <div>
          <SummaryBar items={[
            { label: 'Watch List', value: watchList.length, format: 'number' },
            { label: 'Total Exposure', value: watchList.reduce((s, w) => s + (w.outstandingPrincipal || 0), 0), format: 'money', color: 'danger' },
            { label: 'Total Provision', value: watchList.reduce((s, w) => s + (w.provisionAmount || 0), 0), format: 'money', color: 'warning' },
          ]} />
          <div className="mt-2">
            <DataTable columns={columns} data={watchList} isLoading={isLoading} onRowClick={(row) => navigate(`/lending/${row.loanNumber}`)} enableGlobalFilter enableExport exportFilename="watch-list" />
          </div>
        </div>
      </div>
    </>
  );
}
