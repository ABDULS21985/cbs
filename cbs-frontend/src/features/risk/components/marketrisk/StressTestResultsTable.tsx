import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney } from '@/lib/formatters';
import type { StressTestResult } from '../../api/marketRiskApi';

const severityColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700', SEVERE: 'bg-red-100 text-red-700',
};

const columns: ColumnDef<StressTestResult, any>[] = [
  { accessorKey: 'scenario', header: 'Scenario', cell: ({ row }) => <span className="font-medium text-sm">{row.original.scenario}</span> },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="text-xs">{row.original.type}</span> },
  { accessorKey: 'pnlImpact', header: 'P&L Impact', cell: ({ row }) => <span className="font-mono text-xs text-red-600">{formatMoney(row.original.pnlImpact, 'NGN')}</span> },
  { accessorKey: 'capitalImpact', header: 'Capital Impact', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.capitalImpact, 'NGN')}</span> },
  { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[row.original.severity]}`}>{row.original.severity}</span>
  )},
];

interface Props { data: StressTestResult[] }

export function StressTestResultsTable({ data }: Props) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Stress Testing Results</h3>
      <DataTable columns={columns} data={data} emptyMessage="No stress tests" pageSize={10} />
    </div>
  );
}
