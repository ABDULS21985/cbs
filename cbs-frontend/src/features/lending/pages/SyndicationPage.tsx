import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, TabsPage } from '@/components/shared';
import { syndicationApi, type SyndicatedLoan, type ProjectFinance } from '../api/syndicationApi';
import { formatMoney, formatPercent } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import { Landmark, Users, TrendingUp, Building2 } from 'lucide-react';

const synCols: ColumnDef<SyndicatedLoan, any>[] = [
  { accessorKey: 'facilityRef', header: 'Facility #', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.facilityRef}</span> },
  { accessorKey: 'borrowerName', header: 'Borrower' },
  { accessorKey: 'totalFacility', header: 'Total', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalFacility, row.original.currency)}</span> },
  { accessorKey: 'ourShare', header: 'Our Share', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.ourShare, row.original.currency)}</span> },
  { accessorKey: 'ourSharePct', header: 'Share %', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.ourSharePct)}</span> },
  { accessorKey: 'role', header: 'Role', cell: ({ row }) => <StatusBadge status={row.original.role} /> },
  { accessorKey: 'participantCount', header: 'Participants' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const projCols: ColumnDef<ProjectFinance, any>[] = [
  { accessorKey: 'projectRef', header: 'Project #', cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.original.projectRef}</span> },
  { accessorKey: 'projectName', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.projectName}</span> },
  { accessorKey: 'sector', header: 'Sector' },
  { accessorKey: 'totalFacility', header: 'Facility', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.totalFacility)}</span> },
  { accessorKey: 'drawn', header: 'Drawn', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.drawn)}</span> },
  { accessorKey: 'milestonePhase', header: 'Phase', cell: ({ row }) => <StatusBadge status={row.original.milestonePhase || 'PENDING'} /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function SyndicationPage() {
  const { data: loans = [], isLoading: loansLoading } = useQuery({ queryKey: ['syndication', 'loans'], queryFn: () => syndicationApi.getSyndicatedLoans() });
  const { data: projects = [], isLoading: projLoading } = useQuery({ queryKey: ['syndication', 'projects'], queryFn: () => syndicationApi.getProjects() });

  const totalExposure = loans.reduce((s, l) => s + (l.ourShare || 0), 0);

  return (
    <>
      <PageHeader title="Syndicated Loans & Project Finance" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Syndicated Loans" value={loans.length} format="number" icon={Users} loading={loansLoading} />
          <StatCard label="Our Exposure" value={totalExposure} format="money" compact icon={Landmark} loading={loansLoading} />
          <StatCard label="Projects" value={projects.length} format="number" icon={Building2} loading={projLoading} />
          <StatCard label="Total Project Facilities" value={projects.reduce((s, p) => s + (p.totalFacility || 0), 0)} format="money" compact icon={TrendingUp} loading={projLoading} />
        </div>

        <TabsPage syncWithUrl tabs={[
          { id: 'syndicated', label: 'Syndicated Loans', badge: loans.length || undefined, content: (
            <div className="p-4"><DataTable columns={synCols} data={loans} isLoading={loansLoading} enableGlobalFilter enableExport exportFilename="syndicated-loans" emptyMessage="No syndicated loans found" /></div>
          )},
          { id: 'projects', label: 'Project Finance', badge: projects.length || undefined, content: (
            <div className="p-4"><DataTable columns={projCols} data={projects} isLoading={projLoading} enableGlobalFilter enableExport exportFilename="project-finance" emptyMessage="No project finance deals found" /></div>
          )},
        ]} />
      </div>
    </>
  );
}
