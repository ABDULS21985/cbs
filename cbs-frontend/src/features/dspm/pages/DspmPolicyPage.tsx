import { useState, useEffect, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldCheck, Plus, Loader2, AlertTriangle, FileCheck, FilePen, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { useDspmPolicies, useCreateDspmPolicy, useActivateDspmPolicy } from '../hooks/useDspm';
import type { DspmPolicy } from '../types/dspm';

// ─── Constants ───────────────────────────────────────────────────────────────

const POLICY_TYPES = [
  'DATA_ACCESS',
  'DATA_MOVEMENT',
  'DATA_RETENTION',
  'ENCRYPTION',
  'MASKING',
  'CLASSIFICATION',
] as const;

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const CONDITION_FIELDS = [
  'contains_pii',
  'data_location',
  'access_frequency',
  'sensitivity_level',
  'user_role',
] as const;

const OPERATORS = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'] as const;

const DATA_TYPE_OPTIONS = ['PII', 'PHI', 'PCI', 'FINANCIAL', 'CREDENTIALS'] as const;

const ENFORCEMENT_ACTIONS = ['ALERT', 'BLOCK', 'QUARANTINE', 'ENCRYPT', 'MASK', 'LOG'] as const;

// ─── Rule Condition Type ─────────────────────────────────────────────────────

interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

// ─── Policy Rule Editor ──────────────────────────────────────────────────────

function PolicyRuleEditor({
  conditions,
  onConditionsChange,
}: {
  conditions: RuleCondition[];
  onConditionsChange: (conditions: RuleCondition[]) => void;
}) {
  const [draft, setDraft] = useState<RuleCondition>({
    field: 'contains_pii',
    operator: 'equals',
    value: '',
  });

  const inputCls =
    'w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40';

  const addCondition = () => {
    if (!draft.value.trim()) {
      toast.error('Condition value is required');
      return;
    }
    onConditionsChange([...conditions, { ...draft }]);
    setDraft({ field: 'contains_pii', operator: 'equals', value: '' });
  };

  const removeCondition = (index: number) => {
    onConditionsChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold">Rule Builder (AND logic)</Label>

      {/* Existing conditions */}
      {conditions.length > 0 && (
        <div className="space-y-2">
          {conditions.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs"
            >
              <span className="font-medium">{c.field.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground">{c.operator.replace(/_/g, ' ')}</span>
              <span className="font-mono">{c.value}</span>
              <button
                type="button"
                onClick={() => removeCondition(idx)}
                className="ml-auto p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new condition */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <select
            value={draft.field}
            onChange={(e) => setDraft((d) => ({ ...d, field: e.target.value }))}
            className={inputCls}
          >
            {CONDITION_FIELDS.map((f) => (
              <option key={f} value={f}>
                {f.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={draft.operator}
            onChange={(e) => setDraft((d) => ({ ...d, operator: e.target.value }))}
            className={inputCls}
          >
            {OPERATORS.map((o) => (
              <option key={o} value={o}>
                {o.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Input
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            placeholder="Value"
          />
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
        <Plus className="w-3 h-3 mr-1" />
        Add Condition
      </Button>
    </div>
  );
}

// ─── New Policy Dialog ───────────────────────────────────────────────────────

function NewPolicyDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<DspmPolicy>) => void;
  isSubmitting: boolean;
}) {
  const [policyName, setPolicyName] = useState('');
  const [policyType, setPolicyType] = useState<string>(POLICY_TYPES[0]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('MEDIUM');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [dataTypes, setDataTypes] = useState<string[]>([]);
  const [enforcementAction, setEnforcementAction] = useState<string>('ALERT');
  const [autoRemediate, setAutoRemediate] = useState(false);

  const inputCls =
    'w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40';

  const toggleDataType = (type: string) => {
    setDataTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSubmit = () => {
    if (!policyName.trim()) {
      toast.error('Policy name is required');
      return;
    }
    if (conditions.length === 0) {
      toast.error('At least one rule condition is required');
      return;
    }

    const rule: Record<string, unknown> = {
      conditions: conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      logic: 'AND',
    };

    onSubmit({
      policyName,
      policyType,
      description,
      severity,
      rule,
      dataTypes,
      enforcementAction,
      autoRemediate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Policy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Policy Name */}
          <div>
            <Label>Policy Name *</Label>
            <Input
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="e.g. Block PII Export to External"
              className="mt-1"
            />
          </div>

          {/* Type & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select
                value={policyType}
                onChange={(e) => setPolicyType(e.target.value)}
                className={cn(inputCls, 'mt-1')}
              >
                {POLICY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Severity</Label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className={cn(inputCls, 'mt-1')}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this policy enforces..."
              className={cn(inputCls, 'mt-1 resize-none')}
            />
          </div>

          {/* Rule Builder */}
          <div className="rounded-lg border p-4 bg-muted/20">
            <PolicyRuleEditor conditions={conditions} onConditionsChange={setConditions} />
          </div>

          {/* Data Types */}
          <div>
            <Label>Data Types</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {DATA_TYPE_OPTIONS.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dataTypes.includes(type)}
                    onChange={() => toggleDataType(type)}
                    className="rounded border-gray-300"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Enforcement Action */}
          <div>
            <Label>Enforcement Action</Label>
            <select
              value={enforcementAction}
              onChange={(e) => setEnforcementAction(e.target.value)}
              className={cn(inputCls, 'mt-1')}
            >
              {ENFORCEMENT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-remediate */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoRemediate}
              onChange={(e) => setAutoRemediate(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-remediate violations
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Create Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function DspmPolicyPage() {
  useEffect(() => {
    document.title = 'Policies | DSPM | CBS';
  }, []);

  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const { data: policies = [], isLoading } = useDspmPolicies();
  const createPolicyMutation = useCreateDspmPolicy();
  const activatePolicyMutation = useActivateDspmPolicy();

  const stats = useMemo(() => {
    const total = policies.length;
    const active = policies.filter((p) => p.status === 'ACTIVE').length;
    const draft = policies.filter((p) => p.status === 'DRAFT').length;
    const violations = policies.reduce((sum, p) => sum + (p.violationCount ?? 0), 0);
    return { total, active, draft, violations };
  }, [policies]);

  const handleActivate = (code: string) => {
    activatePolicyMutation.mutate(code, {
      onSuccess: () => toast.success('Policy activated'),
      onError: () => toast.error('Failed to activate policy'),
    });
  };

  const handleCreate = (data: Partial<DspmPolicy>) => {
    createPolicyMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Policy created successfully');
        setShowNewPolicy(false);
      },
      onError: () => toast.error('Failed to create policy'),
    });
  };

  const columns: ColumnDef<DspmPolicy, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'policyCode',
        header: 'Code',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.policyCode}</span>
        ),
      },
      {
        accessorKey: 'policyName',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.policyName}</span>
        ),
      },
      {
        accessorKey: 'policyType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.policyType?.replace(/_/g, ' ')}</span>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => {
          const s = row.original.severity;
          const colorMap: Record<string, string> = {
            CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          };
          return (
            <span
              className={cn(
                'ui-chip',
                colorMap[s] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {s}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      },
      {
        accessorKey: 'violationCount',
        header: 'Violations',
        cell: ({ row }) => (
          <span
            className={cn(
              'tabular-nums text-sm',
              (row.original.violationCount ?? 0) > 0 && 'text-red-600 font-semibold',
            )}
          >
            {row.original.violationCount ?? 0}
          </span>
        ),
      },
      {
        accessorKey: 'enforcementAction',
        header: 'Enforcement',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.enforcementAction?.replace(/_/g, ' ') ?? '—'}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const policy = row.original;
          return (
            <div className="flex items-center gap-1 justify-end">
              {policy.status === 'DRAFT' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivate(policy.policyCode);
                  }}
                  disabled={activatePolicyMutation.isPending}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Activate
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [activatePolicyMutation.isPending],
  );

  return (
    <>
      <PageHeader
        title="Policies"
        subtitle="Define and manage data security policies with full rule configuration"
        icon={ShieldCheck}
        actions={
          <Button onClick={() => setShowNewPolicy(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Policy
          </Button>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Policies"
            value={stats.total}
            format="number"
            icon={ShieldCheck}
            loading={isLoading}
          />
          <StatCard
            label="Active"
            value={stats.active}
            format="number"
            icon={FileCheck}
            iconBg="bg-green-50 dark:bg-green-900/20"
            iconColor="text-green-600"
            loading={isLoading}
          />
          <StatCard
            label="Draft"
            value={stats.draft}
            format="number"
            icon={FilePen}
            iconBg="bg-amber-50 dark:bg-amber-900/20"
            iconColor="text-amber-600"
            loading={isLoading}
          />
          <StatCard
            label="Violations"
            value={stats.violations}
            format="number"
            icon={AlertTriangle}
            iconBg="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-600"
            loading={isLoading}
          />
        </div>

        <DataTable
          columns={columns}
          data={policies}
          isLoading={isLoading}
          enableGlobalFilter
          searchPlaceholder="Search policies..."
          emptyMessage="No policies found. Create a new policy to get started."
        />
      </div>

      {showNewPolicy && (
        <NewPolicyDialog
          open
          onClose={() => setShowNewPolicy(false)}
          onSubmit={handleCreate}
          isSubmitting={createPolicyMutation.isPending}
        />
      )}
    </>
  );
}
