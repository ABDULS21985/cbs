import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, History, Edit2, Layers } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/shared';
import { cn } from '@/lib/utils';
import { getFeeDefinitions, type FeeDefinition, type FeeCategory, type FeeCalcType } from '../api/feeApi';

// ─── Local badge helper ───────────────────────────────────────────────────────

function CalcBadge({ type, fee }: { type: FeeCalcType; fee: FeeDefinition }) {
  if (type === 'FLAT') {
    return (
      <span className="text-sm font-medium tabular-nums">
        ₦{fee.flatAmount?.toLocaleString('en-NG') ?? '—'}
      </span>
    );
  }
  if (type === 'PERCENTAGE') {
    return (
      <span className="text-sm font-medium tabular-nums">{fee.percentage ?? '—'}%</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
      <Layers className="w-3 h-3" />
      {type === 'TIERED' ? 'Tiered' : 'Slab'}
    </span>
  );
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        status === 'ACTIVE'
          ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400',
        )}
      />
      {status}
    </span>
  );
}

function CategoryLabel({ category }: { category: FeeCategory }) {
  const labels: Record<FeeCategory, string> = {
    ACCOUNT_MAINTENANCE: 'Account Maintenance',
    TRANSACTION: 'Transaction',
    CARD: 'Card',
    LOAN: 'Loan',
    TRADE: 'Trade Finance',
    OTHER: 'Other',
  };
  return <span className="text-sm">{labels[category]}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'ACCOUNT_MAINTENANCE', label: 'Account Maintenance' },
  { value: 'TRANSACTION', label: 'Transaction' },
  { value: 'CARD', label: 'Card' },
  { value: 'LOAN', label: 'Loan' },
  { value: 'TRADE', label: 'Trade Finance' },
  { value: 'OTHER', label: 'Other' },
];

const CALC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'FLAT', label: 'Flat' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'TIERED', label: 'Tiered' },
  { value: 'SLAB', label: 'Slab' },
];

const selectCls =
  'px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors';

export function FeeScheduleListPage() {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [calcTypeFilter, setCalcTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fee-definitions'],
    queryFn: getFeeDefinitions,
  });

  const filtered = useMemo(() => {
    return fees.filter((fee) => {
      if (categoryFilter && fee.category !== categoryFilter) return false;
      if (calcTypeFilter && fee.calcType !== calcTypeFilter) return false;
      if (statusFilter !== 'ALL' && fee.status !== statusFilter) return false;
      return true;
    });
  }, [fees, categoryFilter, calcTypeFilter, statusFilter]);

  const columns: ColumnDef<FeeDefinition, any>[] = [
    {
      accessorKey: 'code',
      header: 'Fee Code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-medium text-muted-foreground">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Fee Name',
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => <CategoryLabel category={getValue<FeeCategory>()} />,
    },
    {
      accessorKey: 'calcType',
      header: 'Calc Type',
      cell: ({ getValue }) => {
        const v = getValue<FeeCalcType>();
        const labels: Record<FeeCalcType, string> = {
          FLAT: 'Flat',
          PERCENTAGE: 'Percentage',
          TIERED: 'Tiered',
          SLAB: 'Slab',
        };
        return <span className="text-sm">{labels[v]}</span>;
      },
    },
    {
      id: 'amountRate',
      header: 'Amount / Rate',
      cell: ({ row }) => <CalcBadge type={row.original.calcType} fee={row.original} />,
    },
    {
      accessorKey: 'schedule',
      header: 'Schedule',
      cell: ({ getValue }) => {
        const labels: Record<string, string> = {
          PER_TRANSACTION: 'Per Txn',
          MONTHLY: 'Monthly',
          QUARTERLY: 'Quarterly',
          ANNUAL: 'Annual',
        };
        return <span className="text-sm text-muted-foreground">{labels[getValue<string>()] ?? getValue<string>()}</span>;
      },
    },
    {
      id: 'products',
      header: 'Products',
      cell: ({ row }) => {
        const products = row.original.applicableProducts;
        if (products.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              {products[0]}
            </span>
            {products.length > 1 && (
              <span className="text-xs text-muted-foreground">+{products.length - 1}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<'ACTIVE' | 'INACTIVE'>()} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/fees/${row.original.id}`);
            }}
            title="Edit"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/fees/${row.original.id}?tab=history`);
            }}
            title="View History"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Fees & Charges"
        subtitle="Manage fee definitions, charge history, and waivers"
        actions={
          <button
            onClick={() => navigate('/admin/fees/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Fee Definition
          </button>
        }
      />

      <div className="page-container">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 rounded-xl border bg-card">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={selectCls}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={calcTypeFilter}
            onChange={(e) => setCalcTypeFilter(e.target.value)}
            className={selectCls}
          >
            {CALC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border bg-background overflow-hidden text-sm">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-2 font-medium transition-colors',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {(categoryFilter || calcTypeFilter || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setCategoryFilter('');
                setCalcTypeFilter('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} fee{filtered.length !== 1 ? 's' : ''} found
          </span>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          onRowClick={(row: FeeDefinition) => navigate(`/admin/fees/${row.id}`)}
          emptyMessage="No fee definitions found. Create your first fee definition."
        />
      </div>
    </>
  );
}
