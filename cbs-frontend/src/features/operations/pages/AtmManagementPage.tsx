import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Monitor, Wifi, WifiOff, AlertTriangle, Banknote,
  RefreshCw, PieChart, X, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatCard, DataTable } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDate } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import type { AtmTerminal, AtmJournalEntry } from '../types/atm';
import {
  useAtmJournal,
  useRegisterAtm,
  useUpdateAtmStatus,
  useReplenishAtm,
} from '../hooks/useOperationsData';

// ─── All Terminals columns ──────────────────────────────────────────────────────

function makeTerminalColumns(
  onReplenish: (t: AtmTerminal) => void,
  onUpdateStatus: (t: AtmTerminal) => void,
): ColumnDef<AtmTerminal, unknown>[] {
  return [
    {
      accessorKey: 'terminalId',
      header: 'Terminal ID',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.terminalId}</span>
      ),
    },
    {
      accessorKey: 'branchCode',
      header: 'Branch Code',
      cell: ({ row }) => <span className="text-sm">{row.original.branchCode}</span>,
    },
    {
      accessorKey: 'terminalType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {row.original.terminalType}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'currentCashBalance',
      header: 'Current Balance',
      cell: ({ row }) => (
        <span className="text-sm font-semibold">
          {formatMoney(row.original.currentCashBalance, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: 'minCashThreshold',
      header: 'Min Balance',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatMoney(row.original.minCashThreshold, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: 'maxCashCapacity',
      header: 'Max Withdrawal',
      cell: ({ row }) => (
        <span className="text-sm">{formatMoney(row.original.maxCashCapacity, row.original.currencyCode)}</span>
      ),
    },
    {
      accessorKey: 'lastReplenishedAt',
      header: 'Last Replenish',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastReplenishedAt ? formatDate(row.original.lastReplenishedAt) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'lastHealthCheck',
      header: 'Health Status',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastHealthCheck ? formatDate(row.original.lastHealthCheck) : 'Unknown'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReplenish(row.original)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Replenish
          </button>
          <button
            onClick={() => onUpdateStatus(row.original)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Update Status
          </button>
        </div>
      ),
    },
  ];
}

// ─── Journal columns ────────────────────────────────────────────────────────────

const journalColumns: ColumnDef<AtmJournalEntry, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{formatDate(row.original.createdAt)}</span>,
  },
  {
    accessorKey: 'journalType',
    header: 'Type',
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
        {row.original.journalType}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => <span className="text-sm font-semibold">{formatMoney(row.original.amount)}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Balance After',
    cell: ({ row }) => <span className="text-sm">{row.original.status}</span>,
  },
  {
    accessorKey: 'responseCode',
    header: 'Reference',
    cell: ({ row }) => <span className="text-sm font-mono">{row.original.responseCode}</span>,
  },
  {
    accessorKey: 'errorDescription',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {row.original.errorDescription || '-'}
      </span>
    ),
  },
];

// ─── Register Terminal Dialog ───────────────────────────────────────────────────

function RegisterTerminalDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AtmTerminal>) => void;
  isLoading: boolean;
}) {
  const [terminalId, setTerminalId] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [terminalType, setTerminalType] = useState('ATM');
  const [currentBalance, setCurrentBalance] = useState('');
  const [minimumBalance, setMinimumBalance] = useState('');
  const [maxWithdrawal, setMaxWithdrawal] = useState('');
  const [location, setLocation] = useState('');

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit({
      terminalId,
      branchCode,
      terminalType,
      currentCashBalance: parseFloat(currentBalance) || 0,
      minCashThreshold: parseFloat(minimumBalance) || 0,
      maxCashCapacity: parseFloat(maxWithdrawal) || 0,
      address: location,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Register Terminal</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Terminal ID</label>
              <input className="input w-full" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} placeholder="ATM-001" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch Code</label>
              <input className="input w-full" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="BR001" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Terminal Type</label>
            <select className="input w-full" value={terminalType} onChange={(e) => setTerminalType(e.target.value)}>
              <option value="ATM">ATM</option>
              <option value="CRM">CRM</option>
              <option value="CASH_RECYCLER">Cash Recycler</option>
              <option value="OFFSITE">Offsite</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Balance</label>
              <input className="input w-full" type="number" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Balance</label>
              <input className="input w-full" type="number" value={minimumBalance} onChange={(e) => setMinimumBalance(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Withdrawal</label>
              <input className="input w-full" type="number" value={maxWithdrawal} onChange={(e) => setMaxWithdrawal(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <textarea className="input w-full h-16 resize-none" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Terminal location address" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={isLoading || !terminalId.trim()} className="btn-primary">
              {isLoading ? 'Registering...' : 'Register Terminal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Replenish Dialog ───────────────────────────────────────────────────────────

function ReplenishDialog({
  open,
  terminal,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  terminal: AtmTerminal | null;
  onClose: () => void;
  onSubmit: (terminalId: number) => void;
  isLoading: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [performedBy, setPerformedBy] = useState('');

  if (!open || !terminal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 modal-scrim" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Replenish Terminal</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{terminal.terminalId}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current Balance: {formatMoney(terminal.currentCashBalance, terminal.currencyCode)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input className="input w-full" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference</label>
            <input className="input w-full" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="REF-001" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Narration</label>
            <input className="input w-full" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Cash replenishment" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Performed By</label>
            <input className="input w-full" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Staff name" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={() => onSubmit(terminal.id)}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Processing...' : 'Replenish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: All Terminals ─────────────────────────────────────────────────────────

function AllTerminalsTab({
  terminals,
  isLoading,
  onReplenish,
  onUpdateStatus,
}: {
  terminals: AtmTerminal[];
  isLoading: boolean;
  onReplenish: (t: AtmTerminal) => void;
  onUpdateStatus: (t: AtmTerminal) => void;
}) {
  const columns = useMemo(
    () => makeTerminalColumns(onReplenish, onUpdateStatus),
    [onReplenish, onUpdateStatus],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={terminals}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No terminals registered"
        pageSize={15}
      />
    </div>
  );
}

// ─── Tab: Low Cash Alerts ───────────────────────────────────────────────────────

function LowCashAlertsTab({
  terminals,
  isLoading,
  onReplenish,
}: {
  terminals: AtmTerminal[];
  isLoading: boolean;
  onReplenish: (t: AtmTerminal) => void;
}) {
  const lowCash = useMemo(
    () =>
      terminals
        .filter((t) => t.currentCashBalance < t.minCashThreshold)
        .sort((a, b) => (a.currentCashBalance - a.minCashThreshold) - (b.currentCashBalance - b.minCashThreshold)),
    [terminals],
  );

  const columns = useMemo<ColumnDef<AtmTerminal, unknown>[]>(
    () => [
      {
        accessorKey: 'terminalId',
        header: 'Terminal ID',
        cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.terminalId}</span>,
      },
      {
        accessorKey: 'branchCode',
        header: 'Branch',
        cell: ({ row }) => <span className="text-sm">{row.original.branchCode}</span>,
      },
      {
        accessorKey: 'currentCashBalance',
        header: 'Current Balance',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-red-600">
            {formatMoney(row.original.currentCashBalance, row.original.currencyCode)}
          </span>
        ),
      },
      {
        accessorKey: 'minCashThreshold',
        header: 'Min Threshold',
        cell: ({ row }) => (
          <span className="text-sm">{formatMoney(row.original.minCashThreshold, row.original.currencyCode)}</span>
        ),
      },
      {
        id: 'deficit',
        header: 'Deficit',
        cell: ({ row }) => {
          const deficit = row.original.minCashThreshold - row.original.currentCashBalance;
          return (
            <span className="text-sm font-semibold text-red-600">
              {formatMoney(deficit, row.original.currencyCode)}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => onReplenish(row.original)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Replenish
          </button>
        ),
      },
    ],
    [onReplenish],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={lowCash}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No low cash alerts"
        pageSize={15}
      />
    </div>
  );
}

// ─── Tab: Terminal Journal ──────────────────────────────────────────────────────

function TerminalJournalTab({ terminals }: { terminals: AtmTerminal[] }) {
  const [selectedTerminalId, setSelectedTerminalId] = useState(0);

  const { data: journal = [], isLoading: journalLoading } = useAtmJournal(selectedTerminalId);

  return (
    <div className="p-6 space-y-4">
      <div className="max-w-xs">
        <label className="block text-sm font-medium mb-1">Select Terminal</label>
        <select
          className="input w-full"
          value={selectedTerminalId}
          onChange={(e) => setSelectedTerminalId(Number(e.target.value))}
        >
          <option value={0}>-- Select a terminal --</option>
          {terminals.map((t) => (
            <option key={t.id} value={t.id}>
              {t.terminalId} ({t.branchCode})
            </option>
          ))}
        </select>
      </div>

      {selectedTerminalId ? (
        <DataTable
          columns={journalColumns}
          data={journal}
          isLoading={journalLoading}
          enableGlobalFilter
          emptyMessage="No journal entries"
          pageSize={15}
        />
      ) : (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Select a terminal to view its journal entries.
        </div>
      )}
    </div>
  );
}

// ─── Tab: Fleet Analytics ───────────────────────────────────────────────────────

function FleetAnalyticsTab({
  terminals,
  isLoading,
}: {
  terminals: AtmTerminal[];
  isLoading: boolean;
}) {
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    terminals.forEach((t) => {
      map[t.status] = (map[t.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [terminals]);

  const typeDist = useMemo(() => {
    const map: Record<string, number> = {};
    terminals.forEach((t) => {
      map[t.terminalType] = (map[t.terminalType] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [terminals]);

  const totalCash = useMemo(
    () => terminals.reduce((sum, t) => sum + t.currentCashBalance, 0),
    [terminals],
  );

  const avgBalance = useMemo(
    () => (terminals.length ? totalCash / terminals.length : 0),
    [terminals, totalCash],
  );

  const depositCapable = useMemo(
    () => terminals.filter((t) => t.supportsDeposit).length,
    [terminals],
  );

  const cardlessCapable = useMemo(
    () => terminals.filter((t) => t.supportsCardless).length,
    [terminals],
  );

  const STATUS_COLORS: Record<string, string> = {
    ONLINE: 'bg-green-500',
    OFFLINE: 'bg-red-500',
    MAINTENANCE: 'bg-amber-500',
    OUT_OF_CASH: 'bg-orange-500',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Balance" value={avgBalance} format="money" icon={Banknote} loading={isLoading} />
        <StatCard label="Deposit Capable" value={depositCapable} format="number" icon={Monitor} loading={isLoading} />
        <StatCard label="Cardless Capable" value={cardlessCapable} format="number" icon={Monitor} loading={isLoading} />
        <StatCard label="Terminal Types" value={typeDist.length} format="number" icon={PieChart} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Status Distribution</h3>
          {statusDist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2">
              {statusDist.map(({ status, count }) => {
                const pct = terminals.length ? (count / terminals.length) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-28 truncate">{status.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_COLORS[status] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Type Distribution</h3>
          {typeDist.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2">
              {typeDist.map(({ type, count }) => {
                const pct = terminals.length ? (count / terminals.length) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-28 truncate">{type.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function AtmManagementPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [replenishTarget, setReplenishTarget] = useState<AtmTerminal | null>(null);

  const { data: terminals = [], isLoading } = useQuery<AtmTerminal[]>({
    queryKey: ['atm', 'all-terminals'],
    queryFn: () => apiGet<AtmTerminal[]>('/api/v1/atm/terminals'),
    staleTime: 15_000,
  });

  const registerMutation = useRegisterAtm();
  const updateStatusMutation = useUpdateAtmStatus();
  const replenishMutation = useReplenishAtm();

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const online = terminals.filter((t) => t.status === 'ONLINE').length;
    const offline = terminals.filter((t) => t.status === 'OFFLINE').length;
    const lowCash = terminals.filter((t) => t.currentCashBalance < t.minCashThreshold).length;
    const totalCash = terminals.reduce((sum, t) => sum + t.currentCashBalance, 0);
    return { total: terminals.length, online, offline, lowCash, totalCash };
  }, [terminals]);

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleRegister = (data: Partial<AtmTerminal>) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Terminal registered successfully');
        setShowRegister(false);
      },
      onError: () => toast.error('Failed to register terminal'),
    });
  };

  const handleReplenish = (terminalId: number) => {
    replenishMutation.mutate(terminalId, {
      onSuccess: () => {
        toast.success('Terminal replenished successfully');
        setReplenishTarget(null);
      },
      onError: () => toast.error('Failed to replenish terminal'),
    });
  };

  const handleUpdateStatus = (terminal: AtmTerminal) => {
    updateStatusMutation.mutate(terminal.id, {
      onSuccess: () => toast.success(`Status updated for ${terminal.terminalId}`),
      onError: () => toast.error('Failed to update status'),
    });
  };

  // ─── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs = useMemo(
    () => [
      {
        id: 'all',
        label: 'All Terminals',
        icon: Monitor,
        badge: terminals.length,
        content: (
          <AllTerminalsTab
            terminals={terminals}
            isLoading={isLoading}
            onReplenish={setReplenishTarget}
            onUpdateStatus={handleUpdateStatus}
          />
        ),
      },
      {
        id: 'low-cash',
        label: 'Low Cash Alerts',
        icon: AlertTriangle,
        badge: stats.lowCash,
        content: (
          <LowCashAlertsTab
            terminals={terminals}
            isLoading={isLoading}
            onReplenish={setReplenishTarget}
          />
        ),
      },
      {
        id: 'journal',
        label: 'Terminal Journal',
        content: <TerminalJournalTab terminals={terminals} />,
      },
      {
        id: 'analytics',
        label: 'Fleet Analytics',
        icon: PieChart,
        content: <FleetAnalyticsTab terminals={terminals} isLoading={isLoading} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [terminals, isLoading, stats.lowCash],
  );

  return (
    <>
      <PageHeader
        title="ATM Fleet Management"
        subtitle={`${stats.total} terminals across fleet`}
        actions={
          <button
            onClick={() => setShowRegister(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Terminal
          </button>
        }
      />

      <div className="page-container space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Terminals" value={stats.total} format="number" icon={Monitor} loading={isLoading} />
          <StatCard label="Online" value={stats.online} format="number" icon={Wifi} loading={isLoading} />
          <StatCard label="Offline" value={stats.offline} format="number" icon={WifiOff} loading={isLoading} />
          <StatCard label="Low Cash" value={stats.lowCash} format="number" icon={AlertTriangle} loading={isLoading} />
          <StatCard label="Total Cash Held" value={stats.totalCash} format="money" icon={Banknote} loading={isLoading} compact />
        </div>

        {/* Tabs */}
        <TabsPage tabs={tabs} defaultTab="all" />
      </div>

      {/* Dialogs */}
      <RegisterTerminalDialog
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSubmit={handleRegister}
        isLoading={registerMutation.isPending}
      />
      <ReplenishDialog
        open={!!replenishTarget}
        terminal={replenishTarget}
        onClose={() => setReplenishTarget(null)}
        onSubmit={handleReplenish}
        isLoading={replenishMutation.isPending}
      />
    </>
  );
}
