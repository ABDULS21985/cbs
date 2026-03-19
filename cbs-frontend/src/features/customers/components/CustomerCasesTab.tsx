import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { usePermission } from '@/hooks/usePermission';
import { useCustomerCases } from '../hooks/useCustomers';
import type { CustomerCase } from '../types/customer';
import { Plus } from 'lucide-react';

const PRIORITY_CLASSES: Record<string, string> = {
  CRITICAL: 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'text-orange-700 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
};

export function CustomerCasesTab({ customerId, active }: { customerId: number; active: boolean }) {
  const navigate = useNavigate();
  const canCreate = usePermission('cases', 'create');
  const { data: cases, isLoading } = useCustomerCases(customerId, active);

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
      accessorKey: 'slaDeadline',
      header: 'SLA',
      cell: ({ row }) =>
        row.original.slaDeadline ? (
          <span className="text-xs">{formatDate(row.original.slaDeadline)}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }) => <span className="text-xs">{row.original.assignedTo ?? '—'}</span>,
    },
    { accessorKey: 'openedAt', header: 'Opened', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.openedAt)}</span> },
  ];

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/cases/new?customerId=${customerId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Case
          </button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={cases ?? []}
        isLoading={isLoading}
        onRowClick={row => navigate(`/cases/${row.id}`)}
        emptyMessage="No cases found for this customer"
      />
    </div>
  );
}
