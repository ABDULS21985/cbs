import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTable, StatusBadge } from '@/components/shared';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/formatters';
import { useCustomerCases } from '../hooks/useCustomers';
import type { CustomerCase } from '../types/customer';

const PRIORITY_CLASSES: Record<string, string> = {
  CRITICAL: 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
};

export function CustomerCasesTab({
  customerId,
  customerName,
  active,
}: {
  customerId: number;
  customerName?: string;
  active: boolean;
}) {
  const navigate = useNavigate();
  const canCreateCase = usePermission('cases', 'create');
  const { data: cases, isLoading } = useCustomerCases(customerId, active);
  const createCaseQuery = new URLSearchParams({
    customerId: String(customerId),
    ...(customerName ? { customerName } : {}),
  }).toString();

  const columns: ColumnDef<CustomerCase>[] = [
    {
      accessorKey: 'caseNumber',
      header: 'Case #',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.caseNumber}</span>,
    },
    { accessorKey: 'caseType', header: 'Type', cell: ({ row }) => <span className="text-sm">{row.original.caseType}</span> },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_CLASSES[row.original.priority] ?? PRIORITY_CLASSES.LOW}`}>
          {row.original.priority}
        </span>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot /> },
    {
      accessorKey: 'slaDueAt',
      header: 'SLA',
      cell: ({ row }) =>
        row.original.slaDueAt ? (
          <span className="text-xs">{formatDate(row.original.slaDueAt)}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }) => <span className="text-xs">{row.original.assignedTo ?? '—'}</span>,
    },
    { accessorKey: 'openedAt', header: 'Opened', cell: ({ row }) => <span className="text-xs">{row.original.openedAt ? formatDate(row.original.openedAt) : '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Customer Cases</p>
          <p className="text-xs text-muted-foreground">Open a case to continue the workflow, or create a new case for this customer.</p>
        </div>
        {canCreateCase && (
          <button
            type="button"
            onClick={() => navigate(`/cases/new?${createCaseQuery}`)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Case
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={cases ?? []}
        isLoading={isLoading}
        onRowClick={(customerCase) => navigate(`/cases/${customerCase.caseNumber}`)}
        emptyMessage="No cases found for this customer"
      />
    </div>
  );
}
