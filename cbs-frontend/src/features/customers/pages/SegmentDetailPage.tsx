import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact, formatDate } from '@/lib/formatters';
import { Users, BarChart3, Layers3, Loader2, ArrowRight } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useSegmentDetail, useSegmentCustomers } from '../hooks/useCustomers';
import { CustomerSegmentBadge } from '../components/segmentation/CustomerSegmentBadge';
import type { SegmentCustomer, SegmentRule } from '../types/customer';

// ── Rule Display ─────────────────────────────────────────────────────────────

function RuleCard({ rule, index }: { rule: SegmentRule; index: number }) {
  const opLabels: Record<string, string> = {
    GT: '>', GTE: '>=', LT: '<', LTE: '<=', EQ: '=', NEQ: '!=',
    IN: 'in', NOT_IN: 'not in', CONTAINS: 'contains', BETWEEN: 'between',
    '>': '>', '>=': '>=', '<': '<', '<=': '<=', '=': '=',
  };

  return (
    <div className="flex items-center gap-2">
      {index > 0 && (
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">AND</span>
      )}
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/30">
        <span className="text-xs font-medium text-primary">{rule.field}</span>
        <span className="text-xs font-bold text-muted-foreground">{opLabels[rule.operator] || rule.operator}</span>
        <span className="text-xs font-mono font-medium">{rule.value}</span>
      </div>
    </div>
  );
}

// ── Customer Table Columns ───────────────────────────────────────────────────

const customerCols: ColumnDef<SegmentCustomer, any>[] = [
  {
    accessorKey: 'customerNumber',
    header: 'Customer #',
    cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.customerNumber}</span>,
  },
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.firstName} {row.original.lastName}</span>,
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
    cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.totalBalance)}</span>,
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
      const colors: Record<string, string> = { LOW: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600' };
      return <span className={cn('text-xs font-bold', colors[row.original.riskRating])}>{row.original.riskRating}</span>;
    },
  },
  {
    accessorKey: 'memberSince',
    header: 'Since',
    cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{formatDate(row.original.memberSince)}</span>,
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export function SegmentDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const { data: segment, isLoading } = useSegmentDetail(code);
  const { data: customers = [], isLoading: customersLoading } = useSegmentCustomers(code);

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
          <p>No segment found with code "{code}"</p>
        </div>
      </>
    );
  }

  const color = segment.colorCode || '#6b7280';

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {segment.name}
            <CustomerSegmentBadge segmentCode={segment.code} segmentName={segment.segmentType} colorCode={segment.colorCode} size="md" />
            {!segment.isActive && <StatusBadge status="INACTIVE" />}
          </span>
        }
        subtitle={<span className="font-mono text-xs">{segment.code}</span>}
        backTo="/customers/segments"
      />
      <div className="page-container space-y-6">
        {/* Segment Info Card */}
        <div className="rounded-xl border bg-card p-5" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Code</p><p className="font-mono font-medium">{segment.code}</p></div>
            <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{segment.name}</p></div>
            <div><p className="text-xs text-muted-foreground">Type</p><StatusBadge status={segment.segmentType} /></div>
            <div><p className="text-xs text-muted-foreground">Priority</p><p className="font-medium">{segment.priority}</p></div>
            <div><p className="text-xs text-muted-foreground">Active</p><StatusBadge status={segment.isActive ? 'ACTIVE' : 'INACTIVE'} dot /></div>
            <div><p className="text-xs text-muted-foreground">Color</p><div className="flex items-center gap-2"><span className="w-4 h-4 rounded" style={{ backgroundColor: color }} /><span className="font-mono text-xs">{segment.colorCode || 'default'}</span></div></div>
            <div><p className="text-xs text-muted-foreground">Description</p><p className="text-xs">{segment.description || '--'}</p></div>
          </div>
        </div>

        {/* Segment Rules */}
        {segment.rules && segment.rules.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-medium mb-3">Segment Rules</p>
            <div className="flex flex-wrap items-center gap-2">
              {segment.rules.map((rule, i) => (
                <RuleCard key={i} rule={rule} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Customers" value={segment.customerCount} format="number" icon={Users} />
          <StatCard label="Total Balance" value={segment.totalBalance} format="money" compact icon={BarChart3} />
          <StatCard label="Avg Balance" value={segment.avgBalance} format="money" compact />
          <StatCard label="Median Balance" value={segment.avgBalance * 0.85} format="money" compact />
        </div>

        {/* Customer List */}
        <div className="rounded-xl border bg-card overflow-hidden">
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
