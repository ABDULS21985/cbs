import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useDebounce } from '@/hooks/useDebounce';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';
import { StatCard } from '@/components/shared/StatCard';
import { formatDate } from '@/lib/formatters';
import { usePermission } from '@/hooks/usePermission';
import { useCustomers, useCustomerCounts, useCustomerFiltersFromUrl } from '../hooks/useCustomers';
import type { CustomerListItem } from '../types/customer';

const CUSTOMER_TYPES = ['INDIVIDUAL', 'CORPORATE', 'JOINT'];
const STATUSES = ['ACTIVE', 'DORMANT', 'SUSPENDED', 'CLOSED'];
const SEGMENTS = ['PREMIUM', 'STANDARD', 'MICRO', 'SME', 'CORPORATE'];

export default function CustomerListPage() {
  const navigate = useNavigate();
  const canCreate = usePermission('customers', 'create');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { filters, setFilters } = useCustomerFiltersFromUrl();
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  const activeFilters = { ...filters, search: debouncedSearch || undefined };

  const { data, isLoading } = useCustomers(activeFilters);
  const { data: counts } = useCustomerCounts();

  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'customerNumber',
      header: 'Customer #',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
          {row.original.customerNumber}
        </span>
      ),
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
            {row.original.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-sm">{row.original.fullName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs">{row.original.type}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" dot />,
    },
    {
      accessorKey: 'segment',
      header: 'Segment',
      cell: ({ row }) => (
        <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          {row.original.segment}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.phone}</span>,
    },
    {
      accessorKey: 'totalBalance',
      header: 'Total Balance',
      cell: ({ row }) => <MoneyDisplay amount={row.original.totalBalance} size="sm" />,
    },
    {
      accessorKey: 'branchName',
      header: 'Branch',
      cell: ({ row }) => <span className="text-xs">{row.original.branchName}</span>,
    },
    {
      accessorKey: 'dateOpened',
      header: 'Opened',
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.dateOpened)}</span>,
    },
  ];

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ type: undefined, status: undefined, segment: undefined, branchId: undefined, dateFrom: undefined, dateTo: undefined });
  };

  const hasActiveFilters = !!(filters.type || filters.status || filters.segment || filters.branchId);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={counts?.total ?? '—'} />
        <StatCard label="Active" value={counts?.active ?? '—'} />
        <StatCard label="Dormant" value={counts?.dormant ?? '—'} />
        <StatCard label="New (MTD)" value={counts?.newMtd ?? '—'} />
      </div>

      {/* Search + actions bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-lg">
          <input
            type="text"
            placeholder="Search by name, account, BVN, phone..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </button>
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/customers/onboarding')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {filtersOpen && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <select
              value={filters.type || ''}
              onChange={e => setFilters({ type: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={filters.status || ''}
              onChange={e => setFilters({ status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filters.segment || ''}
              onChange={e => setFilters({ segment: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Segments</option>
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>
      )}

      {/* Data table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        enableRowSelection
        enableGlobalFilter={false}
        enableExport
        exportFilename="customers"
        onRowClick={row => navigate(`/customers/${row.id}`)}
        pageSize={filters.size ?? 25}
        emptyMessage="No customers match the current filters"
      />
    </div>
  );
}
