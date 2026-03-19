import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Home, Car, Wrench, Banknote, TrendingUp, Shield, Star } from 'lucide-react';
import { DataTable } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { Collateral, CollateralType } from '../../types/collateral';

interface CollateralTableProps {
  data: Collateral[];
  isLoading?: boolean;
  onRowClick?: (row: Collateral) => void;
}

const TYPE_ICONS: Record<CollateralType, React.ElementType> = {
  PROPERTY: Home,
  VEHICLE: Car,
  EQUIPMENT: Wrench,
  CASH: Banknote,
  SHARES: TrendingUp,
  DEBENTURE: Star,
  GUARANTEE: Shield,
};

const INSURANCE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EXPIRING: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  EXPIRED: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NONE: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const PERFECTION_STYLES: Record<string, string> = {
  PERFECTED: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  NOT_STARTED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function CollateralTable({ data, isLoading, onRowClick }: CollateralTableProps) {
  const columns = useMemo<ColumnDef<Collateral>[]>(
    () => [
      {
        accessorKey: 'collateralNumber',
        header: 'Collateral #',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.collateralNumber}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const Icon = TYPE_ICONS[row.original.type] ?? Shield;
          return (
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{row.original.type.replace(/_/g, ' ')}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-sm max-w-[200px] truncate block">{row.original.description}</span>
        ),
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
      },
      {
        accessorKey: 'currentValue',
        header: 'Value',
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {formatMoney(row.original.currentValue, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'valuationDate',
        header: 'Valuation Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.valuationDate)}</span>
        ),
      },
      {
        accessorKey: 'coverageRatio',
        header: 'Coverage',
        cell: ({ row }) => {
          const ratio = row.original.coverageRatio;
          const isGood = ratio >= 100;
          return (
            <span className={cn('font-mono text-sm font-semibold', isGood ? 'text-green-600' : 'text-red-600')}>
              {ratio.toFixed(0)}%
            </span>
          );
        },
      },
      {
        accessorKey: 'insuranceStatus',
        header: 'Insurance',
        cell: ({ row }) => {
          const status = row.original.insuranceStatus;
          const style = INSURANCE_STYLES[status] ?? '';
          return (
            <span
              className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium gap-1', style)}
            >
              {status === 'EXPIRING' && '⚠ '}
              {status.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'perfectionStatus',
        header: 'Perfection',
        cell: ({ row }) => {
          const status = row.original.perfectionStatus;
          const style = PERFECTION_STYLES[status] ?? '';
          return (
            <span
              className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', style)}
            >
              {status.replace(/_/g, ' ')}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      onRowClick={onRowClick}
      enableExport
      exportFilename="collateral-register"
      emptyMessage="No collateral items registered"
      pageSize={15}
    />
  );
}
