import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { FixedDeposit } from '../api/fixedDepositApi';

interface Props {
  deposits: FixedDeposit[];
}

export function MaturingSoonTable({ deposits }: Props) {
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<FixedDeposit, unknown>[]>(() => [
    { accessorKey: 'fdNumber', header: 'FD #', cell: ({ row }) => (
      <button onClick={e => { e.stopPropagation(); navigate(`/accounts/fixed-deposits/${row.original.id}`); }}
        className="font-mono text-xs font-medium text-primary hover:underline">{row.original.fdNumber}</button>
    )},
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => <span className="text-sm">{row.original.customerName}</span> },
    { accessorKey: 'principalAmount', header: 'Principal', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.principalAmount, row.original.currency)}</span> },
    { accessorKey: 'interestRate', header: 'Rate', cell: ({ row }) => <span className="font-mono text-sm">{row.original.interestRate.toFixed(2)}%</span> },
    { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.maturityDate)}</span> },
    { id: 'daysLeft', header: 'Days Left', cell: ({ row }) => {
      const days = Math.ceil((new Date(row.original.maturityDate).getTime() - Date.now()) / 86400000);
      return <span className={cn('text-xs font-mono font-semibold', days <= 3 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : '')}>{days}d</span>;
    }},
    { accessorKey: 'maturityInstruction', header: 'Instruction', cell: ({ row }) => {
      const inst = row.original.maturityInstruction;
      const isManual = inst === 'MANUAL';
      return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          isManual ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          inst === 'LIQUIDATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')}>
          {inst.replace(/_/g, ' ')}
        </span>
      );
    }},
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        row.original.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
        row.original.status === 'MATURED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
        'bg-gray-100 text-gray-600')}>
        {row.original.status}
      </span>
    )},
  ], [navigate]);

  return (
    <DataTable columns={columns} data={deposits} enableGlobalFilter enableExport exportFilename="maturing-fds"
      emptyMessage="No deposits maturing in the next 30 days" pageSize={20}
      onRowClick={row => navigate(`/accounts/fixed-deposits/${row.id}`)} />
  );
}
