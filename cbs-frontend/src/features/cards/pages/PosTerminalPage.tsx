import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge } from '@/components/shared';
import {
  Monitor, Wifi, WifiOff, Clock, Plus, X,
  Cpu, CreditCard, Smartphone, Fingerprint, QrCode, BarChart3,
} from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/formatters';
import { usePosTerminalsLive } from '../hooks/useCardData';
import { posTerminalsApi } from '../api/posTerminalApi';
import { TerminalHealthMonitor, getStatus } from '../components/TerminalHealthMonitor';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cardKeys } from '../hooks/useCardData';
import type { ColumnDef } from '@tanstack/react-table';
import type { PosTerminal } from '../types/posTerminal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusIcons: Record<string, { icon: typeof Wifi; color: string; label: string }> = {
  online: { icon: Wifi, color: 'text-green-500', label: 'ONLINE' },
  idle: { icon: Clock, color: 'text-amber-500', label: 'IDLE' },
  offline: { icon: WifiOff, color: 'text-red-500', label: 'OFFLINE' },
};

function CapabilityIcon({ supported, icon: Icon, label }: { supported: boolean; icon: typeof Cpu; label: string }) {
  return (
    <span title={label} className={cn('inline-flex', supported ? 'text-green-600' : 'text-muted-foreground/30')}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

// ── Deploy Terminal Form ─────────────────────────────────────────────────────

function DeployTerminalForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const deploy = useMutation({
    mutationFn: posTerminalsApi.deploy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardKeys.terminals });
      toast.success('Terminal deployed');
      onClose();
    },
  });

  const [form, setForm] = useState({
    terminalType: 'COUNTERTOP',
    merchantId: '',
    locationAddress: '',
    supportsContactless: true,
    supportsChip: true,
    supportsMagstripe: true,
    supportsPin: true,
    supportsQr: false,
    maxTransactionAmount: 5000000,
    acquiringBankCode: '',
  });

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Deploy Terminal</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); deploy.mutate(form); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Terminal Type</label>
              <select className="w-full mt-1 input" value={form.terminalType} onChange={(e) => update('terminalType', e.target.value)}>
                <option value="COUNTERTOP">Countertop</option>
                <option value="MOBILE">Mobile</option>
                <option value="SMART">Smart POS</option>
                <option value="SOFTPOS">SoftPOS</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Merchant ID</label>
              <input className="w-full mt-1 input" placeholder="MER-001" value={form.merchantId} onChange={(e) => update('merchantId', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Location Address</label>
            <input className="w-full mt-1 input" placeholder="Address" value={form.locationAddress} onChange={(e) => update('locationAddress', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Acquiring Bank Code</label>
            <input className="w-full mt-1 input" placeholder="e.g., 058" value={form.acquiringBankCode} onChange={(e) => update('acquiringBankCode', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Capabilities</p>
            <div className="flex flex-wrap gap-4">
              {(['supportsContactless', 'supportsChip', 'supportsMagstripe', 'supportsPin', 'supportsQr'] as const).map((cap) => (
                <label key={cap} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={form[cap]} onChange={(e) => update(cap, e.target.checked)} className="rounded" />
                  {cap.replace('supports', '')}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={deploy.isPending} className="btn-primary">
              {deploy.isPending ? 'Deploying...' : 'Deploy Terminal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function PosTerminalPage() {
  const navigate = useNavigate();
  const { data: terminals = [], isLoading } = usePosTerminalsLive();
  const [showDeploy, setShowDeploy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const withStatus = useMemo(
    () => terminals.map((t) => ({ ...t, _status: getStatus(t) })),
    [terminals],
  );

  const filtered = useMemo(() => {
    let result = withStatus;
    if (statusFilter) result = result.filter((t) => t._status === statusFilter);
    if (merchantSearch) result = result.filter((t) => t.merchantName.toLowerCase().includes(merchantSearch.toLowerCase()));
    if (typeFilter) result = result.filter((t) => t.terminalType === typeFilter);
    return result;
  }, [withStatus, statusFilter, merchantSearch, typeFilter]);

  const online = withStatus.filter((t) => t._status === 'online').length;
  const idle = withStatus.filter((t) => t._status === 'idle').length;
  const offline = withStatus.filter((t) => t._status === 'offline').length;
  const avgDailyTxns = terminals.length > 0 ? Math.round(terminals.reduce((s, t) => s + t.transactionsToday, 0) / terminals.length) : 0;

  const columns: ColumnDef<typeof withStatus[0], any>[] = [
    {
      accessorKey: 'terminalId',
      header: 'Terminal ID',
      cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.terminalId}</span>,
    },
    {
      accessorKey: 'merchantName',
      header: 'Merchant',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.merchantName}</span>,
    },
    {
      accessorKey: 'terminalType',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{row.original.terminalType}</span>,
    },
    {
      accessorKey: 'locationAddress',
      header: 'Location',
      cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.locationAddress}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original._status;
        const { icon: Icon, color, label } = statusIcons[s];
        return (
          <span className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </span>
        );
      },
    },
    {
      accessorKey: 'lastHeartbeatAt',
      header: 'Last Heartbeat',
      cell: ({ row }) => {
        const hb = row.original.lastHeartbeatAt;
        if (!hb) return <span className="text-xs text-muted-foreground">Never</span>;
        const minsAgo = (Date.now() - new Date(hb).getTime()) / 60_000;
        return (
          <span className={cn('text-xs tabular-nums', minsAgo > 30 ? 'text-red-600 font-medium' : minsAgo > 5 ? 'text-amber-600' : 'text-muted-foreground')}>
            {formatRelative(hb)}
          </span>
        );
      },
    },
    {
      accessorKey: 'transactionsToday',
      header: 'Txns Today',
      cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.transactionsToday}</span>,
    },
    {
      id: 'capabilities',
      header: 'Capabilities',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <CapabilityIcon supported={row.original.supportsChip} icon={Cpu} label="Chip" />
          <CapabilityIcon supported={row.original.supportsContactless} icon={Smartphone} label="Contactless" />
          <CapabilityIcon supported={row.original.supportsMagstripe} icon={CreditCard} label="Magstripe" />
          <CapabilityIcon supported={row.original.supportsPin} icon={Fingerprint} label="PIN" />
          <CapabilityIcon supported={row.original.supportsQr} icon={QrCode} label="QR" />
        </div>
      ),
    },
    {
      accessorKey: 'softwareVersion',
      header: 'SW Version',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.softwareVersion || '--'}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Deployed',
      cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{row.original.createdAt ? formatDate(row.original.createdAt) : '--'}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="POS Terminals"
        subtitle="Terminal deployment, health monitoring, and management"
        actions={
          <button onClick={() => setShowDeploy(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> Deploy Terminal
          </button>
        }
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Terminals" value={terminals.length} format="number" icon={Monitor} />
          <StatCard label="Online" value={online} format="number" icon={Wifi} />
          <StatCard label="Idle (>30min)" value={idle} format="number" icon={Clock} />
          <StatCard label="Offline" value={offline} format="number" icon={WifiOff} />
          <StatCard label="Avg Daily Txns" value={avgDailyTxns} format="number" icon={BarChart3} />
        </div>

        <TerminalHealthMonitor terminals={terminals} isLoading={isLoading} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">All</option>
              <option value="online">Online</option>
              <option value="idle">Idle</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Merchant</label>
            <input value={merchantSearch} onChange={(e) => setMerchantSearch(e.target.value)} placeholder="Search merchant..." className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-48" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">All</option>
              <option value="COUNTERTOP">Countertop</option>
              <option value="MOBILE">Mobile</option>
              <option value="SMART">Smart POS</option>
              <option value="SOFTPOS">SoftPOS</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          enableGlobalFilter
          enableExport
          exportFilename="pos-terminals"
          onRowClick={(row) => navigate(`/cards/pos/${row.terminalId}`)}
          emptyMessage="No terminals match your filters"
        />
      </div>

      {showDeploy && <DeployTerminalForm onClose={() => setShowDeploy(false)} />}
    </>
  );
}
