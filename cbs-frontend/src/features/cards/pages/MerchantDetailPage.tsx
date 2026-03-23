import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Store, TrendingUp, AlertTriangle, CreditCard, Loader2,
  ShieldAlert, Terminal, Plus, X, Cpu, Smartphone, Fingerprint, QrCode,
  Check, Building2, Banknote, FileWarning, PlayCircle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, EmptyState, TabsPage, InfoGrid } from '@/components/shared';
import { formatMoney, formatPercent, formatDate, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import type { Merchant } from '../types/card';
import type { CardSwitchTransaction } from '../types/cardSwitch';
import type { PosTerminal } from '../types/posTerminal';
import type { AcquiringFacility, MerchantSettlement, MerchantChargeback } from '../types/acquiring';
import {
  useSwitchByMerchant, usePosTerminalsByMerchant, useSuspendMerchant, useActivateMerchant,
  useFacilitiesByMerchant, useSetupFacility, useActivateFacility,
  useSettlementHistory, useProcessSettlement,
  useMerchantChargebacks, useRecordChargeback, useSubmitChargebackRepresentment,
} from '../hooks/useCardsExt';
import { useMerchantDetail, cardKeys } from '../hooks/useCardData';

const CHART_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

// ─── Transaction Columns ────────────────────────────────────────────────────

const txnCols: ColumnDef<CardSwitchTransaction, unknown>[] = [
  { accessorKey: 'switchRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.switchRef}</span> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount, row.original.currency)}</span> },
  { accessorKey: 'currency', header: 'Ccy', cell: ({ row }) => <span className="text-xs">{row.original.currency}</span> },
  { accessorKey: 'cardScheme', header: 'Scheme', cell: ({ row }) => <StatusBadge status={row.original.cardScheme} /> },
  { accessorKey: 'responseCode', header: 'Response', cell: ({ row }) => <StatusBadge status={row.original.responseCode === '00' ? 'APPROVED' : 'DECLINED'} dot /> },
  { accessorKey: 'authCode', header: 'Auth', cell: ({ row }) => <span className="font-mono text-xs">{row.original.authCode}</span> },
  { accessorKey: 'posEntryMode', header: 'Entry', cell: ({ row }) => <span className="text-xs">{row.original.posEntryMode}</span> },
  { accessorKey: 'fraudScore', header: 'Fraud', cell: ({ row }) => <span className={cn('text-xs tabular-nums', row.original.fraudScore > 70 ? 'text-red-600 font-bold' : '')}>{row.original.fraudScore}</span> },
  { accessorKey: 'processedAt', header: 'Time', cell: ({ row }) => <span className="text-xs">{formatRelative(row.original.processedAt)}</span> },
];

// ─── Terminal Columns ────────────────────────────────────────────────────────

const terminalCols: ColumnDef<PosTerminal, unknown>[] = [
  { accessorKey: 'terminalId', header: 'Terminal ID', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.terminalId}</span> },
  { accessorKey: 'terminalType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{row.original.terminalType}</span> },
  { accessorKey: 'locationAddress', header: 'Location', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.locationAddress}</span> },
  {
    accessorKey: 'operationalStatus',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.operationalStatus || 'UNKNOWN'} dot />,
  },
  { accessorKey: 'lastHeartbeatAt', header: 'Heartbeat', cell: ({ row }) => <span className="text-xs">{row.original.lastHeartbeatAt ? formatRelative(row.original.lastHeartbeatAt) : '—'}</span> },
  { accessorKey: 'transactionsToday', header: 'Txns Today', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.transactionsToday}</span> },
  {
    id: 'capabilities',
    header: 'Capabilities',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        {row.original.supportsChip && <Cpu className="w-3 h-3 text-green-600" />}
        {row.original.supportsContactless && <Smartphone className="w-3 h-3 text-green-600" />}
        {row.original.supportsPin && <Fingerprint className="w-3 h-3 text-green-600" />}
        {row.original.supportsQr && <QrCode className="w-3 h-3 text-green-600" />}
      </div>
    ),
  },
];

// ─── Suspend Dialog ─────────────────────────────────────────────────────────

function SuspendDialog({ merchant, onClose, onConfirm, isPending }: { merchant: Merchant; onClose: () => void; onConfirm: (reason: string) => void; isPending: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold">Suspend Merchant?</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This will suspend <strong>{merchant.merchantName}</strong> (MID: {merchant.merchantId}).
          All transactions will be declined.
        </p>
        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground">Suspension Reason</label>
          <textarea
            className="w-full mt-1 input min-h-[80px]"
            placeholder="Provide the reason for suspension..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{reason.length}/500</p>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" disabled={isPending}>Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Suspending...' : 'Suspend'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Sub-component ────────────────────────────────────────────────

function AnalyticsTab({ transactions, merchant }: { transactions: CardSwitchTransaction[]; merchant: Merchant }) {
  const approved = transactions.filter((t) => t.responseCode === '00');
  const declined = transactions.filter((t) => t.responseCode !== '00');
  const grossVolume = transactions.reduce((s, t) => s + t.amount, 0);
  const mdrRevenue = grossVolume * merchant.mdrRate / 100;
  const chargebackAmount = grossVolume * merchant.chargebackRate / 100;
  const netRevenue = mdrRevenue - chargebackAmount;

  const successData = [
    { name: 'Approved', value: approved.length },
    { name: 'Declined', value: declined.length },
  ];

  // Daily volume (aggregate by date)
  const dailyVolume = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      const date = t.processedAt?.split('T')[0] ?? 'unknown';
      map.set(date, (map.get(date) ?? 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [transactions]);

  // Hourly distribution
  const hourlyDist = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
    transactions.forEach((t) => {
      const h = new Date(t.processedAt).getHours();
      if (h >= 0 && h < 24) hours[h].count++;
    });
    return hours;
  }, [transactions]);

  return (
    <div className="p-4 space-y-6">
      {/* Revenue breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Gross Volume</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(grossVolume)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">MDR Revenue</p>
          <p className="text-lg font-bold tabular-nums text-green-600">{formatMoney(mdrRevenue)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Chargebacks</p>
          <p className="text-lg font-bold tabular-nums text-red-600">{formatMoney(chargebackAmount)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Net Revenue</p>
          <p className={cn('text-lg font-bold tabular-nums', netRevenue >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(netRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily volume chart */}
        <div className="surface-card p-4">
          <p className="text-sm font-medium mb-3">Daily Transaction Volume</p>
          {dailyVolume.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => [formatMoney(v), 'Volume']} contentStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Success rate donut */}
        <div className="surface-card p-4">
          <p className="text-sm font-medium mb-3">Approval vs Decline</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={successData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak hours */}
      <div className="surface-card p-4">
        <p className="text-sm font-medium mb-3">Peak Hours Distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyDist}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Risk Tab ───────────────────────────────────────────────────────────────

function RiskTab({ transactions, merchant }: { transactions: CardSwitchTransaction[]; merchant: Merchant }) {
  const highFraud = transactions.filter((t) => t.fraudScore > 70);

  // Fraud score distribution
  const fraudDist = useMemo(() => {
    const buckets = [
      { range: '0-20', count: 0 }, { range: '21-40', count: 0 },
      { range: '41-60', count: 0 }, { range: '61-80', count: 0 },
      { range: '81-100', count: 0 },
    ];
    transactions.forEach((t) => {
      const idx = Math.min(Math.floor(t.fraudScore / 20), 4);
      buckets[idx].count++;
    });
    return buckets;
  }, [transactions]);

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Chargeback Rate</p>
          <p className={cn('text-lg font-bold tabular-nums', merchant.chargebackRate > 1 ? 'text-red-600' : '')}>{formatPercent(merchant.chargebackRate)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Risk Category</p>
          <StatusBadge status={merchant.riskCategory} />
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">High Fraud Txns</p>
          <p className="text-lg font-bold tabular-nums text-red-600">{highFraud.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Avg Fraud Score</p>
          <p className="text-lg font-bold tabular-nums">
            {transactions.length > 0 ? (transactions.reduce((s, t) => s + t.fraudScore, 0) / transactions.length).toFixed(1) : '--'}
          </p>
        </div>
      </div>

      {/* Fraud score histogram */}
      <div className="surface-card p-4">
        <p className="text-sm font-medium mb-3">Fraud Score Distribution</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={fraudDist}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {fraudDist.map((_, i) => (
                <Cell key={i} fill={i >= 3 ? '#ef4444' : i >= 2 ? '#f59e0b' : '#10b981'} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* High-risk transactions */}
      {highFraud.length > 0 && (
        <div className="surface-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-medium">High-Risk Transactions (fraud score &gt; 70)</p>
          </div>
          <div className="p-4">
            <DataTable columns={txnCols} data={highFraud} enableGlobalFilter emptyMessage="No high-risk transactions" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Facilities Tab ─────────────────────────────────────────────────────────

const facilityCols: ColumnDef<AcquiringFacility, unknown>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span> },
  { accessorKey: 'facilityType', header: 'Type', cell: ({ row }) => <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{row.original.facilityType}</span> },
  { accessorKey: 'processorConnection', header: 'Processor', cell: ({ row }) => <StatusBadge status={row.original.processorConnection} /> },
  { accessorKey: 'mdrRatePct', header: 'MDR %', cell: ({ row }) => <span className="text-sm tabular-nums">{formatPercent(row.original.mdrRatePct)}</span> },
  { accessorKey: 'settlementCycle', header: 'Cycle', cell: ({ row }) => <span className="text-xs font-mono">{row.original.settlementCycle}</span> },
  { accessorKey: 'dailyTransactionLimit', header: 'Daily Limit', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.dailyTransactionLimit != null ? formatMoney(row.original.dailyTransactionLimit) : '—'}</span> },
  { accessorKey: 'reserveBalance', header: 'Reserve', cell: ({ row }) => <span className="text-sm tabular-nums">{formatMoney(row.original.reserveBalance ?? 0)}</span> },
  { accessorKey: 'pciComplianceStatus', header: 'PCI', cell: ({ row }) => <StatusBadge status={row.original.pciComplianceStatus} /> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

function SetupFacilityDialog({ merchantDbId, onClose }: { merchantDbId: number; onClose: () => void }) {
  const setupFacility = useSetupFacility();
  const [form, setForm] = useState({
    facilityType: 'CARD_PRESENT',
    processorConnection: 'VISA',
    terminalIdPrefix: '',
    settlementCurrency: 'NGN',
    settlementCycle: 'T1',
    mdrRatePct: 1.5,
    dailyTransactionLimit: 10000000,
    monthlyVolumeLimit: 300000000,
    chargebackLimitPct: 1.0,
    reserveHoldPct: 5.0,
  });
  const update = (f: string, v: unknown) => setForm((s) => ({ ...s, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Setup Acquiring Facility</h2>
        <form onSubmit={(e) => { e.preventDefault(); setupFacility.mutate({ merchantId: merchantDbId, ...form }, { onSuccess: () => { toast.success('Facility created'); onClose(); }, onError: () => toast.error('Failed to create facility') }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Facility Type</label>
              <select className="w-full mt-1 input" value={form.facilityType} onChange={(e) => update('facilityType', e.target.value)}>
                <option value="CARD_PRESENT">Card Present</option>
                <option value="CARD_NOT_PRESENT">Card Not Present</option>
                <option value="ECOMMERCE">E-Commerce</option>
                <option value="MPOS">MPOS</option>
                <option value="QR">QR</option>
                <option value="RECURRING">Recurring</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Processor</label>
              <select className="w-full mt-1 input" value={form.processorConnection} onChange={(e) => update('processorConnection', e.target.value)}>
                <option value="VISA">Visa</option>
                <option value="MASTERCARD">Mastercard</option>
                <option value="VERVE">Verve</option>
                <option value="AMEX">Amex</option>
                <option value="UNION_PAY">UnionPay</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Terminal Prefix</label>
              <input className="w-full mt-1 input" placeholder="e.g., TRM" value={form.terminalIdPrefix} onChange={(e) => update('terminalIdPrefix', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <input className="w-full mt-1 input" value={form.settlementCurrency} onChange={(e) => update('settlementCurrency', e.target.value)} maxLength={3} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Settlement Cycle</label>
              <select className="w-full mt-1 input" value={form.settlementCycle} onChange={(e) => update('settlementCycle', e.target.value)}>
                <option value="T0">T+0</option>
                <option value="T1">T+1</option>
                <option value="T2">T+2</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">MDR Rate (%)</label>
              <input type="number" step="0.01" min={0} max={100} className="w-full mt-1 input" value={form.mdrRatePct} onChange={(e) => update('mdrRatePct', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Daily Txn Limit</label>
              <input type="number" className="w-full mt-1 input" value={form.dailyTransactionLimit} onChange={(e) => update('dailyTransactionLimit', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Monthly Limit</label>
              <input type="number" className="w-full mt-1 input" value={form.monthlyVolumeLimit} onChange={(e) => update('monthlyVolumeLimit', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">CB Limit (%)</label>
              <input type="number" step="0.1" min={0} max={100} className="w-full mt-1 input" value={form.chargebackLimitPct} onChange={(e) => update('chargebackLimitPct', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reserve Hold (%)</label>
              <input type="number" step="0.1" min={0} max={100} className="w-full mt-1 input" value={form.reserveHoldPct} onChange={(e) => update('reserveHoldPct', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={setupFacility.isPending} className="btn-primary">{setupFacility.isPending ? 'Creating...' : 'Create Facility'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FacilitiesTab({ merchantDbId }: { merchantDbId: number }) {
  const { data: facilities = [], isLoading } = useFacilitiesByMerchant(merchantDbId);
  const activateFacility = useActivateFacility();
  const [showSetup, setShowSetup] = useState(false);

  const handleActivate = (id: number) => {
    activateFacility.mutate(id, {
      onSuccess: () => toast.success('Facility activated'),
      onError: () => toast.error('Failed to activate facility'),
    });
  };

  const colsWithActions: ColumnDef<AcquiringFacility, unknown>[] = [
    ...facilityCols,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'SETUP' ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleActivate(row.original.id); }}
            disabled={activateFacility.isPending}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50"
          >
            <PlayCircle className="w-3 h-3" /> Activate
          </button>
        ) : null,
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowSetup(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
          <Plus className="w-3.5 h-3.5" /> Setup Facility
        </button>
      </div>
      <DataTable columns={colsWithActions} data={facilities} isLoading={isLoading} enableGlobalFilter emptyMessage="No acquiring facilities configured" />
      {showSetup && <SetupFacilityDialog merchantDbId={merchantDbId} onClose={() => setShowSetup(false)} />}
    </div>
  );
}

// ─── Settlements Tab ────────────────────────────────────────────────────────

const settlementCols: ColumnDef<MerchantSettlement, unknown>[] = [
  { accessorKey: 'settlementReference', header: 'Reference', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.settlementReference ?? '—'}</span> },
  { accessorKey: 'settlementDate', header: 'Date', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.settlementDate}</span> },
  { accessorKey: 'grossTransactionAmount', header: 'Gross', cell: ({ row }) => <span className="text-sm tabular-nums font-medium">{formatMoney(row.original.grossTransactionAmount)}</span> },
  { accessorKey: 'transactionCount', header: 'Txns', cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.transactionCount}</span> },
  { accessorKey: 'mdrDeducted', header: 'MDR', cell: ({ row }) => <span className="text-sm tabular-nums text-red-600">{formatMoney(row.original.mdrDeducted)}</span> },
  { accessorKey: 'chargebackDeductions', header: 'CB Ded.', cell: ({ row }) => <span className="text-sm tabular-nums text-red-600">{formatMoney(row.original.chargebackDeductions)}</span> },
  { accessorKey: 'reserveHeld', header: 'Reserve', cell: ({ row }) => <span className="text-sm tabular-nums">{formatMoney(row.original.reserveHeld)}</span> },
  { accessorKey: 'netSettlementAmount', header: 'Net', cell: ({ row }) => <span className="text-sm tabular-nums font-bold text-green-600">{formatMoney(row.original.netSettlementAmount)}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

function ProcessSettlementDialog({ merchantDbId, onClose }: { merchantDbId: number; onClose: () => void }) {
  const processSettlement = useProcessSettlement();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Process Settlement</h2>
        <form onSubmit={(e) => { e.preventDefault(); processSettlement.mutate({ merchantId: merchantDbId, date }, { onSuccess: () => { toast.success('Settlement processed'); onClose(); }, onError: () => toast.error('Failed to process settlement') }); }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Settlement Date</label>
            <input type="date" className="w-full mt-1 input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={processSettlement.isPending} className="btn-primary">{processSettlement.isPending ? 'Processing...' : 'Process'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettlementsTab({ merchantDbId }: { merchantDbId: number }) {
  const { data: settlements = [], isLoading } = useSettlementHistory(merchantDbId);
  const [showProcess, setShowProcess] = useState(false);

  const totalNet = settlements.reduce((s, stl) => s + (stl.netSettlementAmount ?? 0), 0);
  const totalGross = settlements.reduce((s, stl) => s + (stl.grossTransactionAmount ?? 0), 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="rounded-lg border p-2 px-3">
            <p className="text-xs text-muted-foreground">Total Gross</p>
            <p className="text-sm font-bold tabular-nums">{formatMoney(totalGross)}</p>
          </div>
          <div className="rounded-lg border p-2 px-3">
            <p className="text-xs text-muted-foreground">Total Net</p>
            <p className="text-sm font-bold tabular-nums text-green-600">{formatMoney(totalNet)}</p>
          </div>
        </div>
        <button onClick={() => setShowProcess(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
          <Banknote className="w-3.5 h-3.5" /> Process Settlement
        </button>
      </div>
      <DataTable columns={settlementCols} data={settlements} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="settlements" emptyMessage="No settlements processed yet" />
      {showProcess && <ProcessSettlementDialog merchantDbId={merchantDbId} onClose={() => setShowProcess(false)} />}
    </div>
  );
}

// ─── Chargebacks Tab (Acquiring) ────────────────────────────────────────────

const chargebackCols: ColumnDef<MerchantChargeback, unknown>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">CB-{row.original.id}</span> },
  { accessorKey: 'originalTransactionRef', header: 'Txn Ref', cell: ({ row }) => <span className="font-mono text-xs">{row.original.originalTransactionRef ?? '—'}</span> },
  { accessorKey: 'cardNetwork', header: 'Network', cell: ({ row }) => <StatusBadge status={row.original.cardNetwork ?? 'UNKNOWN'} /> },
  { accessorKey: 'chargebackAmount', header: 'Amount', cell: ({ row }) => <span className="text-sm tabular-nums font-medium text-red-600">{formatMoney(row.original.chargebackAmount, row.original.currency)}</span> },
  { accessorKey: 'reasonCode', header: 'Reason', cell: ({ row }) => <span className="text-xs">{row.original.reasonCode} — {row.original.reasonDescription}</span> },
  { accessorKey: 'evidenceDeadline', header: 'Deadline', cell: ({ row }) => <span className={cn('text-xs tabular-nums', row.original.evidenceDeadline && new Date(row.original.evidenceDeadline) < new Date() ? 'text-red-600 font-bold' : '')}>{row.original.evidenceDeadline ?? '—'}</span> },
  { accessorKey: 'representmentSubmitted', header: 'Representment', cell: ({ row }) => <span className={cn('text-xs', row.original.representmentSubmitted ? 'text-green-600' : 'text-muted-foreground')}>{row.original.representmentSubmitted ? 'Submitted' : 'Pending'}</span> },
  { accessorKey: 'outcome', header: 'Outcome', cell: ({ row }) => row.original.outcome ? <StatusBadge status={row.original.outcome} /> : <span className="text-xs text-muted-foreground">—</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

function RecordChargebackDialog({ merchantDbId, onClose }: { merchantDbId: number; onClose: () => void }) {
  const recordCb = useRecordChargeback();
  const [form, setForm] = useState({
    originalTransactionRef: '',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionAmount: 0,
    cardNetwork: 'VISA',
    reasonCode: '',
    reasonDescription: '',
    chargebackAmount: 0,
    currency: 'NGN',
    evidenceDeadline: '',
  });
  const update = (f: string, v: unknown) => setForm((s) => ({ ...s, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Record Chargeback</h2>
        <form onSubmit={(e) => { e.preventDefault(); recordCb.mutate({ merchantId: merchantDbId, ...form, transactionDate: form.transactionDate || undefined, evidenceDeadline: form.evidenceDeadline || undefined } as any, { onSuccess: () => { toast.success('Chargeback recorded'); onClose(); }, onError: () => toast.error('Failed to record chargeback') }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transaction Ref</label>
              <input className="w-full mt-1 input" value={form.originalTransactionRef} onChange={(e) => update('originalTransactionRef', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Card Network</label>
              <select className="w-full mt-1 input" value={form.cardNetwork} onChange={(e) => update('cardNetwork', e.target.value)}>
                <option value="VISA">Visa</option>
                <option value="MASTERCARD">Mastercard</option>
                <option value="VERVE">Verve</option>
                <option value="AMEX">Amex</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transaction Amount</label>
              <input type="number" step="0.01" className="w-full mt-1 input" value={form.transactionAmount} onChange={(e) => update('transactionAmount', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Chargeback Amount</label>
              <input type="number" step="0.01" min={0.01} className="w-full mt-1 input" value={form.chargebackAmount} onChange={(e) => update('chargebackAmount', parseFloat(e.target.value) || 0)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reason Code</label>
              <input className="w-full mt-1 input" placeholder="e.g., 4837" value={form.reasonCode} onChange={(e) => update('reasonCode', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Currency</label>
              <input className="w-full mt-1 input" value={form.currency} onChange={(e) => update('currency', e.target.value)} maxLength={3} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Reason Description</label>
            <input className="w-full mt-1 input" value={form.reasonDescription} onChange={(e) => update('reasonDescription', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transaction Date</label>
              <input type="date" className="w-full mt-1 input" value={form.transactionDate} onChange={(e) => update('transactionDate', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Evidence Deadline</label>
              <input type="date" className="w-full mt-1 input" value={form.evidenceDeadline} onChange={(e) => update('evidenceDeadline', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={recordCb.isPending || form.chargebackAmount <= 0} className="btn-primary">{recordCb.isPending ? 'Recording...' : 'Record Chargeback'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RepresentmentDialog({ chargeback, onClose }: { chargeback: MerchantChargeback; onClose: () => void }) {
  const submitRepr = useSubmitChargebackRepresentment();
  const [responseRef, setResponseRef] = useState('');
  const [evidenceText, setEvidenceText] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-2">Submit Representment</h2>
        <p className="text-sm text-muted-foreground mb-4">CB-{chargeback.id} — {formatMoney(chargeback.chargebackAmount, chargeback.currency)}</p>
        <form onSubmit={(e) => { e.preventDefault(); submitRepr.mutate({ chargebackId: chargeback.id, data: { responseRef, evidence: { description: evidenceText } } }, { onSuccess: () => { toast.success('Representment submitted'); onClose(); }, onError: () => toast.error('Failed to submit representment') }); }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Response Reference</label>
            <input className="w-full mt-1 input" placeholder="Merchant response reference" value={responseRef} onChange={(e) => setResponseRef(e.target.value)} required maxLength={80} />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Evidence Description</label>
            <textarea className="w-full mt-1 input min-h-[100px]" placeholder="Describe the evidence supporting your case..." value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitRepr.isPending || !responseRef.trim() || !evidenceText.trim()} className="btn-primary">{submitRepr.isPending ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChargebacksTab({ merchantDbId }: { merchantDbId: number }) {
  const { data: chargebacks = [], isLoading } = useMerchantChargebacks(merchantDbId);
  const [showRecord, setShowRecord] = useState(false);
  const [reprTarget, setReprTarget] = useState<MerchantChargeback | null>(null);

  const totalCbAmount = chargebacks.reduce((s, cb) => s + (cb.chargebackAmount ?? 0), 0);
  const openCount = chargebacks.filter((cb) => cb.status !== 'CLOSED').length;

  const colsWithActions: ColumnDef<MerchantChargeback, unknown>[] = [
    ...chargebackCols,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        !row.original.representmentSubmitted && row.original.status !== 'CLOSED' ? (
          <button
            onClick={(e) => { e.stopPropagation(); setReprTarget(row.original); }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border text-primary hover:bg-muted whitespace-nowrap"
          >
            <FileWarning className="w-3 h-3" /> Represent
          </button>
        ) : null,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="rounded-lg border p-2 px-3">
            <p className="text-xs text-muted-foreground">Open Chargebacks</p>
            <p className="text-sm font-bold tabular-nums text-red-600">{openCount}</p>
          </div>
          <div className="rounded-lg border p-2 px-3">
            <p className="text-xs text-muted-foreground">Total CB Amount</p>
            <p className="text-sm font-bold tabular-nums text-red-600">{formatMoney(totalCbAmount)}</p>
          </div>
        </div>
        <button onClick={() => setShowRecord(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
          <Plus className="w-3.5 h-3.5" /> Record Chargeback
        </button>
      </div>
      <DataTable columns={colsWithActions} data={chargebacks} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="chargebacks" emptyMessage="No chargebacks recorded" />
      {showRecord && <RecordChargebackDialog merchantDbId={merchantDbId} onClose={() => setShowRecord(false)} />}
      {reprTarget && <RepresentmentDialog chargeback={reprTarget} onClose={() => setReprTarget(null)} />}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function MerchantDetailPage() {
  const { merchantId = '' } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => { document.title = `Merchant ${merchantId} | CBS`; }, [merchantId]);

  const [showSuspend, setShowSuspend] = useState(false);

  const { data: merchant, isLoading: merchantLoading } = useMerchantDetail(merchantId);

  const suspendMerchant = useSuspendMerchant();
  const activateMerchant = useActivateMerchant();

  const { data: transactions = [], isLoading: txnLoading } = useSwitchByMerchant(merchant?.merchantId ?? '');
  const { data: terminals = [], isLoading: terminalsLoading } = usePosTerminalsByMerchant(merchantId);

  const handleSuspend = (reason: string) => {
    suspendMerchant.mutate(
      { merchantId, reason },
      {
        onSuccess: () => {
          toast.success(`Merchant ${merchant?.merchantName} suspended`);
          setShowSuspend(false);
          queryClient.invalidateQueries({ queryKey: cardKeys.merchantDetail(merchantId) });
        },
        onError: () => toast.error('Failed to suspend merchant'),
      },
    );
  };

  const handleActivate = () => {
    activateMerchant.mutate(merchantId, {
      onSuccess: () => {
        toast.success(`Merchant ${merchant?.merchantName} reactivated`);
        queryClient.invalidateQueries({ queryKey: cardKeys.merchantDetail(merchantId) });
      },
      onError: () => toast.error('Failed to reactivate merchant'),
    });
  };

  const riskColors: Record<string, string> = { LOW: 'text-green-600', MEDIUM: 'text-amber-600', HIGH: 'text-red-600', PROHIBITED: 'text-red-800' };

  if (merchantLoading) {
    return (
      <>
        <PageHeader title="Loading..." backTo="/cards/merchants" />
        <div className="page-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!merchant) {
    return (
      <>
        <PageHeader title="Merchant Not Found" backTo="/cards/merchants" />
        <div className="page-container">
          <EmptyState title="Merchant not found" description={`No merchant found with ID "${merchantId}".`} />
        </div>
      </>
    );
  }

  const avgTicket = transactions.length > 0 ? transactions.reduce((s, t) => s + t.amount, 0) / transactions.length : 0;
  const approvedCount = transactions.filter((t) => t.responseCode === '00').length;
  const approvalRate = transactions.length > 0 ? (approvedCount / transactions.length) * 100 : 0;

  const infoItems = [
    { label: 'Merchant ID', value: merchant.merchantId },
    { label: 'Name', value: merchant.merchantName },
    { label: 'MCC', value: merchant.merchantCategoryCode },
    { label: 'MDR Rate', value: formatPercent(merchant.mdrRate) },
    { label: 'Risk Category', value: merchant.riskCategory },
    { label: 'Status', value: merchant.status },
    { label: 'Chargeback Rate', value: formatPercent(merchant.chargebackRate) },
    { label: 'Monthly Volume Limit', value: merchant.monthlyVolumeLimit != null ? formatMoney(merchant.monthlyVolumeLimit) : '--' },
    { label: 'Settlement', value: merchant.settlementFrequency ?? 'DAILY' },
    { label: 'Contact', value: merchant.contactName ?? '--' },
    { label: 'Email', value: merchant.contactEmail ?? '--' },
    { label: 'Phone', value: merchant.contactPhone ?? '--' },
    { label: 'Settlement Account', value: merchant.settlementAccountId != null ? String(merchant.settlementAccountId) : '--' },
    { label: 'Onboarded', value: merchant.onboardedAt ? formatDate(merchant.onboardedAt) : '--' },
  ];

  const tabs = [
    {
      id: 'terminals',
      label: 'Terminals',
      badge: terminals.length || undefined,
      content: (
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => navigate(`/cards/pos?merchant=${merchantId}`)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted"
            >
              <Plus className="w-3.5 h-3.5" /> Deploy Terminal
            </button>
          </div>
          <DataTable
            columns={terminalCols}
            data={terminals}
            isLoading={terminalsLoading}
            enableGlobalFilter
            emptyMessage="No terminals deployed"
            onRowClick={(row) => navigate(`/cards/pos/${row.terminalId}`)}
          />
        </div>
      ),
    },
    {
      id: 'transactions',
      label: 'Transactions',
      badge: transactions.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={txnCols} data={transactions} isLoading={txnLoading} enableGlobalFilter enableExport exportFilename={`merchant-${merchantId}-txns`} emptyMessage="No transactions found" />
        </div>
      ),
    },
    {
      id: 'facilities',
      label: 'Facilities',
      content: <FacilitiesTab merchantDbId={merchant.id} />,
    },
    {
      id: 'settlements',
      label: 'Settlements',
      content: <SettlementsTab merchantDbId={merchant.id} />,
    },
    {
      id: 'chargebacks',
      label: 'Chargebacks',
      content: <ChargebacksTab merchantDbId={merchant.id} />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      content: <AnalyticsTab transactions={transactions} merchant={merchant} />,
    },
    {
      id: 'risk',
      label: 'Risk',
      content: <RiskTab transactions={transactions} merchant={merchant} />,
    },
  ];

  return (
    <>
      {showSuspend && <SuspendDialog merchant={merchant} onClose={() => setShowSuspend(false)} onConfirm={handleSuspend} isPending={suspendMerchant.isPending} />}

      <PageHeader
        title={merchant.merchantName}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{merchant.merchantId}</span>
            <StatusBadge status={merchant.status} dot />
            <span className={cn('text-xs font-bold', riskColors[merchant.riskCategory])}>{merchant.riskCategory} RISK</span>
          </span>
        }
        backTo="/cards/merchants"
        actions={
          <div className="flex items-center gap-2">
            {merchant.status === 'SUSPENDED' && (
              <button
                onClick={handleActivate}
                disabled={activateMerchant.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-green-600 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {activateMerchant.isPending ? 'Reactivating...' : 'Reactivate'}
              </button>
            )}
            {merchant.status === 'PENDING' && (
              <button
                onClick={handleActivate}
                disabled={activateMerchant.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-green-600 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/10 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {activateMerchant.isPending ? 'Activating...' : 'Activate'}
              </button>
            )}
            {(merchant.status === 'ACTIVE' || merchant.status === 'UNDER_REVIEW') && (
              <button onClick={() => setShowSuspend(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10">
                <ShieldAlert className="w-4 h-4" /> Suspend
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Monthly Volume Limit" value={merchant.monthlyVolumeLimit} format="money" compact icon={TrendingUp} />
          <StatCard label="Terminals" value={merchant.terminalCount} format="number" icon={Terminal} />
          <StatCard label="Avg Ticket" value={avgTicket} format="money" compact icon={CreditCard} />
          <StatCard label="Chargeback %" value={merchant.chargebackRate} format="percent" icon={AlertTriangle} />
          <StatCard label="Approval Rate" value={approvalRate} format="percent" icon={Store} />
        </div>

        {/* Info Grid */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Business Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
            {infoItems.map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <TabsPage syncWithUrl tabs={tabs} />
        </div>
      </div>
    </>
  );
}
