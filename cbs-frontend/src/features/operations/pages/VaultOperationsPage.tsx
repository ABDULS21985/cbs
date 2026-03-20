import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Vault as VaultIcon, ArrowRightLeft, Plus, X,
  Banknote, ArrowDownToLine, ArrowUpFromLine, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { TabsPage, StatCard, DataTable } from '@/components/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatMoney, formatDateTime } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import type { Vault, VaultTransaction } from '../types/vault';
import type { CashMovement } from '../types/cashVault';
import {
  useVaultCashIn,
  useVaultCashOut,
  useVaultTransfer,
  useRegisterCashMovement,
  useConfirmCashMovement,
} from '../hooks/useOperationsData';

// ─── Type badge helpers ─────────────────────────────────────────────────────────

const VAULT_TYPE_COLORS: Record<string, string> = {
  MAIN: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SUBSIDIARY: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ATM: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  TELLER: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const TXN_TYPE_COLORS: Record<string, string> = {
  CASH_IN: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CASH_OUT: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  TRANSFER: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

// ─── Vault columns ──────────────────────────────────────────────────────────────

function makeVaultColumns(
  onCashIn: (v: Vault) => void,
  onCashOut: (v: Vault) => void,
  onTransfer: (v: Vault) => void,
): ColumnDef<Vault, unknown>[] {
  return [
    {
      accessorKey: 'vaultCode',
      header: 'Vault Code',
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.vaultCode}</span>,
    },
    {
      accessorKey: 'vaultName',
      header: 'Name',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.vaultName}</span>,
    },
    {
      accessorKey: 'branchCode',
      header: 'Branch',
      cell: ({ row }) => <span className="text-sm">{row.original.branchCode}</span>,
    },
    {
      accessorKey: 'vaultType',
      header: 'Type',
      cell: ({ row }) => {
        const vt = row.original.vaultType as string;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${VAULT_TYPE_COLORS[vt] || 'bg-gray-100 text-gray-600'}`}>
            {vt}
          </span>
        );
      },
    },
    {
      accessorKey: 'currencyCode',
      header: 'Currency',
      cell: ({ row }) => <span className="text-sm">{row.original.currencyCode}</span>,
    },
    {
      accessorKey: 'currentBalance',
      header: 'Current Balance',
      cell: ({ row }) => (
        <span className="text-sm font-bold">
          {formatMoney(row.original.currentBalance, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: 'minimumBalance',
      header: 'Min Balance',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatMoney(row.original.minimumBalance, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: 'maximumBalance',
      header: 'Max Balance',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatMoney(row.original.maximumBalance, row.original.currencyCode)}
        </span>
      ),
    },
    {
      accessorKey: 'insuranceLimit',
      header: 'Insurance Limit',
      cell: ({ row }) => (
        <span className="text-sm">{formatMoney(row.original.insuranceLimit, row.original.currencyCode)}</span>
      ),
    },
    {
      accessorKey: 'custodian',
      header: 'Custodian',
      cell: ({ row }) => <span className="text-sm">{row.original.custodian}</span>,
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCashIn(row.original)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition-colors"
          >
            <ArrowDownToLine className="w-3 h-3" />
            In
          </button>
          <button
            onClick={() => onCashOut(row.original)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition-colors"
          >
            <ArrowUpFromLine className="w-3 h-3" />
            Out
          </button>
          <button
            onClick={() => onTransfer(row.original)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
          >
            <ArrowRightLeft className="w-3 h-3" />
            Transfer
          </button>
        </div>
      ),
    },
  ];
}

// ─── Transaction columns ────────────────────────────────────────────────────────

const transactionColumns: ColumnDef<VaultTransaction, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.createdAt)}</span>,
  },
  {
    id: 'vaultCode',
    header: 'Vault',
    cell: ({ row }) => (
      <span className="text-sm font-mono">{row.original.vault?.vaultCode ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ row }) => {
      const tt = row.original.transactionType;
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TXN_TYPE_COLORS[tt] || 'bg-gray-100 text-gray-600'}`}>
          {tt.replace(/_/g, ' ')}
        </span>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="text-sm font-semibold">
        {formatMoney(row.original.amount, row.original.currencyCode)}
      </span>
    ),
  },
  {
    accessorKey: 'runningBalance',
    header: 'Running Balance',
    cell: ({ row }) => (
      <span className="text-sm">{formatMoney(row.original.runningBalance, row.original.currencyCode)}</span>
    ),
  },
  {
    id: 'counterparty',
    header: 'Counterparty Vault',
    cell: ({ row }) => (
      <span className="text-sm font-mono">
        {row.original.counterpartyVault?.vaultCode ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => <span className="text-sm font-mono">{row.original.reference}</span>,
  },
  {
    accessorKey: 'narration',
    header: 'Narration',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
        {row.original.narration || '-'}
      </span>
    ),
  },
  {
    accessorKey: 'performedBy',
    header: 'Performed By',
    cell: ({ row }) => <span className="text-sm">{row.original.performedBy}</span>,
  },
];

// ─── Cash Movement columns ──────────────────────────────────────────────────────

function makeMovementColumns(
  onConfirm: (ref: string) => void,
): ColumnDef<CashMovement, unknown>[] {
  return [
    {
      id: 'route',
      header: 'From -> To',
      cell: ({ row }) => (
        <span className="text-sm font-mono">
          {row.original.fromVaultCode} <ArrowRightLeft className="w-3 h-3 inline mx-1" /> {row.original.toVaultCode}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm font-semibold">{formatMoney(row.original.amount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'currency',
      header: 'Currency',
      cell: ({ row }) => <span className="text-sm">{row.original.currency}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} dot />,
    },
    {
      accessorKey: 'movementRef',
      header: 'Reference',
      cell: ({ row }) => <span className="text-sm font-mono">{row.original.movementRef}</span>,
    },
    {
      accessorKey: 'authorizedBy',
      header: 'Performed By',
      cell: ({ row }) => <span className="text-sm">{row.original.authorizedBy}</span>,
    },
    {
      accessorKey: 'actualDate',
      header: 'Recorded At',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.actualDate ? formatDateTime(row.original.actualDate) : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.status === 'DELIVERED' || row.original.status === 'CONFIRMED') return null;
        return (
          <button
            onClick={() => onConfirm(row.original.movementRef)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 transition-colors"
          >
            <Truck className="w-3 h-3" />
            Confirm Delivery
          </button>
        );
      },
    },
  ];
}

// ─── Dialog: Generic form dialog ────────────────────────────────────────────────

function FormDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Dialog: Create Vault ───────────────────────────────────────────────────────

function CreateVaultDialog({
  open,
  onClose,
  vaults,
}: {
  open: boolean;
  onClose: () => void;
  vaults: Vault[];
}) {
  const [vaultCode, setVaultCode] = useState('');
  const [vaultName, setVaultName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [vaultType, setVaultType] = useState('MAIN');
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const [minimumBalance, setMinimumBalance] = useState('');
  const [maximumBalance, setMaximumBalance] = useState('');
  const [insuranceLimit, setInsuranceLimit] = useState('');
  const [custodian, setCustodian] = useState('');

  // No create vault API exists yet; just show toast
  const handleSubmit = () => {
    toast.success(`Vault ${vaultCode} creation requested`);
    onClose();
  };

  return (
    <FormDialog open={open} title="Create Vault" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Vault Code</label>
          <input className="input w-full" value={vaultCode} onChange={(e) => setVaultCode(e.target.value)} placeholder="VLT-001" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vault Name</label>
          <input className="input w-full" value={vaultName} onChange={(e) => setVaultName(e.target.value)} placeholder="Main Vault" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Branch Code</label>
          <input className="input w-full" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="BR001" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vault Type</label>
          <select className="input w-full" value={vaultType} onChange={(e) => setVaultType(e.target.value)}>
            <option value="MAIN">MAIN</option>
            <option value="SUBSIDIARY">SUBSIDIARY</option>
            <option value="ATM">ATM</option>
            <option value="TELLER">TELLER</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Currency</label>
        <input className="input w-full" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="NGN" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Min Balance</label>
          <input className="input w-full" type="number" value={minimumBalance} onChange={(e) => setMinimumBalance(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Balance</label>
          <input className="input w-full" type="number" value={maximumBalance} onChange={(e) => setMaximumBalance(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Insurance Limit</label>
          <input className="input w-full" type="number" value={insuranceLimit} onChange={(e) => setInsuranceLimit(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Custodian</label>
        <input className="input w-full" value={custodian} onChange={(e) => setCustodian(e.target.value)} placeholder="Custodian name" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={handleSubmit} disabled={!vaultCode.trim()} className="btn-primary">
          Create Vault
        </button>
      </div>
    </FormDialog>
  );
}

// ─── Dialog: Cash In / Cash Out ─────────────────────────────────────────────────

function CashActionDialog({
  open,
  vault,
  action,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  vault: Vault | null;
  action: 'in' | 'out';
  onClose: () => void;
  onSubmit: (id: number) => void;
  isLoading: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');
  const [performedBy, setPerformedBy] = useState('');

  if (!vault) return null;

  const label = action === 'in' ? 'Cash In' : 'Cash Out';

  return (
    <FormDialog open={open} title={`${label} - ${vault.vaultCode}`} onClose={onClose}>
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm font-medium">{vault.vaultName}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Current Balance: {formatMoney(vault.currentBalance, vault.currencyCode)}
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
        <input className="input w-full" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Transaction narration" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Performed By</label>
        <input className="input w-full" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Staff name" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button
          onClick={() => onSubmit(vault.id)}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Processing...' : label}
        </button>
      </div>
    </FormDialog>
  );
}

// ─── Dialog: Transfer ───────────────────────────────────────────────────────────

function TransferDialog({
  open,
  sourceVault,
  vaults,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  sourceVault: Vault | null;
  vaults: Vault[];
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const [toVault, setToVault] = useState('');
  const [amount, setAmount] = useState('');
  const [performedBy, setPerformedBy] = useState('');

  if (!sourceVault) return null;

  return (
    <FormDialog open={open} title={`Transfer from ${sourceVault.vaultCode}`} onClose={onClose}>
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm font-medium">{sourceVault.vaultName}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Balance: {formatMoney(sourceVault.currentBalance, sourceVault.currencyCode)}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Destination Vault</label>
        <select className="input w-full" value={toVault} onChange={(e) => setToVault(e.target.value)}>
          <option value="">-- Select vault --</option>
          {vaults
            .filter((v) => v.id !== sourceVault.id)
            .map((v) => (
              <option key={v.id} value={v.vaultCode}>
                {v.vaultCode} - {v.vaultName}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <input className="input w-full" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Performed By</label>
        <input className="input w-full" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Staff name" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={onSubmit} disabled={isLoading || !toVault} className="btn-primary">
          {isLoading ? 'Transferring...' : 'Transfer'}
        </button>
      </div>
    </FormDialog>
  );
}

// ─── Dialog: Record Movement ────────────────────────────────────────────────────

function RecordMovementDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [fromVaultCode, setFromVaultCode] = useState('');
  const [toVaultCode, setToVaultCode] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [reference, setReference] = useState('');
  const [performedBy, setPerformedBy] = useState('');

  return (
    <FormDialog open={open} title="Record Cash Movement" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Vault Code</label>
          <input className="input w-full" value={fromVaultCode} onChange={(e) => setFromVaultCode(e.target.value)} placeholder="VLT-001" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Vault Code</label>
          <input className="input w-full" value={toVaultCode} onChange={(e) => setToVaultCode(e.target.value)} placeholder="VLT-002" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input className="input w-full" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <input className="input w-full" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="NGN" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Reference</label>
        <input className="input w-full" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="MOV-001" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Performed By</label>
        <input className="input w-full" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Staff name" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button
          onClick={() =>
            onSubmit({ fromVaultCode, toVaultCode, amount: parseFloat(amount) || 0, currency, movementRef: reference })
          }
          disabled={isLoading || !fromVaultCode.trim() || !toVaultCode.trim()}
          className="btn-primary"
        >
          {isLoading ? 'Recording...' : 'Record Movement'}
        </button>
      </div>
    </FormDialog>
  );
}

// ─── Tab: Vaults ────────────────────────────────────────────────────────────────

function VaultsTab({
  vaults,
  isLoading,
  onCashIn,
  onCashOut,
  onTransfer,
}: {
  vaults: Vault[];
  isLoading: boolean;
  onCashIn: (v: Vault) => void;
  onCashOut: (v: Vault) => void;
  onTransfer: (v: Vault) => void;
}) {
  const columns = useMemo(
    () => makeVaultColumns(onCashIn, onCashOut, onTransfer),
    [onCashIn, onCashOut, onTransfer],
  );

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={vaults}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No vaults found"
        pageSize={15}
      />
    </div>
  );
}

// ─── Tab: Transactions ──────────────────────────────────────────────────────────

function TransactionsTab({
  transactions,
  isLoading,
}: {
  transactions: VaultTransaction[];
  isLoading: boolean;
}) {
  return (
    <div className="p-6">
      <DataTable
        columns={transactionColumns}
        data={transactions}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No transactions found"
        pageSize={15}
      />
    </div>
  );
}

// ─── Tab: Cash Movements ────────────────────────────────────────────────────────

function CashMovementsTab({
  movements,
  isLoading,
  onConfirm,
}: {
  movements: CashMovement[];
  isLoading: boolean;
  onConfirm: (ref: string) => void;
}) {
  const columns = useMemo(() => makeMovementColumns(onConfirm), [onConfirm]);

  return (
    <div className="p-6">
      <DataTable
        columns={columns}
        data={movements}
        isLoading={isLoading}
        enableGlobalFilter
        emptyMessage="No cash movements recorded"
        pageSize={15}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function VaultOperationsPage() {
  const [showCreateVault, setShowCreateVault] = useState(false);
  const [showRecordMovement, setShowRecordMovement] = useState(false);
  const [cashInTarget, setCashInTarget] = useState<Vault | null>(null);
  const [cashOutTarget, setCashOutTarget] = useState<Vault | null>(null);
  const [transferTarget, setTransferTarget] = useState<Vault | null>(null);

  // Fetch all vaults
  const { data: vaults = [], isLoading: vaultsLoading } = useQuery<Vault[]>({
    queryKey: ['vaults', 'all'],
    queryFn: () => apiGet<Vault[]>('/api/v1/vaults'),
    staleTime: 30_000,
  });

  // Fetch all vault transactions
  const { data: transactions = [], isLoading: txnLoading } = useQuery<VaultTransaction[]>({
    queryKey: ['vaults', 'all-transactions'],
    queryFn: () => apiGet<VaultTransaction[]>('/api/v1/vaults/transactions'),
    staleTime: 30_000,
  });

  // Fetch cash movements
  const { data: movements = [], isLoading: movementsLoading } = useQuery<CashMovement[]>({
    queryKey: ['cash-vaults', 'all-movements'],
    queryFn: () => apiGet<CashMovement[]>('/api/v1/cash-vaults/movements'),
    staleTime: 30_000,
  });

  const cashInMutation = useVaultCashIn();
  const cashOutMutation = useVaultCashOut();
  const transferMutation = useVaultTransfer();
  const registerMovementMutation = useRegisterCashMovement();
  const confirmMovementMutation = useConfirmCashMovement();

  // ─── Cash Position Overview ─────────────────────────────────────────────────

  const cashByType = useMemo(() => {
    const map: Record<string, number> = { MAIN: 0, SUBSIDIARY: 0, ATM: 0, TELLER: 0 };
    vaults.forEach((v) => {
      const vt = v.vaultType as string;
      map[vt] = (map[vt] || 0) + v.currentBalance;
    });
    return map;
  }, [vaults]);

  const totalCash = useMemo(
    () => vaults.reduce((sum, v) => sum + v.currentBalance, 0),
    [vaults],
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleCashIn = (id: number) => {
    cashInMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Cash in recorded');
        setCashInTarget(null);
      },
      onError: () => toast.error('Cash in failed'),
    });
  };

  const handleCashOut = (id: number) => {
    cashOutMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Cash out recorded');
        setCashOutTarget(null);
      },
      onError: () => toast.error('Cash out failed'),
    });
  };

  const handleTransfer = () => {
    transferMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Transfer completed');
        setTransferTarget(null);
      },
      onError: () => toast.error('Transfer failed'),
    });
  };

  const handleRecordMovement = (data: Record<string, unknown>) => {
    registerMovementMutation.mutate(data as Parameters<typeof registerMovementMutation.mutate>[0], {
      onSuccess: () => {
        toast.success('Movement recorded');
        setShowRecordMovement(false);
      },
      onError: () => toast.error('Failed to record movement'),
    });
  };

  const handleConfirmMovement = (ref: string) => {
    confirmMovementMutation.mutate(ref, {
      onSuccess: () => toast.success('Delivery confirmed'),
      onError: () => toast.error('Failed to confirm delivery'),
    });
  };

  // ─── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs = useMemo(
    () => [
      {
        id: 'vaults',
        label: 'Vaults',
        icon: VaultIcon,
        badge: vaults.length,
        content: (
          <VaultsTab
            vaults={vaults}
            isLoading={vaultsLoading}
            onCashIn={setCashInTarget}
            onCashOut={setCashOutTarget}
            onTransfer={setTransferTarget}
          />
        ),
      },
      {
        id: 'transactions',
        label: 'Transactions',
        icon: Banknote,
        content: <TransactionsTab transactions={transactions} isLoading={txnLoading} />,
      },
      {
        id: 'movements',
        label: 'Cash Movements',
        icon: Truck,
        content: (
          <CashMovementsTab
            movements={movements}
            isLoading={movementsLoading}
            onConfirm={handleConfirmMovement}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vaults, vaultsLoading, transactions, txnLoading, movements, movementsLoading],
  );

  return (
    <>
      <PageHeader
        title="Vault & Cash Management"
        subtitle={`${vaults.length} vaults managed`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecordMovement(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              <Truck className="w-4 h-4" />
              Record Movement
            </button>
            <button
              onClick={() => setShowCreateVault(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Vault
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Cash Position Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Cash" value={totalCash} format="money" icon={Banknote} loading={vaultsLoading} compact />
          <StatCard label="Main Vaults" value={cashByType.MAIN} format="money" icon={VaultIcon} loading={vaultsLoading} compact />
          <StatCard label="Subsidiary" value={cashByType.SUBSIDIARY} format="money" icon={VaultIcon} loading={vaultsLoading} compact />
          <StatCard label="ATM Vaults" value={cashByType.ATM} format="money" icon={VaultIcon} loading={vaultsLoading} compact />
          <StatCard label="Teller Vaults" value={cashByType.TELLER} format="money" icon={VaultIcon} loading={vaultsLoading} compact />
        </div>

        {/* Tabs */}
        <TabsPage tabs={tabs} defaultTab="vaults" />
      </div>

      {/* Dialogs */}
      <CreateVaultDialog
        open={showCreateVault}
        onClose={() => setShowCreateVault(false)}
        vaults={vaults}
      />
      <CashActionDialog
        open={!!cashInTarget}
        vault={cashInTarget}
        action="in"
        onClose={() => setCashInTarget(null)}
        onSubmit={handleCashIn}
        isLoading={cashInMutation.isPending}
      />
      <CashActionDialog
        open={!!cashOutTarget}
        vault={cashOutTarget}
        action="out"
        onClose={() => setCashOutTarget(null)}
        onSubmit={handleCashOut}
        isLoading={cashOutMutation.isPending}
      />
      <TransferDialog
        open={!!transferTarget}
        sourceVault={transferTarget}
        vaults={vaults}
        onClose={() => setTransferTarget(null)}
        onSubmit={handleTransfer}
        isLoading={transferMutation.isPending}
      />
      <RecordMovementDialog
        open={showRecordMovement}
        onClose={() => setShowRecordMovement(false)}
        onSubmit={handleRecordMovement}
        isLoading={registerMovementMutation.isPending}
      />
    </>
  );
}
