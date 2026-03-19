import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermission } from '@/hooks/usePermission';
import { formatDateTime } from '@/lib/formatters';
import { useCustomerCounts, useCustomerFiltersFromUrl, useCustomers } from '../hooks/useCustomers';
import type { CustomerListItem } from '../types/customer';

const CUSTOMER_TYPES = ['INDIVIDUAL', 'SOLE_PROPRIETOR', 'SME', 'CORPORATE', 'TRUST', 'GOVERNMENT', 'NGO'];
const STATUSES = ['PROSPECT', 'ACTIVE', 'DORMANT', 'SUSPENDED', 'CLOSED', 'DECEASED'];

export default function CustomerListPage() {
  const navigate = useNavigate();
  const canCreate = usePermission('customers', 'create');
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: 'customerNumber',
      header: 'Customer #',
      cell: ({ row }) => <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{row.original.customerNumber}</span>,
    },
    {
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => {
        const initials = (row.original.fullName || '')
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {initials || '--'}
            </div>
            <span className="text-sm font-medium">{row.original.fullName || 'Unnamed customer'}</span>
          </div>
        );
      },
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
      accessorKey: 'riskRating',
      header: 'Risk',
      cell: ({ row }) => <StatusBadge status={row.original.riskRating ?? 'MEDIUM'} size="sm" />,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.phone ?? '—'}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.email ?? '—'}</span>,
    },
    {
      accessorKey: 'branchCode',
      header: 'Branch',
      cell: ({ row }) => <span className="text-xs">{row.original.branchCode ?? '—'}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => <span className="text-xs">{row.original.createdAt ? formatDateTime(row.original.createdAt) : '—'}</span>,
    },
  ];

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ search: undefined, type: undefined, status: undefined, page: 0 });
  };

  const hasActiveFilters = Boolean(filters.search || filters.type || filters.status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Customers" value={counts?.total ?? '—'} />
        <StatCard label="Active" value={counts?.active ?? '—'} />
        <StatCard label="Dormant" value={counts?.dormant ?? '—'} />
        <StatCard label="New (MTD)" value={counts?.newMtd ?? '—'} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-lg flex-1">
          <input
            type="text"
            placeholder="Search by name, CIF, email, or phone..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
        </button>

        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/customers/onboarding')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <select
              value={filters.type || ''}
              onChange={(event) => setFilters({ type: event.target.value || undefined })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">All Types</option>
              {CUSTOMER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filters.status || ''}
              onChange={(event) => setFilters({ status: event.target.value || undefined })}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        enableRowSelection
        enableExport
        exportFilename="customers"
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        pageSize={data?.page.size ?? filters.size ?? 25}
        emptyMessage="No customers match the current filters"
      />
    </div>
  );
}
