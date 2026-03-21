import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { Landmark, Users, Wallet, TrendingUp, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { apiGet } from '@/lib/api';

const ACCOUNT_STATUSES = [
  'ALL', 'ACTIVE', 'PENDING_ACTIVATION', 'DORMANT', 'FROZEN',
  'PND_DEBIT', 'PND_CREDIT', 'CLOSED', 'ESCHEAT',
] as const;

interface AccountRow {
  id: number;
  accountNumber: string;
  accountName: string;
  productCategory: string;
  currency: string;
  status: string;
  availableBalance: number;
  ledgerBalance: number;
  branchCode: string;
  openedDate: string;
}

const columns: ColumnDef<AccountRow, unknown>[] = [
  {
    accessorKey: 'accountNumber',
    header: 'Account Number',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: 'accountName',
    header: 'Account Name',
    cell: ({ getValue }) => (
      <span className="text-sm font-medium">{String(getValue() ?? '—')}</span>
    ),
  },
  {
    accessorKey: 'productCategory',
    header: 'Type',
    cell: ({ getValue }) => (
      <span className="text-sm">{String(getValue() ?? 'N/A')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue() ?? 'ACTIVE')} />,
  },
  {
    accessorKey: 'currency',
    header: 'Currency',
    cell: ({ getValue }) => (
      <span className="text-xs font-mono">{String(getValue() ?? 'NGN')}</span>
    ),
  },
  {
    accessorKey: 'availableBalance',
    header: 'Available Balance',
    cell: ({ row }) => (
      <span className="text-sm font-mono text-right block">
        {formatMoney(row.original.availableBalance ?? 0, row.original.currency ?? 'NGN')}
      </span>
    ),
  },
  {
    accessorKey: 'branchCode',
    header: 'Branch',
    cell: ({ getValue }) => (
      <span className="text-xs">{String(getValue() ?? '—')}</span>
    ),
  },
];

export function AccountListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  useEffect(() => { document.title = 'All Accounts | CBS'; }, []);

  // Ctrl+N → Open new account
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/accounts/open');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const queryParams: Record<string, unknown> = {};
  if (statusFilter !== 'ALL') queryParams.status = statusFilter;
  if (branchFilter !== 'ALL') queryParams.branch = branchFilter;

  const { data: accounts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['accounts', 'list', statusFilter, branchFilter],
    queryFn: () => apiGet<AccountRow[]>('/api/v1/accounts', queryParams),
  });

  // Fetch real backend summary stats
  const { data: summary } = useQuery({
    queryKey: ['accounts', 'summary'],
    queryFn: () => apiGet<Record<string, unknown>>('/api/v1/accounts/summary').catch(() => null),
    staleTime: 60_000,
  });

  const totalAccounts = (summary?.totalAccounts as number) ?? accounts.length;
  const activeAccounts = (summary?.count_ACTIVE as number) ?? accounts.filter((a) => a.status === 'ACTIVE').length;
  const totalBalance = (summary?.totalBalance as number) ?? accounts.reduce((sum, a) => sum + (a.availableBalance ?? 0), 0);
  const currencies = new Set(accounts.map((a) => a.currency ?? 'NGN'));
  const dormantCount = (summary?.count_DORMANT as number) ?? accounts.filter(a => a.status === 'DORMANT').length;

  if (isError) {
    return (
      <>
        <PageHeader title="All Accounts" subtitle="Account listing and management" />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">Failed to load accounts</p>
            <p className="text-sm text-muted-foreground mt-1">
              Unable to retrieve account data. Please check your connection.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="All Accounts"
        subtitle="Account listing and management"
        actions={
          <button
            onClick={() => navigate('/accounts/open')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Open Account
          </button>
        }
      />
      <div className="page-container space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Accounts"
            value={totalAccounts}
            format="number"
            icon={Landmark}
            loading={isLoading}
          />
          <StatCard
            label="Active Accounts"
            value={activeAccounts}
            format="number"
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            label="Total Balance"
            value={totalBalance}
            format="money"
            compact
            icon={Wallet}
            loading={isLoading}
          />
          <StatCard
            label="Currencies"
            value={currencies.size}
            format="number"
            icon={TrendingUp}
            loading={isLoading}
          />
          {dormantCount > 0 && (
            <StatCard
              label="Dormant"
              value={dormantCount}
              format="number"
              loading={isLoading}
            />
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="ALL">All Branches</option>
              {[...new Set(accounts.map((a) => a.branchCode).filter(Boolean))].sort().map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          {(statusFilter !== 'ALL' || branchFilter !== 'ALL') && (
            <button
              onClick={() => { setStatusFilter('ALL'); setBranchFilter('ALL'); }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={accounts}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="accounts"
          onRowClick={(row) => navigate(`/accounts/${row.accountNumber}`)}
          emptyMessage="No accounts found"
          pageSize={15}
        />
      </div>
    </>
  );
}
