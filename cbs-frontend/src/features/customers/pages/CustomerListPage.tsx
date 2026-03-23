import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Plus, X, Users, UserCheck, UserMinus, UserPlus,
  Eye, Mail, Phone, Building2, Calendar,
} from 'lucide-react';
import { BulkActionBar } from '../components/bulk/BulkActionBar';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermission } from '@/hooks/usePermission';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useCustomerCounts, useCustomerFiltersFromUrl, useCustomers } from '../hooks/useCustomers';
import type { CustomerListItem, CustomerStatus, CustomerType } from '../types/customer';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const CUSTOMER_TYPES: readonly { value: CustomerType; label: string; icon: string }[] = [
  { value: 'INDIVIDUAL', label: 'Individual', icon: '👤' },
  { value: 'SOLE_PROPRIETOR', label: 'Sole Proprietor', icon: '🏪' },
  { value: 'SME', label: 'SME', icon: '🏢' },
  { value: 'CORPORATE', label: 'Corporate', icon: '🏛' },
  { value: 'TRUST', label: 'Trust', icon: '🤝' },
  { value: 'GOVERNMENT', label: 'Government', icon: '🏫' },
  { value: 'NGO', label: 'NGO', icon: '🌍' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  PROSPECT:  { label: 'Prospect',  color: 'text-slate-600 dark:text-slate-400',  bg: 'bg-slate-50 dark:bg-slate-900/40',  ring: 'ring-slate-200 dark:ring-slate-700' },
  ACTIVE:    { label: 'Active',    color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  DORMANT:   { label: 'Dormant',   color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/30',   ring: 'ring-amber-200 dark:ring-amber-800' },
  SUSPENDED: { label: 'Suspended', color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/30',     ring: 'ring-red-200 dark:ring-red-800' },
  CLOSED:    { label: 'Closed',    color: 'text-gray-500 dark:text-gray-500',    bg: 'bg-gray-50 dark:bg-gray-900/40',    ring: 'ring-gray-200 dark:ring-gray-700' },
  DECEASED:  { label: 'Deceased',  color: 'text-gray-500 dark:text-gray-500',    bg: 'bg-gray-50 dark:bg-gray-900/40',    ring: 'ring-gray-200 dark:ring-gray-700' },
};

const RISK_COLORS: Record<string, string> = {
  LOW:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  MEDIUM:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  HIGH:       'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  VERY_HIGH:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  PEP:        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  SANCTIONED: 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-300',
};

const TYPE_EMOJI: Record<string, string> = {
  INDIVIDUAL: '👤', SOLE_PROPRIETOR: '🏪', SME: '🏢', CORPORATE: '🏛', TRUST: '🤝', GOVERNMENT: '🏫', NGO: '🌍',
};

/* ─── Metric Card (inline, purpose-built) ────────────────────────────────── */

function MetricCard({ label, value, icon: Icon, color, active, onClick }: {
  label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
  color: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        active
          ? 'border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20'
          : 'border-border/60 bg-card hover:border-border',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <span className="text-2xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </button>
  );
}

/* ─── Filter Pill ────────────────────────────────────────────────────────── */

function FilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {label}
      <button type="button" onClick={onClear} className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
  'from-lime-500 to-green-600',
];

function Avatar({ name, id }: { name: string; id: number }) {
  const initials = (name || '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colorIdx = id % AVATAR_COLORS.length;

  return (
    <div className={cn(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white shadow-sm',
      AVATAR_COLORS[colorIdx],
    )}>
      {initials || '??'}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function CustomerListPage() {
  const navigate = useNavigate();
  const canCreate = usePermission('customers', 'create');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerListItem[]>([]);
  const { filters, setFilters } = useCustomerFiltersFromUrl();
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if ((filters.search || '') !== debouncedSearch) {
      setFilters({ search: debouncedSearch || undefined });
    }
  }, [debouncedSearch, filters.search, setFilters]);

  const { data, isLoading } = useCustomers({
    ...filters,
    search: debouncedSearch || undefined,
  });
  const { data: counts } = useCustomerCounts();

  const sorting = useMemo<SortingState>(() => {
    const sort = filters.sort ?? 'createdAt';
    return [{ id: sort, desc: (filters.direction ?? 'desc') !== 'asc' }];
  }, [filters.direction, filters.sort]);

  const handleStatusFilter = useCallback((status: CustomerStatus | undefined) => {
    setFilters({ status: filters.status === status ? undefined : status, page: 0 });
  }, [filters.status, setFilters]);

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ search: undefined, type: undefined, status: undefined, page: 0 });
  };

  const hasActiveFilters = Boolean(filters.search || filters.type || filters.status);

  /* ── Column definitions ─────────────────────────────────────────────── */

  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'fullName',
      enableSorting: false,
      header: 'Customer',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar name={r.fullName} id={r.id} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{r.fullName || 'Unnamed'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[11px] text-muted-foreground">{r.customerNumber}</span>
                {r.type && (
                  <span className="text-[11px] text-muted-foreground">
                    {TYPE_EMOJI[r.type] || ''} {r.type.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = STATUS_CONFIG[row.original.status] || STATUS_CONFIG.ACTIVE;
        return (
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', s.color, s.bg, s.ring)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', row.original.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-current opacity-40')} />
            {s.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'riskRating',
      header: 'Risk',
      cell: ({ row }) => {
        const risk = row.original.riskRating ?? 'MEDIUM';
        return (
          <span className={cn('inline-block rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider', RISK_COLORS[risk] || RISK_COLORS.MEDIUM)}>
            {risk.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'phone',
      id: 'phonePrimary',
      header: 'Contact',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-y-0.5">
            {r.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{r.phone}</span>
              </div>
            )}
            {r.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[180px]">{r.email}</span>
              </div>
            )}
            {!r.phone && !r.email && <span className="text-xs text-muted-foreground/50">No contact</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'branchCode',
      header: 'Branch',
      cell: ({ row }) => (
        row.original.branchCode ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span>{row.original.branchName || row.original.branchCode}</span>
          </div>
        ) : <span className="text-xs text-muted-foreground/50">—</span>
      ),
    },
    {
      accessorKey: 'segment',
      header: 'Segment',
      cell: ({ row }) => (
        row.original.segment ? (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
            {row.original.segment}
          </span>
        ) : <span className="text-xs text-muted-foreground/50">—</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        row.original.createdAt ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatDateTime(row.original.createdAt)}</span>
          </div>
        ) : <span className="text-xs text-muted-foreground/50">—</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/customers/${row.original.id}`); }}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
        >
          <Eye className="h-3 w-3" />
          View
        </button>
      ),
    },
  ];

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${counts?.total?.toLocaleString() ?? '—'} registered customers across all branches`}
        icon={Users}
        iconBg="bg-blue-500/10 dark:bg-blue-500/20"
        iconColor="text-blue-600 dark:text-blue-400"
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                type="button"
                onClick={() => navigate('/customers/onboarding')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                New Customer
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-5">
        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          <MetricCard
            label="Total Customers"
            value={counts?.total ?? '—'}
            icon={Users}
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          />
          <MetricCard
            label="Active"
            value={counts?.active ?? '—'}
            icon={UserCheck}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
            active={filters.status === 'ACTIVE'}
            onClick={() => handleStatusFilter('ACTIVE')}
          />
          <MetricCard
            label="Dormant"
            value={counts?.dormant ?? '—'}
            icon={UserMinus}
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            active={filters.status === 'DORMANT'}
            onClick={() => handleStatusFilter('DORMANT')}
          />
          <MetricCard
            label="New This Month"
            value={counts?.newMtd ?? '—'}
            icon={UserPlus}
            color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
          />
        </div>

        {/* ── Search & Toolbar ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, CIF, email, or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(
                'h-10 w-full rounded-xl border bg-background pl-10 pr-4 text-sm',
                'placeholder:text-muted-foreground/60',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40',
                'transition-all duration-200',
              )}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-4 h-10 text-sm font-medium transition-all',
              filtersOpen
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {[filters.type, filters.status, filters.search].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* ── Active Filter Pills ─────────────────────────────────────── */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
            {filters.search && (
              <FilterPill
                label={`Search: "${filters.search}"`}
                onClear={() => { setSearchInput(''); setFilters({ search: undefined }); }}
              />
            )}
            {filters.type && (
              <FilterPill
                label={`Type: ${filters.type.replace('_', ' ')}`}
                onClear={() => setFilters({ type: undefined })}
              />
            )}
            {filters.status && (
              <FilterPill
                label={`Status: ${filters.status}`}
                onClear={() => setFilters({ status: undefined })}
              />
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Expandable Filter Panel ─────────────────────────────────── */}
        {filtersOpen && (
          <div className="surface-card p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Customer Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOMER_TYPES.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilters({ type: filters.type === value ? undefined : value, page: 0 })}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        filters.type === value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <span className="text-xs">{icon}</span> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(STATUS_CONFIG).map(([value, { label, color }]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilters({ status: filters.status === value ? undefined : value as CustomerStatus, page: 0 })}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        filters.status === value
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', value === 'ACTIVE' ? 'bg-emerald-500' : 'bg-current opacity-40')} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</label>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset All Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Data Table ──────────────────────────────────────────────── */}
        <div className="surface-card shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            isLoading={isLoading}
            enableRowSelection
            onRowSelectionChange={setSelectedCustomers}
            bulkActions={
              selectedCustomers.length > 0 ? (
                <BulkActionBar
                  selectedIds={selectedCustomers.map((c) => c.id)}
                  onClear={() => setSelectedCustomers([])}
                />
              ) : undefined
            }
            enableExport
            exportFilename="customers"
            onRowClick={(row) => navigate(`/customers/${row.id}`)}
            manualPagination={{
              pageIndex: data?.page.page ?? filters.page ?? 0,
              pageSize: data?.page.size ?? filters.size ?? 25,
              pageCount: data?.page.totalPages ?? 0,
              rowCount: data?.page.totalElements ?? 0,
              onPageChange: (pageIndex) => setFilters({ page: pageIndex }),
              onPageSizeChange: (nextSize) => setFilters({ size: nextSize, page: 0 }),
            }}
            manualSorting={{
              sorting,
              onSortingChange: (nextSorting) => {
                const [next] = nextSorting;
                setFilters({
                  sort: next?.id ?? 'createdAt',
                  direction: next?.desc ? 'desc' : 'asc',
                  page: 0,
                });
              },
            }}
            emptyMessage="No customers match the current filters"
          />
        </div>
      </div>
    </>
  );
}
