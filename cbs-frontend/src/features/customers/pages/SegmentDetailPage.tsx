import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { Users, BarChart3, Layers3, Loader2, Pencil, Play, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useSegmentDetail, useSegmentCustomers, useUpdateSegment, useEvaluateSegment,
} from '../hooks/useCustomers';
import { CustomerSegmentBadge } from '../components/segmentation/CustomerSegmentBadge';
import type { SegmentCustomer, SegmentRule } from '../types/customer';
import { toast } from 'sonner';

// ── Rule Card ─────────────────────────────────────────────────────────────────

const OP_LABELS: Record<string, string> = {
  EQUALS:          '=',
  NOT_EQUALS:      '≠',
  GREATER_THAN:    '>',
  LESS_THAN:       '<',
  GREATER_OR_EQUAL:'≥',
  LESS_OR_EQUAL:   '≤',
  CONTAINS:        'contains',
  NOT_CONTAINS:    'not contains',
  STARTS_WITH:     'starts with',
  ENDS_WITH:       'ends with',
  IN:              'in',
  NOT_IN:          'not in',
  BETWEEN:         'between',
  IS_NULL:         'is null',
  IS_NOT_NULL:     'is not null',
  // legacy short form aliases
  GT: '>', GTE: '>=', LT: '<', LTE: '<=', EQ: '=', NEQ: '≠',
};

function RuleCard({ rule, index }: { rule: SegmentRule; index: number }) {
  const isFirstInGroup = rule.logicalGroup === 0 || index === 0;
  const conjunct = isFirstInGroup ? null : (rule.logicalGroup !== (index === 0 ? 0 : rule.logicalGroup ?? 0) ? 'OR' : 'AND');
  const opLabel = OP_LABELS[rule.operator] || rule.operator;

  return (
    <div className="flex items-center gap-2">
      {index > 0 && (
        <span className={cn(
          'text-xs font-medium px-2 py-0.5 rounded',
          conjunct === 'OR'
            ? 'text-amber-600 bg-amber-50 dark:bg-amber-950'
            : 'text-primary bg-primary/10',
        )}>
          {conjunct ?? 'AND'}
        </span>
      )}
      <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 bg-muted/30">
        <span className="text-xs font-medium text-primary font-mono">{rule.fieldName}</span>
        <span className="text-xs font-bold text-muted-foreground">{opLabel}</span>
        {rule.fieldValue && (
          <span className="text-xs font-mono font-medium">{rule.fieldValue}</span>
        )}
        {rule.fieldValueTo && (
          <>
            <span className="text-xs text-muted-foreground">–</span>
            <span className="text-xs font-mono font-medium">{rule.fieldValueTo}</span>
          </>
        )}
        {(rule.isActive === false) && (
          <span className="text-[10px] text-muted-foreground italic ml-1">(inactive)</span>
        )}
      </div>
    </div>
  );
}

// ── Customer Table Columns ────────────────────────────────────────────────────

const customerCols: ColumnDef<SegmentCustomer, unknown>[] = [
  {
    accessorKey: 'customerNumber',
    header: 'Customer #',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-primary">{row.original.customerNumber}</span>
    ),
  },
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {row.original.firstName} {row.original.lastName}
      </span>
    ),
  },
  {
    accessorKey: 'customerType',
    header: 'Type',
    cell: ({ row }) => <StatusBadge status={row.original.customerType} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
  },
  {
    accessorKey: 'totalBalance',
    header: 'Balance',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.totalBalance)}</span>
    ),
  },
  {
    accessorKey: 'productCount',
    header: 'Products',
    cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.productCount}</span>,
  },
  {
    accessorKey: 'riskRating',
    header: 'Risk',
    cell: ({ row }) => {
      const colors: Record<string, string> = {
        LOW: 'text-green-600', MEDIUM: 'text-amber-600',
        HIGH: 'text-red-600', VERY_HIGH: 'text-red-700',
      };
      return (
        <span className={cn('text-xs font-bold', colors[row.original.riskRating] || 'text-muted-foreground')}>
          {row.original.riskRating}
        </span>
      );
    },
  },
  {
    accessorKey: 'memberSince',
    header: 'Since',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.original.memberSince)}</span>
    ),
  },
];

// ── Toggle Active ─────────────────────────────────────────────────────────────

function ToggleActiveButton({
  code, isActive, onToggle, isPending,
}: { code: string; isActive: boolean; onToggle: () => void; isPending: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
        isActive
          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400'
          : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400',
      )}
    >
      <RefreshCw className={cn('w-3 h-3', isPending && 'animate-spin')} />
      {isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SegmentDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const updateMutation  = useUpdateSegment();
  const evaluateMutation = useEvaluateSegment();

  const { data: segment, isLoading, refetch } = useSegmentDetail(code);
  const { data: customers = [], isLoading: customersLoading } = useSegmentCustomers(code);

  function handleToggleActive() {
    if (!segment) return;
    updateMutation.mutate(
      { code: segment.code, isActive: !segment.isActive },
      {
        onSuccess: () => { toast.success(`Segment ${segment.isActive ? 'deactivated' : 'activated'}`); refetch(); },
        onError: (err: Error) => toast.error(err.message || 'Update failed'),
      },
    );
  }

  function handleEvaluate() {
    if (!segment) return;
    evaluateMutation.mutate(segment.code, {
      onSuccess: (res) => {
        toast.success(`Evaluation complete — ${res.newAssignments} new assignments`);
        refetch();
      },
      onError: (err: Error) => toast.error(err.message || 'Evaluation failed'),
    });
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/customers/segments" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!segment) {
    return (
      <>
        <PageHeader title="Segment Not Found" backTo="/customers/segments" />
        <div className="page-container text-center py-20 text-muted-foreground">
          <Layers3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No segment found with code &ldquo;{code}&rdquo;</p>
        </div>
      </>
    );
  }

  const color = segment.colorCode || '#6b7280';
  const isRuleBased = segment.segmentType === 'RULE_BASED' || segment.segmentType === 'HYBRID';

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {segment.name}
            <CustomerSegmentBadge
              segmentCode={segment.code}
              segmentName={segment.segmentType}
              colorCode={segment.colorCode}
              size="md"
            />
            {!segment.isActive && <StatusBadge status="INACTIVE" />}
          </span>
        }
        subtitle={<span className="font-mono text-xs">{segment.code}</span>}
        backTo="/customers/segments"
        actions={
          <div className="flex items-center gap-2">
            <ToggleActiveButton
              code={segment.code}
              isActive={segment.isActive}
              onToggle={handleToggleActive}
              isPending={updateMutation.isPending}
            />
            {isRuleBased && (
              <button
                onClick={handleEvaluate}
                disabled={evaluateMutation.isPending}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Play className={cn('w-3 h-3', evaluateMutation.isPending && 'animate-spin')} />
                {evaluateMutation.isPending ? 'Evaluating…' : 'Run Evaluation'}
              </button>
            )}
            <button
              onClick={() => navigate(`/customers/segments`)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-muted hover:bg-muted/80 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Segment Info Card */}
        <div className="surface-card p-5" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Code</p>
              <p className="font-mono font-medium">{segment.code}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{segment.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <StatusBadge status={segment.segmentType} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Priority</p>
              <p className="font-medium">{segment.priority}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <StatusBadge status={segment.isActive ? 'ACTIVE' : 'INACTIVE'} dot />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Color</p>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="font-mono text-xs">{segment.colorCode || 'default'}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-xs">{segment.description || '—'}</p>
            </div>
          </div>
        </div>

        {/* Segment Rules */}
        {segment.rules && segment.rules.length > 0 && (
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Segment Rules</p>
              <span className="text-xs text-muted-foreground">
                {segment.rules.length} rule{segment.rules.length !== 1 ? 's' : ''}
                {' · '}Rules in the same group are AND-ed; different groups are OR-ed
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {segment.rules.map((rule, i) => (
                <RuleCard key={i} rule={rule} index={i} />
              ))}
            </div>
          </div>
        )}

        {isRuleBased && (!segment.rules || segment.rules.length === 0) && (
          <div className="rounded-xl border border-dashed bg-card p-5 text-center text-muted-foreground text-sm">
            No rules defined for this RULE_BASED segment. Use &ldquo;Edit&rdquo; from the segments list to add rules.
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Customers" value={segment.customerCount} format="number" icon={Users} />
          <StatCard label="Total Balance" value={segment.totalBalance} format="money" compact icon={BarChart3} />
          <StatCard label="Avg Balance" value={segment.avgBalance} format="money" compact />
          <StatCard label="Segment Priority" value={segment.priority} format="number" />
        </div>

        {/* Customer List */}
        <div className="surface-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <p className="text-sm font-medium">
              Customers in Segment ({customers.length})
            </p>
          </div>
          <div className="p-4">
            <DataTable
              columns={customerCols}
              data={customers}
              isLoading={customersLoading}
              enableGlobalFilter
              enableExport
              exportFilename={`segment-${code}-customers`}
              onRowClick={(row) => navigate(`/customers/${row.id}`)}
              emptyMessage="No customers in this segment"
            />
          </div>
        </div>
      </div>
    </>
  );
}
