import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Lock, Inbox, AlertTriangle, Banknote, Plus, Loader2,
  CheckCircle, XCircle, ArrowDownToLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, DataTable, StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate, formatDateTime } from '@/lib/formatters';
import { apiGet, apiPost } from '@/lib/api';
import { lockboxesApi } from '../api/lockboxApi';
import type { LockboxItem } from '../types/lockbox';
import {
  useLockboxException,
  useLockboxDeposit,
} from '../hooks/useOperationsData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lockbox {
  id: number;
  lockboxNumber: string;
  customerName: string;
  customerId: number;
  location: string;
  status: string;
  itemsToday: number;
  totalMtd: number;
  lastItemDate: string;
  createdAt: string;
}

interface RegisterLockboxForm {
  lockboxNumber: string;
  customerId: string;
  customerName: string;
  location: string;
}

const DEFAULT_REGISTER_FORM: RegisterLockboxForm = {
  lockboxNumber: '',
  customerId: '',
  customerName: '',
  location: '',
};

// ─── Lockboxes Tab ───────────────────────────────────────────────────────────

function LockboxesTab() {
  const { data: lockboxes = [], isLoading } = useQuery({
    queryKey: ['lockboxes', 'list'],
    queryFn: () => apiGet<Lockbox[]>('/api/v1/lockboxes'),
    staleTime: 15_000,
  });

  const columns = useMemo<ColumnDef<Lockbox, unknown>[]>(
    () => [
      {
        accessorKey: 'lockboxNumber',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.lockboxNumber}</span>
        ),
      },
      { accessorKey: 'customerName', header: 'Customer' },
      { accessorKey: 'location', header: 'Location' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'itemsToday',
        header: 'Items Today',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.itemsToday.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: 'totalMtd',
        header: 'Total MTD',
        cell: ({ row }) => (
          <span className="text-sm font-medium">{formatMoney(row.original.totalMtd)}</span>
        ),
      },
      {
        accessorKey: 'lastItemDate',
        header: 'Last Item',
        cell: ({ row }) =>
          row.original.lastItemDate ? (
            <span className="text-sm">{formatDateTime(row.original.lastItemDate)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={lockboxes}
        isLoading={isLoading}
        enableGlobalFilter
        pageSize={15}
      />
    </div>
  );
}

// ─── Items Tab ───────────────────────────────────────────────────────────────

function ItemsTab() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['lockboxes', 'items-all'],
    queryFn: () => apiGet<LockboxItem[]>('/api/v1/lockboxes/items'),
    staleTime: 15_000,
  });

  const exceptionMutation = useLockboxException();
  const depositMutation = useLockboxDeposit();

  const handleProcess = (item: LockboxItem) => {
    depositMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Item ${item.itemReference} deposited`);
        qc.invalidateQueries({ queryKey: ['lockboxes'] });
      },
      onError: () => toast.error('Failed to process item'),
    });
  };

  const handleException = (item: LockboxItem) => {
    exceptionMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Item ${item.itemReference} marked as exception`);
        qc.invalidateQueries({ queryKey: ['lockboxes'] });
      },
      onError: () => toast.error('Failed to mark exception'),
    });
  };

  const handleDeposit = (item: LockboxItem) => {
    depositMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Item ${item.itemReference} deposited`);
        qc.invalidateQueries({ queryKey: ['lockboxes'] });
      },
      onError: () => toast.error('Failed to deposit item'),
    });
  };

  const columns = useMemo<ColumnDef<LockboxItem, unknown>[]>(
    () => [
      {
        accessorKey: 'itemReference',
        header: 'Item ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.itemReference}</span>
        ),
      },
      {
        accessorKey: 'lockboxId',
        header: 'Lockbox',
        cell: ({ row }) => <span className="text-sm">{row.original.lockboxId}</span>,
      },
      { accessorKey: 'drawerName', header: 'Payer' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatMoney(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'chequeNumber',
        header: 'Check Number',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.chequeNumber}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Received Date',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'exceptionReason',
        header: 'Exception Reason',
        cell: ({ row }) =>
          row.original.exceptionReason ? (
            <span className="text-sm text-red-600">{row.original.exceptionReason}</span>
          ) : (
            <span className="text-sm text-muted-foreground">--</span>
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const { status } = row.original;
          if (status === 'DEPOSITED' || status === 'EXCEPTION') return null;
          return (
            <div className="flex gap-1.5">
              <button
                onClick={() => handleProcess(row.original)}
                disabled={depositMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3 h-3" />
                Process
              </button>
              <button
                onClick={() => handleException(row.original)}
                disabled={exceptionMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3 h-3" />
                Exception
              </button>
              <button
                onClick={() => handleDeposit(row.original)}
                disabled={depositMutation.isPending}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <ArrowDownToLine className="w-3 h-3" />
                Deposit
              </button>
            </div>
          );
        },
      },
    ],
    [depositMutation.isPending, exceptionMutation.isPending],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        enableGlobalFilter
        pageSize={15}
      />
    </div>
  );
}

// ─── Exceptions Tab ──────────────────────────────────────────────────────────

function ExceptionsTab() {
  const qc = useQueryClient();
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['lockboxes', 'items-all'],
    queryFn: () => apiGet<LockboxItem[]>('/api/v1/lockboxes/items'),
    staleTime: 15_000,
  });

  const exceptions = useMemo(
    () => allItems.filter((item) => item.status === 'EXCEPTION'),
    [allItems],
  );

  const depositMutation = useLockboxDeposit();

  const handleResolve = (item: LockboxItem) => {
    depositMutation.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Exception on ${item.itemReference} resolved and deposited`);
        qc.invalidateQueries({ queryKey: ['lockboxes'] });
      },
      onError: () => toast.error('Failed to resolve exception'),
    });
  };

  const columns = useMemo<ColumnDef<LockboxItem, unknown>[]>(
    () => [
      {
        accessorKey: 'itemReference',
        header: 'Item ID',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.itemReference}</span>
        ),
      },
      {
        accessorKey: 'lockboxId',
        header: 'Lockbox',
        cell: ({ row }) => <span className="text-sm">{row.original.lockboxId}</span>,
      },
      { accessorKey: 'drawerName', header: 'Payer' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {formatMoney(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: 'chequeNumber',
        header: 'Check Number',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.chequeNumber}</span>
        ),
      },
      {
        accessorKey: 'exceptionReason',
        header: 'Exception Reason',
        cell: ({ row }) => (
          <span className="text-sm text-red-600 font-medium">
            {row.original.exceptionReason}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Received Date',
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => handleResolve(row.original)}
            disabled={depositMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            Resolve & Deposit
          </button>
        ),
      },
    ],
    [depositMutation.isPending],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={exceptions}
        isLoading={isLoading}
        enableGlobalFilter
        pageSize={15}
        emptyMessage="No exceptions pending"
      />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function LockboxPage() {
  const qc = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState<RegisterLockboxForm>(DEFAULT_REGISTER_FORM);

  // Stats data
  const { data: lockboxes = [] } = useQuery({
    queryKey: ['lockboxes', 'list'],
    queryFn: () => apiGet<Lockbox[]>('/api/v1/lockboxes'),
    staleTime: 15_000,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['lockboxes', 'items-all'],
    queryFn: () => apiGet<LockboxItem[]>('/api/v1/lockboxes/items'),
    staleTime: 15_000,
  });

  const registerMutation = useMutation({
    mutationFn: (data: Partial<Lockbox>) => apiPost<Lockbox>('/api/v1/lockboxes', data),
    onSuccess: () => {
      toast.success('Lockbox registered successfully');
      qc.invalidateQueries({ queryKey: ['lockboxes'] });
      setShowRegister(false);
      setForm(DEFAULT_REGISTER_FORM);
    },
    onError: () => toast.error('Failed to register lockbox'),
  });

  const activeLockboxes = lockboxes.filter((l) => l.status === 'ACTIVE').length;

  const today = new Date().toISOString().split('T')[0];
  const itemsToday = allItems.filter(
    (item) => item.createdAt && item.createdAt.startsWith(today),
  ).length;

  const exceptionsPending = allItems.filter((item) => item.status === 'EXCEPTION').length;

  const depositsToday = allItems.filter(
    (item) =>
      item.status === 'DEPOSITED' &&
      item.depositedAt &&
      item.depositedAt.startsWith(today),
  ).length;

  const handleRegisterSubmit = () => {
    if (!form.lockboxNumber || !form.customerId || !form.location) {
      toast.error('Please fill in all required fields');
      return;
    }
    registerMutation.mutate({
      lockboxNumber: form.lockboxNumber,
      customerId: Number(form.customerId),
      customerName: form.customerName,
      location: form.location,
    } as Partial<Lockbox>);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Lockbox Operations"
        subtitle="Manage lockboxes, process items, and handle exceptions"
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Lockbox
          </button>
        }
      />

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Active Lockboxes" value={activeLockboxes} format="number" icon={Lock} />
          <StatCard label="Items Today" value={itemsToday} format="number" icon={Inbox} />
          <StatCard
            label="Exceptions Pending"
            value={exceptionsPending}
            format="number"
            icon={AlertTriangle}
            trend={exceptionsPending > 0 ? 'down' : undefined}
          />
          <StatCard label="Deposits Today" value={depositsToday} format="number" icon={Banknote} />
        </div>
      </div>

      <TabsPage
        tabs={[
          {
            id: 'lockboxes',
            label: 'Lockboxes',
            icon: Lock,
            content: <LockboxesTab />,
          },
          {
            id: 'items',
            label: 'Items',
            icon: Inbox,
            badge: itemsToday,
            content: <ItemsTab />,
          },
          {
            id: 'exceptions',
            label: 'Exceptions',
            icon: AlertTriangle,
            badge: exceptionsPending,
            content: <ExceptionsTab />,
          },
        ]}
        defaultTab="lockboxes"
      />

      {/* Register Lockbox Dialog */}
      {showRegister && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowRegister(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-semibold">Register Lockbox</h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Lockbox Number *</label>
                  <input
                    type="text"
                    value={form.lockboxNumber}
                    onChange={(e) => setForm((f) => ({ ...f, lockboxNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. LBX-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Customer ID *</label>
                    <input
                      type="text"
                      value={form.customerId}
                      onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Customer Name</label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, customerName: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Location *</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Main Office PO Box"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowRegister(false);
                    setForm(DEFAULT_REGISTER_FORM);
                  }}
                  disabled={registerMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegisterSubmit}
                  disabled={registerMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
