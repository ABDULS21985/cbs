import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Briefcase, TrendingUp, DollarSign, Users } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { advisoryApi } from '../api/advisoryApi';
import type {
  CorporateFinanceEngagement,
  MaEngagement,
  ProjectFacility,
  TaxEngagement,
} from '../api/advisoryApi';
import { formatMoney, formatDate } from '@/lib/formatters';

// ─── Column definitions ───────────────────────────────────────────────────────

const cfCols: ColumnDef<CorporateFinanceEngagement, any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary">{row.original.code}</span>
    ),
  },
  { accessorKey: 'client', header: 'Client' },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.type} />,
  },
  {
    accessorKey: 'estimatedFee',
    header: 'Est. Fee',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.estimatedFee, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => <StatusBadge status={row.original.stage} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

const maCols: ColumnDef<MaEngagement, any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary">{row.original.code}</span>
    ),
  },
  { accessorKey: 'buyer', header: 'Buyer' },
  { accessorKey: 'target', header: 'Target' },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.transactionType} />,
  },
  {
    accessorKey: 'estimatedValue',
    header: 'Est. Value',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.estimatedValue, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => <StatusBadge status={row.original.stage} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

const pfCols: ColumnDef<ProjectFacility, any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary">{row.original.code}</span>
    ),
  },
  { accessorKey: 'projectName', header: 'Project' },
  {
    accessorKey: 'sector',
    header: 'Sector',
    cell: ({ row }) => <StatusBadge status={row.original.sector} />,
  },
  { accessorKey: 'sponsor', header: 'Sponsor' },
  {
    accessorKey: 'totalCost',
    header: 'Total Cost',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.totalCost, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'milestonesCompleted',
    header: 'Milestones',
    cell: ({ row }) => {
      const { milestonesCompleted, milestonesTotal } = row.original;
      const pct = milestonesTotal > 0 ? Math.round((milestonesCompleted / milestonesTotal) * 100) : 0;
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1.5 w-20">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{milestonesCompleted}/{milestonesTotal}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

const taxCols: ColumnDef<TaxEngagement, any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-primary">{row.original.code}</span>
    ),
  },
  { accessorKey: 'client', header: 'Client' },
  { accessorKey: 'jurisdiction', header: 'Jurisdiction' },
  {
    accessorKey: 'serviceType',
    header: 'Service',
    cell: ({ row }) => <StatusBadge status={row.original.serviceType} />,
  },
  {
    accessorKey: 'estimatedFee',
    header: 'Est. Fee',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.estimatedFee, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

// ─── Page component ───────────────────────────────────────────────────────────

export function AdvisoryDashboardPage() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  void showNewDialog;

  const now = new Date();
  const fromYtd = `${now.getFullYear()}-01-01`;
  const toYtd = now.toISOString().slice(0, 10);

  const { data: cfMandates = [], isLoading: cfLoading } = useQuery({
    queryKey: ['advisory', 'corporate-finance', 'active'],
    queryFn: () => advisoryApi.getCorporateFinanceActive(),
  });
  const { data: cfRevenue = [] } = useQuery({
    queryKey: ['advisory', 'corporate-finance', 'revenue', fromYtd, toYtd],
    queryFn: () => advisoryApi.getCorporateFinanceRevenue(fromYtd, toYtd),
  });
  const { data: maMandates = [], isLoading: maLoading } = useQuery({
    queryKey: ['advisory', 'ma-advisory', 'active'],
    queryFn: () => advisoryApi.getMaAdvisoryActive(),
  });
  const { data: maWorkload = [] } = useQuery({
    queryKey: ['advisory', 'ma-advisory', 'workload'],
    queryFn: () => advisoryApi.getMaAdvisoryWorkload(),
  });
  const { data: pfFacilities = [], isLoading: pfLoading } = useQuery({
    queryKey: ['advisory', 'project-finance', 'facilities', 'ACTIVE'],
    queryFn: () => advisoryApi.getProjectFacilities('ACTIVE'),
  });
  const { data: taxEngagements = [], isLoading: taxLoading } = useQuery({
    queryKey: ['advisory', 'tax-advisory', 'active'],
    queryFn: () => advisoryApi.getTaxAdvisoryActive(),
  });

  const activeMandates = cfMandates.length + maMandates.length + taxEngagements.length;
  const pipelineValue = cfMandates.reduce((s, m) => s + (m.estimatedFee || 0), 0)
    + maMandates.reduce((s, m) => s + (m.estimatedValue || 0), 0);
  const revenueYtd = cfRevenue.reduce((s, r) => s + (r.revenue || 0), 0);
  const avgUtilization =
    maWorkload.length > 0
      ? maWorkload.reduce((s, w) => s + (w.utilizationPct || 0), 0) / maWorkload.length
      : 0;

  // Revenue trend – merge CF + MA revenue by period
  const revenueByPeriod: Record<string, { period: string; cfRevenue: number; maRevenue: number }> = {};
  for (const r of cfRevenue) {
    revenueByPeriod[r.period] = { period: r.period, cfRevenue: r.revenue, maRevenue: 0 };
  }
  const revenueTrend = Object.values(revenueByPeriod).slice(-12);

  // Tax engagements by service type
  const taxByType: Record<string, number> = {};
  for (const e of taxEngagements) {
    taxByType[e.serviceType] = (taxByType[e.serviceType] || 0) + 1;
  }
  const taxChartData = Object.entries(taxByType).map(([type, count]) => ({ type, count }));

  return (
    <>
      <PageHeader
        title="Advisory Services"
        subtitle="Corporate Finance, M&A, Project Finance & Tax Advisory hub"
      />
      <div className="page-container space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Mandates"
            value={activeMandates}
            format="number"
            icon={Briefcase}
            loading={cfLoading || maLoading || taxLoading}
          />
          <StatCard
            label="Pipeline Value"
            value={pipelineValue}
            format="money"
            compact
            icon={DollarSign}
            loading={cfLoading || maLoading}
          />
          <StatCard
            label="Revenue YTD"
            value={revenueYtd}
            format="money"
            compact
            icon={TrendingUp}
          />
          <StatCard
            label="Team Utilization"
            value={avgUtilization}
            format="percent"
            icon={Users}
          />
        </div>

        {/* Revenue Trend */}
        {revenueTrend.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => formatMoney(v)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend />
                <Line type="monotone" dataKey="cfRevenue" name="Corp Finance" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="maRevenue" name="M&A" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabbed content */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'corporate-finance',
              label: 'Corporate Finance',
              badge: cfMandates.length || undefined,
              content: (
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowNewDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4" /> New +
                    </button>
                  </div>
                  <DataTable
                    columns={cfCols}
                    data={cfMandates}
                    isLoading={cfLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename="corporate-finance-mandates"
                    emptyMessage="No active mandates"
                  />
                </div>
              ),
            },
            {
              id: 'ma-advisory',
              label: 'M&A Advisory',
              badge: maMandates.length || undefined,
              content: (
                <div className="p-4 space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowNewDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4" /> New +
                    </button>
                  </div>
                  {/* Workload per banker */}
                  {maWorkload.length > 0 && (
                    <div className="rounded-xl border bg-card p-4">
                      <h4 className="text-sm font-semibold mb-3">Banker Workload</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {maWorkload.map((w) => (
                          <div key={w.banker} className="flex items-center gap-3 p-3 rounded-lg border">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{w.banker}</p>
                              <p className="text-xs text-muted-foreground">{w.activeEngagements} engagements</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono font-semibold">{w.utilizationPct.toFixed(0)}%</p>
                              <div className="w-16 bg-muted rounded-full h-1.5 mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${w.utilizationPct >= 90 ? 'bg-red-500' : w.utilizationPct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(w.utilizationPct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <DataTable
                    columns={maCols}
                    data={maMandates}
                    isLoading={maLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename="ma-advisory-mandates"
                    emptyMessage="No active M&A mandates"
                  />
                </div>
              ),
            },
            {
              id: 'project-finance',
              label: 'Project Finance',
              badge: pfFacilities.length || undefined,
              content: (
                <div className="p-4 space-y-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowNewDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4" /> New +
                    </button>
                  </div>
                  <DataTable
                    columns={pfCols}
                    data={pfFacilities}
                    isLoading={pfLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename="project-facilities"
                    emptyMessage="No active project facilities"
                  />
                </div>
              ),
            },
            {
              id: 'tax-advisory',
              label: 'Tax Advisory',
              badge: taxEngagements.length || undefined,
              content: (
                <div className="p-4 space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowNewDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4" /> New +
                    </button>
                  </div>
                  {taxChartData.length > 0 && (
                    <div className="rounded-xl border bg-card p-4">
                      <h4 className="text-sm font-semibold mb-3">Engagements by Service Type</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={taxChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="count" name="Engagements" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <DataTable
                    columns={taxCols}
                    data={taxEngagements}
                    isLoading={taxLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename="tax-advisory-engagements"
                    emptyMessage="No active tax engagements"
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
