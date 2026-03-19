import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/formatters';
import type { FraudRule } from '../../types/fraud';
import { useToggleFraudRule } from '../../hooks/useFraud';

interface Props {
  rules: FraudRule[];
  isLoading: boolean;
}

export function FraudRuleTable({ rules, isLoading }: Props) {
  const toggleRule = useToggleFraudRule();

  const columns = useMemo<ColumnDef<FraudRule>[]>(
    () => [
      {
        accessorKey: 'rule',
        header: 'Rule',
        cell: ({ row }) => (
          <span className="text-sm font-medium font-mono">{row.original.rule}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.description}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const isModel = row.original.type === 'ML_MODEL';
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                isModel
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              )}
            >
              {isModel ? 'ML Model' : 'Rule'}
            </span>
          );
        },
      },
      {
        accessorKey: 'alertsMtd',
        header: 'Alerts MTD',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.alertsMtd.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'truePositiveRate',
        header: 'True Positive Rate',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${row.original.truePositiveRate}%` }}
              />
            </div>
            <span className="text-sm">{formatPercent(row.original.truePositiveRate)}</span>
          </div>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Active',
        cell: ({ row }) => {
          const isActive = row.original.active;
          const isPending = toggleRule.isPending && (toggleRule.variables as { id: number })?.id === row.original.id;
          return (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                disabled={isPending}
                onChange={(e) =>
                  toggleRule.mutate({ id: row.original.id, active: e.target.checked })
                }
                className="sr-only peer"
              />
              <div
                className={cn(
                  'w-9 h-5 rounded-full peer-focus:ring-2 peer-focus:ring-primary/30 transition-colors',
                  isActive ? 'bg-primary' : 'bg-muted',
                  isPending && 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    isActive && 'translate-x-4'
                  )}
                />
              </div>
            </label>
          );
        },
      },
    ],
    [toggleRule]
  );

  return (
    <DataTable
      columns={columns}
      data={rules}
      isLoading={isLoading}
      enableGlobalFilter
      emptyMessage="No fraud rules configured"
      pageSize={20}
    />
  );
}
