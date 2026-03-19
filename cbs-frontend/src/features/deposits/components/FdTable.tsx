import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, MoneyDisplay, StatusBadge } from '@/components/shared';
import { formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FixedDeposit } from '../api/fixedDepositApi';

interface FdTableProps {
  data: FixedDeposit[];
  isLoading?: boolean;
}

const INSTRUCTION_LABELS: Record<string, string> = {
  ROLLOVER_ALL: 'Auto-Rollover (All)',
  ROLLOVER_PRINCIPAL: 'Auto-Rollover (Principal)',
  LIQUIDATE: 'Liquidate',
  MANUAL: 'Manual',
};

function isWithin7Days(dateStr: string): boolean {
  const today = new Date();
  const mat = new Date(dateStr);
  const diffMs = mat.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

export function FdTable({ data, isLoading }: FdTableProps) {
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<FixedDeposit, any>[]>(() => [
    {
      accessorKey: 'fdNumber',
      header: 'FD #',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-medium">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium">{row.original.customerName}</div>
          <div className="text-xs text-muted-foreground font-mono">{row.original.sourceAccountNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: 'principalAmount',
      header: 'Amount',
      cell: ({ getValue, row }) => (
        <MoneyDisplay amount={getValue<number>()} currency={row.original.currency} size="sm" />
      ),
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'interestRate',
      header: 'Rate',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{formatPercent(getValue<number>())}</span>
      ),
    },
    {
      accessorKey: 'tenor',
      header: 'Tenor',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<number>()} days</span>
      ),
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ getValue }) => (
        <span className="text-sm">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      accessorKey: 'maturityDate',
      header: 'Maturity Date',
      cell: ({ getValue, row }) => {
        const dateStr = getValue<string>();
        const soon = row.original.status === 'ACTIVE' && isWithin7Days(dateStr);
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn('text-sm', soon && 'text-red-600 font-medium dark:text-red-400')}>
              {formatDate(dateStr)}
            </span>
            {soon && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Maturing Soon
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'maturityInstruction',
      header: 'Instruction',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{INSTRUCTION_LABELS[getValue<string>()] ?? getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} dot />,
    },
  ], []);

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      enableGlobalFilter
      enableColumnVisibility
      onRowClick={(row) => navigate(`/accounts/fixed-deposits/${row.id}`)}
      emptyMessage="No fixed deposits found"
    />
  );
}
