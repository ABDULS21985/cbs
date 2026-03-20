import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
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
        accessorKey: 'ruleCode',
        header: 'Rule Code',
        cell: ({ row }) => (
          <span className="text-sm font-medium font-mono">{row.original.ruleCode}</span>
        ),
      },
      {
        accessorKey: 'ruleName',
        header: 'Rule',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium">{row.original.ruleName}</div>
            <div className="text-xs text-muted-foreground">{row.original.description}</div>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              )}
            >
              {row.original.category.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.severity}</span>
        ),
      },
      {
        accessorKey: 'scoreWeight',
        header: 'Score Weight',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.scoreWeight}</span>
        ),
      },
      {
        accessorKey: 'applicableChannels',
        header: 'Channels',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.applicableChannels}</span>
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
