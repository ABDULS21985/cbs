import { useState } from 'react';
import { Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DataTable } from '@/components/shared/DataTable';
import { useAmlRules } from '../../hooks/useAmlAlerts';
import { amlApi } from '../../api/amlApi';
import { AmlRuleBuilder } from './AmlRuleBuilder';
import type { ColumnDef } from '@tanstack/react-table';
import type { AmlRule, AmlRuleCondition } from '../../types/aml';

interface RuleMeta {
  lookback: string;
  priority: string;
  name: string;
}

export function AmlRuleEditor() {
  const { isAdmin } = useAuth();
  const { data: rules, isLoading, refetch } = useAmlRules();
  const [editingRule, setEditingRule] = useState<AmlRule | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggle = async (rule: AmlRule) => {
    setTogglingId(rule.id);
    try {
      await amlApi.toggleRule(rule.id);
      refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = (_conditions: AmlRuleCondition[], _meta: RuleMeta) => {
    setEditingRule(null);
    refetch();
  };

  const columns: ColumnDef<AmlRule>[] = [
    {
      accessorKey: 'ruleNumber',
      header: 'Rule #',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'threshold',
      header: 'Threshold',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'lookbackPeriod',
      header: 'Lookback',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'riskWeight',
      header: 'Risk Weight',
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Active',
      cell: ({ row }) => {
        const rule = row.original;
        const isToggling = togglingId === rule.id;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(rule); }}
            disabled={isToggling || !isAdmin}
            className={cn(
              !isAdmin && 'cursor-not-allowed opacity-60',
              'relative w-10 h-5 rounded-full transition-colors focus:outline-none disabled:opacity-50',
              rule.active ? 'bg-green-500' : 'bg-gray-300',
            )}
            title={rule.active ? 'Disable rule' : 'Enable rule'}
          >
            <span
              className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                rule.active ? 'translate-x-5' : 'translate-x-0.5',
              )}
            />
          </button>
        );
      },
    },
    {
      id: 'edit',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setEditingRule(row.original); }}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Edit rule"
        >
          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AML Rules</h3>
        {isAdmin && (
          <button
            onClick={() => setEditingRule({ id: 0, ruleNumber: '', name: '', type: '', threshold: '', lookbackPeriod: '30d', riskWeight: 1, active: true })}
            className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + New Rule
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rules ?? []}
        isLoading={isLoading}
        emptyMessage="No rules configured"
        pageSize={10}
        enableGlobalFilter
      />

      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {editingRule.id === 0 ? 'Create Rule' : `Edit Rule: ${editingRule.name}`}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AmlRuleBuilder
              onSave={handleSave}
              onCancel={() => setEditingRule(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
