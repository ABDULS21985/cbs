import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Briefcase, TrendingUp, DollarSign, Users } from 'lucide-react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { advisoryApi, type CorporateFinanceEngagement, type ProjectFacility, type TaxAdvisoryEngagement } from '../api/advisoryApi';
import type { MaEngagement } from '../types/maAdvisory';
import { QK } from '../hooks/useAdvisory';
import { formatMoney } from '@/lib/formatters';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// ─── Column definitions ───────────────────────────────────────────────────────

// M&A Advisory — real entity fields
const maCols: ColumnDef<MaEngagement, any>[] = [
  {
    accessorKey: 'engagementCode',
    header: 'Code',
    cell: ({ row }) => (
      <Link
        to={`/advisory/ma`}
        className="font-mono text-xs text-primary hover:underline"
      >
        {row.original.engagementCode}
      </Link>
    ),
  },
  { accessorKey: 'clientName', header: 'Client' },
  { accessorKey: 'targetName', header: 'Target', cell: ({ row }) => row.original.targetName || '—' },
  {
    accessorKey: 'engagementType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.engagementType} />,
  },
  {
    accessorKey: 'estimatedDealValue',
    header: 'Est. Value',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.estimatedDealValue
          ? formatMoney(row.original.estimatedDealValue, row.original.transactionCurrency)
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

// Corporate Finance — matches CorporateFinanceEngagement entity
const cfCols: ColumnDef<CorporateFinanceEngagement, any>[] = [
  {
    accessorKey: 'engagementCode',
    header: 'Code',
    cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.engagementCode}</span>,
  },
  { accessorKey: 'clientName', header: 'Client' },
  {
    accessorKey: 'engagementType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.engagementType} />,
  },
  {
    accessorKey: 'dealValueEstimate',
    header: 'Deal Value',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.dealValueEstimate ? formatMoney(row.original.dealValueEstimate, row.original.currency) : '—'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

// Project Finance — matches ProjectFinanceFacility entity
const pfCols: ColumnDef<ProjectFacility, any>[] = [
  {
    accessorKey: 'facilityCode',
    header: 'Code',
    cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.facilityCode}</span>,
  },
  { accessorKey: 'projectName', header: 'Project' },
  { accessorKey: 'borrowerName', header: 'Borrower' },
  {
    accessorKey: 'totalProjectCost',
    header: 'Total Cost',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.totalProjectCost, row.original.currency)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
];

// Tax Advisory — real entity fields
const taxCols: ColumnDef<TaxAdvisoryEngagement, any>[] = [
  {
    accessorKey: 'engagementCode',
    header: 'Code',
    cell: ({ row }) => (
      <Link to="/advisory/tax" className="font-mono text-xs text-primary hover:underline">
        {row.original.engagementCode}
      </Link>
    ),
  },
  { accessorKey: 'clientName', header: 'Client' },
  {
    accessorKey: 'engagementType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.engagementType} />,
  },
  {
    accessorKey: 'advisoryFee',
    header: 'Advisory Fee',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.advisoryFee ? formatMoney(row.original.advisoryFee) : '—'}
      </span>
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
  const now = new Date();
  const fromYtd = `${now.getFullYear()}-01-01`;
  const toYtd = now.toISOString().slice(0, 10);

  const { data: maMandates = [], isLoading: maLoading } = useQuery({
    queryKey: QK.maActive,
    queryFn: () => advisoryApi.getMaAdvisoryActive(),
  });
  const { data: maWorkload = {} } = useQuery({
    queryKey: QK.maWorkload,
    queryFn: () => advisoryApi.getMaAdvisoryWorkload(),
  });
  const { data: maRevenue = 0 } = useQuery({
    queryKey: QK.maRevenue(fromYtd, toYtd),
    queryFn: () => advisoryApi.getMaAdvisoryRevenue(fromYtd, toYtd),
  });
  const { data: maPipeline = {} } = useQuery({
    queryKey: QK.maPipeline,
    queryFn: () => advisoryApi.getMaAdvisoryPipeline(),
  });
  const { data: cfMandates = [], isLoading: cfLoading } = useQuery({
    queryKey: QK.corporateFinanceActive,
    queryFn: () => advisoryApi.getCorporateFinanceActive(),
    retry: false,
  });
  const { data: pfFacilities = [], isLoading: pfLoading } = useQuery({
    queryKey: QK.projectFacilitiesAll,
    queryFn: () => advisoryApi.getAllProjectFacilities(),
    retry: false,
  });
  const { data: taxEngagements = [], isLoading: taxLoading } = useQuery({
    queryKey: QK.taxActive,
    queryFn: () => advisoryApi.getTaxAdvisoryActive(),
  });

  const activeMandates = maMandates.length + cfMandates.length + taxEngagements.length;
  const maPipelineValue = maMandates.reduce((s, m) => s + (m.estimatedDealValue || 0), 0);
  const cfPipelineValue = cfMandates.reduce((s, m) => s + (m.dealValueEstimate || 0), 0);

  // M&A pipeline chart: status → count from backend Map<String,Long>
  const pipelineChartData = Object.entries(maPipeline).map(([status, count]) => ({ status, count }));

  // M&A workload: banker → count from backend Map<String,Long>
  const workloadEntries = Object.entries(maWorkload);

  // Tax engagements by type
  const taxByType: Record<string, number> = {};
  for (const e of taxEngagements) {
    taxByType[e.engagementType] = (taxByType[e.engagementType] || 0) + 1;
  }
  const taxChartData = Object.entries(taxByType).map(([type, count]) => ({ type, count }));

  return (
    <>
      <PageHeader
        title="Advisory Services"
        subtitle="M&A, Corporate Finance, Project Finance & Tax Advisory hub"
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
            label="M&A Pipeline Value"
            value={maPipelineValue + cfPipelineValue}
            format="money"
            compact
            icon={DollarSign}
            loading={cfLoading || maLoading}
          />
          <StatCard
            label="M&A Revenue YTD"
            value={maRevenue}
            format="money"
            compact
            icon={TrendingUp}
          />
          <StatCard
            label="Active Bankers"
            value={workloadEntries.length}
            format="number"
            icon={Users}
          />
        </div>

        {/* M&A Pipeline chart */}
        {pipelineChartData.length > 0 && (
          <div className="surface-card p-4">
            <h3 className="text-sm font-semibold mb-4">M&A Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" name="Engagements" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabbed content */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'ma-advisory',
              label: 'M&A Advisory',
              badge: maMandates.length || undefined,
              content: (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/advisory/ma"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Manage all M&A engagements <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {/* Workload per banker */}
                  {workloadEntries.length > 0 && (
                    <div className="surface-card p-4">
                      <h4 className="text-sm font-semibold mb-3">Lead Banker Workload</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {workloadEntries.map(([banker, count]) => (
                          <div key={banker} className="flex items-center gap-3 p-3 rounded-lg border">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{banker}</p>
                              <p className="text-xs text-muted-foreground">{count} active engagement{count !== 1 ? 's' : ''}</p>
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
                    exportFilename="ma-advisory-active"
                    emptyMessage="No active M&A mandates"
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
                  <div className="flex items-center justify-between">
                    <Link
                      to="/advisory/tax"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Manage all tax engagements <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {taxChartData.length > 0 && (
                    <div className="surface-card p-4">
                      <h4 className="text-sm font-semibold mb-3">Engagements by Type</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={taxChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
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
                    exportFilename="tax-advisory-active"
                    emptyMessage="No active tax engagements"
                  />
                </div>
              ),
            },
            {
              id: 'corporate-finance',
              label: 'Corporate Finance',
              badge: cfMandates.length || undefined,
              content: (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Link
                      to="/advisory/corporate-finance"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Manage corporate finance mandates <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <DataTable
                    columns={cfCols}
                    data={cfMandates}
                    isLoading={cfLoading}
                    enableGlobalFilter
                    enableExport
                    exportFilename="corporate-finance-mandates"
                    emptyMessage="No active corporate finance mandates"
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
                  <div className="flex items-center justify-between">
                    <Link
                      to="/advisory/project-finance"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Manage project facilities <ChevronRight className="w-3 h-3" />
                    </Link>
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
          ]}
        />
      </div>
    </>
  );
}
