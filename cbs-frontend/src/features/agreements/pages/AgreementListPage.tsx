import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { useAgreements } from '../hooks/useAgreementsExt';
import type { CustomerAgreement } from '../types/agreementExt';
import { addDays, parseISO } from 'date-fns';

export function AgreementListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: agreements = [], isLoading } = useAgreements();

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = [...agreements];
    if (statusFilter) {
      result = result.filter(a => a.status === statusFilter);
    }
    if (typeFilter) {
      const q = typeFilter.toLowerCase();
      result = result.filter(a => a.agreementType.toLowerCase().includes(q));
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(a =>
        a.agreementNumber?.toLowerCase().includes(q) ||
        a.title?.toLowerCase().includes(q) ||
        String(a.customerId).includes(q),
      );
    }
    if (dateFrom) {
      result = result.filter(a => a.effectiveFrom && a.effectiveFrom >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(a => a.effectiveFrom && a.effectiveFrom <= dateTo);
    }
    return result;
  }, [agreements, statusFilter, typeFilter, searchText, dateFrom, dateTo]);

  // Computed stats
  const totalCount = agreements.length;
  const activeCount = agreements.filter(a => a.status === 'ACTIVE').length;
  const pendingCount = agreements.filter(a => a.status === 'DRAFT' || a.status === 'PENDING_SIGNATURE').length;
  const expiringSoonCount = useMemo(() => {
    const threshold = addDays(new Date(), 30);
    return agreements.filter(a => {
      if (a.status !== 'ACTIVE' || !a.effectiveTo) return false;
      try { return parseISO(a.effectiveTo) <= threshold; } catch { return false; }
    }).length;
  }, [agreements]);

  const columns: ColumnDef<CustomerAgreement>[] = [
    {
      accessorKey: 'agreementNumber',
      header: 'Agreement #',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-primary cursor-pointer hover:underline">
          {row.original.agreementNumber}
        </span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: 'customerId',
      header: 'Customer ID',
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.customerId}</span>,
    },
    {
      accessorKey: 'agreementType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.agreementType.replace(/_/g, ' ')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'effectiveFrom',
      header: 'Effective From',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.effectiveFrom ? formatDate(row.original.effectiveFrom) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'effectiveTo',
      header: 'Effective To',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.effectiveTo ? formatDate(row.original.effectiveTo) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'autoRenew',
      header: 'Auto-Renew',
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          row.original.autoRenew
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {row.original.autoRenew ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      accessorKey: 'signedDate',
      header: 'Signed Date',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.signedDate ? formatDate(row.original.signedDate) : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customer Agreements"
        subtitle="Manage customer agreements, mandates and terms"
        actions={
          <button
            onClick={() => navigate('/agreements/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Agreement
          </button>
        }
      />
      <div className="page-container space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Total Agreements" value={totalCount} loading={isLoading} />
          <StatCard icon={CheckCircle} label="Active" value={activeCount} loading={isLoading} />
          <StatCard icon={Clock} label="Pending Signature" value={pendingCount} loading={isLoading} />
          <StatCard icon={AlertTriangle} label="Expiring Soon" value={expiringSoonCount} loading={isLoading} />
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by number, title, customer..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_SIGNATURE">Pending Signature</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
            <option value="RENEWED">Renewed</option>
          </select>
          <input
            type="text"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            placeholder="Filter by type..."
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            title="Effective from"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            title="Effective to"
          />
          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} of {totalCount} agreements
          </span>
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="customer-agreements"
          onRowClick={(row) => navigate(`/agreements/${row.id}`)}
          emptyMessage="No agreements match your filters"
          pageSize={15}
        />
      </div>
    </>
  );
}

// Inline stat card since StatCard import from shared uses different format prop
function StatCard({ icon: Icon, label, value, loading }: { icon: React.ElementType; label: string; value: number; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-4 w-20 bg-muted rounded mb-2" />
        <div className="h-7 w-12 bg-muted rounded" />
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
