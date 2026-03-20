import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RDInstallment } from '../../api/goalApi';

const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DUE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UPCOMING: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SCHEDULED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface InstallmentScheduleTableProps {
  installments: RDInstallment[];
  currency?: string;
  onPayInstallment?: (installmentNumber: number) => void;
}

export function InstallmentScheduleTable({ installments, currency = 'NGN', onPayInstallment }: InstallmentScheduleTableProps) {
  const columns: ColumnDef<RDInstallment, unknown>[] = [
    { accessorKey: 'installmentNumber', header: '#', cell: ({ row }) => <span className="text-muted-foreground text-sm tabular-nums">#{row.original.installmentNumber}</span> },
    { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dueDate)}</span> },
    { accessorKey: 'amountDue', header: 'Amount', cell: ({ row }) => <span className="tabular-nums font-medium font-mono text-sm">{formatMoney(row.original.amountDue, currency)}</span> },
    {
      accessorKey: 'paidDate', header: 'Paid Date',
      cell: ({ row }) => row.original.paidDate ? <span className="text-sm text-green-600">{formatDate(row.original.paidDate)}</span> : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'penaltyAmount', header: 'Penalty',
      cell: ({ row }) => row.original.penaltyAmount > 0 ? <span className="text-red-600 font-mono text-sm">{formatMoney(row.original.penaltyAmount, currency)}</span> : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => {
        const status = row.original.overdue ? 'OVERDUE' : row.original.status;
        return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLORS[status] ?? STATUS_COLORS.UPCOMING)}>{status}</span>;
      },
    },
    ...(onPayInstallment ? [{
      id: 'actions' as const,
      header: '' as const,
      cell: ({ row }: { row: { original: RDInstallment } }) => {
        const inst = row.original;
        if (inst.status === 'PAID') return null;
        if (!inst.overdue && inst.status !== 'DUE') return null;
        const total = inst.amountDue + (inst.penaltyAmount ?? 0);
        return (
          <button onClick={() => onPayInstallment(inst.installmentNumber)}
            className="px-2 py-1 text-[10px] font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">
            Pay {formatMoney(total, currency)}
          </button>
        );
      },
    } as ColumnDef<RDInstallment, unknown>] : []),
  ];

  return <DataTable columns={columns} data={installments} pageSize={12} emptyMessage="No installments" />;
}
