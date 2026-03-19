import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { Landmark, Users, Wallet, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { apiGet } from '@/lib/api';

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

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', 'list'],
    queryFn: () => apiGet<AccountRow[]>('/api/v1/accounts'),
  });

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length;
  const totalBalance = accounts.reduce((sum, a) => sum + (a.availableBalance ?? 0), 0);
  const currencies = new Set(accounts.map((a) => a.currency ?? 'NGN'));

  return (
    <>
      <PageHeader title="All Accounts" subtitle="Account listing and management" />
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
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={accounts}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="accounts"
          onRowClick={(row) => navigate(`/accounts/${row.id}`)}
          emptyMessage="No accounts found"
          pageSize={15}
        />
      </div>
    </>
  );
}
