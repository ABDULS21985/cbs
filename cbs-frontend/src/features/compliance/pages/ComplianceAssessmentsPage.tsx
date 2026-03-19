import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck, AlertTriangle, ShieldCheck, Target } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { complianceApi, type Assessment } from '../api/complianceApi';

const columns: ColumnDef<Assessment, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Assessment Name',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'regulatorySource',
    header: 'Regulatory Source',
    cell: ({ getValue }) => (
      <span className="text-sm">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'period',
    header: 'Period',
    cell: ({ getValue }) => (
      <span className="text-xs font-mono">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'controlsAssessed',
    header: 'Controls',
    cell: ({ getValue }) => (
      <span className="text-sm text-center block">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'complianceScore',
    header: 'Score',
    cell: ({ getValue }) => {
      const score = Number(getValue());
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium">{score.toFixed(0)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'compliantCount',
    header: 'Compliant',
    cell: ({ getValue }) => (
      <span className="text-sm text-green-600 font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'nonCompliantCount',
    header: 'Non-Compliant',
    cell: ({ getValue }) => (
      <span className="text-sm text-red-600 font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{formatDate(String(getValue()))}</span>
    ),
  },
];

export function ComplianceAssessmentsPage() {
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['compliance', 'assessments'],
    queryFn: () => complianceApi.getAssessments(),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['compliance', 'stats'],
    queryFn: () => complianceApi.getStats(),
  });

  const anyLoading = isLoading || statsLoading;
  const totalControls = assessments.reduce((sum, a) => sum + a.controlsAssessed, 0);
  const avgScore =
    assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.complianceScore, 0) / assessments.length
      : 0;

  return (
    <>
      <PageHeader title="Compliance Assessments" subtitle="Regulatory compliance assessment tracking and scoring" />
      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Assessments"
            value={stats?.activeAssessments ?? assessments.length}
            format="number"
            icon={ClipboardCheck}
            loading={anyLoading}
          />
          <StatCard
            label="Avg Compliance Score"
            value={avgScore}
            format="percent"
            icon={Target}
            loading={anyLoading}
          />
          <StatCard
            label="Open Gaps"
            value={stats?.openGaps ?? 0}
            format="number"
            icon={AlertTriangle}
            loading={anyLoading}
          />
          <StatCard
            label="Overall Score"
            value={stats?.complianceScore ?? 0}
            format="percent"
            icon={ShieldCheck}
            loading={anyLoading}
          />
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={assessments}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="compliance-assessments"
          emptyMessage="No assessments found"
          pageSize={15}
        />
      </div>
    </>
  );
}
