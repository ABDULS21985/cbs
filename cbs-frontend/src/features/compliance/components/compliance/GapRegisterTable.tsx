import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/formatters';
import type { ComplianceGap } from '../../api/complianceApi';

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700', MAJOR: 'bg-orange-100 text-orange-700',
  MINOR: 'bg-amber-100 text-amber-700', OBSERVATION: 'bg-blue-100 text-blue-700',
};

const columns: ColumnDef<ComplianceGap, any>[] = [
  { accessorKey: 'analysisCode', header: 'Gap #', cell: ({ row }) => <span className="font-mono text-xs">{row.original.analysisCode}</span> },
  { accessorKey: 'assessmentName', header: 'Assessment' },
  { accessorKey: 'requirementRef', header: 'Requirement', cell: ({ row }) => <span className="text-xs">{row.original.requirementRef}</span> },
  { accessorKey: 'gapSeverity', header: 'Severity', cell: ({ row }) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[row.original.gapSeverity]}`}>{row.original.gapSeverity}</span> },
  { accessorKey: 'gapCategory', header: 'Category', cell: ({ row }) => <span className="text-xs">{row.original.gapCategory}</span> },
  { accessorKey: 'remediationOwner', header: 'Owner' },
  { accessorKey: 'remediationTargetDate', header: 'Target', cell: ({ row }) => formatDate(row.original.remediationTargetDate) },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  { accessorKey: 'ageDays', header: 'Age', cell: ({ row }) => <span className="font-mono text-xs">{row.original.ageDays}d</span> },
];

interface Props { data: ComplianceGap[]; isLoading?: boolean }

export function GapRegisterTable({ data, isLoading }: Props) {
  return <DataTable columns={columns} data={data} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="compliance-gaps" />;
}
