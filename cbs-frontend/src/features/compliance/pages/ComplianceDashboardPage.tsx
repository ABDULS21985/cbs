import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GapRegisterTable } from '../components/compliance/GapRegisterTable';
import { GapAgingChart } from '../components/compliance/GapAgingChart';
import { PolicyLibraryTree } from '../components/compliance/PolicyLibraryTree';
import { complianceApi, type Assessment, type AuditFinding } from '../api/complianceApi';

const assessmentColumns: ColumnDef<Assessment, any>[] = [
  { accessorKey: 'name', header: 'Assessment' },
  { accessorKey: 'regulatorySource', header: 'Source' },
  { accessorKey: 'period', header: 'Period' },
  { accessorKey: 'controlsAssessed', header: 'Controls' },
  { accessorKey: 'complianceScore', header: 'Score', cell: ({ row }) => <span className={`font-mono text-xs font-semibold ${row.original.complianceScore >= 80 ? 'text-green-600' : row.original.complianceScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{row.original.complianceScore}%</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const findingColumns: ColumnDef<AuditFinding, any>[] = [
  { accessorKey: 'findingRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.findingRef}</span> },
  { accessorKey: 'auditName', header: 'Audit' },
  { accessorKey: 'finding', header: 'Finding', cell: ({ row }) => <span className="text-xs truncate max-w-[250px] block">{row.original.finding}</span> },
  { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => <StatusBadge status={row.original.severity} /> },
  { accessorKey: 'owner', header: 'Owner' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

export function ComplianceDashboardPage() {
  const [tab, setTab] = useState<'assessments' | 'gaps' | 'remediation' | 'policies' | 'findings'>('assessments');

  const { data: stats } = useQuery({ queryKey: ['compliance', 'stats'], queryFn: () => complianceApi.getStats() });
  const { data: assessments = [] } = useQuery({ queryKey: ['compliance', 'assessments'], queryFn: () => complianceApi.getAssessments() });
  const { data: gaps = [], isLoading: gapsLoading } = useQuery({ queryKey: ['compliance', 'gaps'], queryFn: () => complianceApi.getGaps() });
  const { data: policies = [] } = useQuery({ queryKey: ['compliance', 'policies'], queryFn: () => complianceApi.getPolicies() });
  const { data: findings = [] } = useQuery({ queryKey: ['compliance', 'findings'], queryFn: () => complianceApi.getAuditFindings() });

  const statCards = stats ? [
    { label: 'Active Assessments', value: String(stats.activeAssessments) },
    { label: 'Open Gaps', value: String(stats.openGaps) },
    { label: 'Critical Gaps', value: String(stats.criticalGaps), warn: stats.criticalGaps > 0 },
    { label: 'Overdue Remediations', value: String(stats.overdueRemediations), warn: stats.overdueRemediations > 0 },
    { label: 'Compliance Score', value: `${stats.complianceScore}%`, ok: stats.complianceScore >= 80 },
  ] : [];

  const tabs = [
    { key: 'assessments' as const, label: 'Assessments' },
    { key: 'gaps' as const, label: 'Gap Register' },
    { key: 'remediation' as const, label: 'Remediation' },
    { key: 'policies' as const, label: 'Policy Library' },
    { key: 'findings' as const, label: 'Audit Findings' },
  ];

  return (
    <>
      <PageHeader title="Compliance & Governance" subtitle="Assessments, gap tracking, policy library" />
      <div className="page-container space-y-6">
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.warn ? 'text-red-600' : s.ok ? 'text-green-600' : ''}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 border-b overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'assessments' && <DataTable columns={assessmentColumns} data={assessments} enableGlobalFilter emptyMessage="No assessments" />}
        {tab === 'gaps' && (
          <div className="space-y-6">
            <GapAgingChart gaps={gaps} />
            <GapRegisterTable data={gaps} isLoading={gapsLoading} />
          </div>
        )}
        {tab === 'remediation' && (
          <div className="space-y-4">
            {gaps.filter((g) => ['REMEDIATION_PLANNED', 'IN_PROGRESS'].includes(g.status)).map((gap) => {
              const overdue = new Date(gap.remediationTargetDate) < new Date() && !gap.remediationActualDate;
              return (
                <div key={gap.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{gap.analysisCode} — {gap.requirementRef}</p>
                    <p className="text-xs text-muted-foreground">{gap.remediationOwner} · Target: {gap.remediationTargetDate}</p>
                  </div>
                  <StatusBadge status={overdue ? 'OVERDUE' : gap.status} dot />
                </div>
              );
            })}
          </div>
        )}
        {tab === 'policies' && <PolicyLibraryTree policies={policies} />}
        {tab === 'findings' && <DataTable columns={findingColumns} data={findings} enableGlobalFilter emptyMessage="No audit findings" />}
      </div>
    </>
  );
}
