import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Store, TrendingUp, AlertTriangle, CreditCard, Loader2,
  ShieldAlert, Terminal, Plus, X, Cpu, Smartphone, Fingerprint, QrCode,
  Check,
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
import { cardApi } from '../api/cardApi';
import { cardSwitchApi } from '../api/cardSwitchApi';
import { cardsApi } from '../api/cardExtApi';
import type { Merchant } from '../types/card';
import type { CardSwitchTransaction } from '../types/cardSwitch';
import type { PosTerminal } from '../types/posTerminal';
import type { CardDispute } from '../types/cardExt';
import { useSwitchByMerchant, usePosTerminalsByMerchant } from '../hooks/useCardsExt';

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

function SuspendDialog({ merchant, onClose }: { merchant: Merchant; onClose: () => void }) {
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
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => { toast.success(`Merchant ${merchant.merchantName} suspended`); onClose(); }} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Suspend</button>
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
        <div className="rounded-xl border bg-card p-4">
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
        <div className="rounded-xl border bg-card p-4">
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
      <div className="rounded-xl border bg-card p-4">
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
      <div className="rounded-xl border bg-card p-4">
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
        <div className="rounded-xl border bg-card overflow-hidden">
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export function MerchantDetailPage() {
  const { merchantId = '' } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const id = parseInt(merchantId, 10);
  useEffect(() => { document.title = `Merchant ${merchantId} | CBS`; }, [merchantId]);

  const [showSuspend, setShowSuspend] = useState(false);

  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchants', 'detail', id],
    queryFn: () => cardApi.getMerchant(id),
    enabled: id > 0,
  });

  const { data: transactions = [], isLoading: txnLoading } = useSwitchByMerchant(id);
  const { data: terminals = [], isLoading: terminalsLoading } = usePosTerminalsByMerchant(id);

  const { data: allDisputes = [] } = useQuery({
    queryKey: ['card-disputes', 'merchant', merchantId],
    queryFn: () => cardsApi.getByStatus('OPEN'),
    enabled: !!merchantId,
  });
  const merchantDisputes = allDisputes.filter((d) => String(d.merchantId) === merchantId);

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
    { label: 'MCC', value: `${merchant.mcc} — ${merchant.mccDescription}` },
    { label: 'MDR Rate', value: formatPercent(merchant.mdrRate) },
    { label: 'Risk Category', value: merchant.riskCategory },
    { label: 'Status', value: merchant.status },
    { label: 'Chargeback Rate', value: formatPercent(merchant.chargebackRate) },
    { label: 'Monthly Volume', value: formatMoney(merchant.monthlyVolume) },
    { label: 'Settlement', value: merchant.settlementFrequency ?? 'DAILY' },
    { label: 'Contact', value: merchant.contactName ?? '--' },
    { label: 'Email', value: merchant.contactEmail ?? '--' },
    { label: 'Phone', value: merchant.contactPhone ?? '--' },
    { label: 'Bank Account', value: merchant.bankAccountNumber ?? '--' },
    { label: 'Onboarded', value: formatDate(merchant.onboardedDate) },
  ];

  const disputeCols: ColumnDef<CardDispute, unknown>[] = [
    { accessorKey: 'disputeRef', header: 'Ref', cell: ({ row }) => <span className="font-mono text-xs font-medium text-primary">{row.original.disputeRef}</span> },
    { accessorKey: 'disputeReason', header: 'Reason', cell: ({ row }) => <span className="text-sm truncate max-w-[200px] block">{row.original.disputeReason}</span> },
    { accessorKey: 'disputeAmount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.disputeAmount, row.original.disputeCurrency)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'createdAt', header: 'Filed', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.createdAt)}</span> },
  ];

  const tabs = [
    {
      id: 'terminals',
      label: 'Terminals',
      badge: terminals.length || undefined,
      content: (
        <div className="p-4 space-y-3">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> Deploy Terminal
            </button>
          </div>
          <DataTable columns={terminalCols} data={terminals} isLoading={terminalsLoading} enableGlobalFilter emptyMessage="No terminals deployed" />
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
      id: 'analytics',
      label: 'Analytics',
      content: <AnalyticsTab transactions={transactions} merchant={merchant} />,
    },
    {
      id: 'risk',
      label: 'Risk',
      content: <RiskTab transactions={transactions} merchant={merchant} />,
    },
    {
      id: 'chargebacks',
      label: 'Chargebacks',
      badge: merchantDisputes.length || undefined,
      content: (
        <div className="p-4">
          <DataTable columns={disputeCols} data={merchantDisputes} enableGlobalFilter emptyMessage="No disputes for this merchant" />
        </div>
      ),
    },
  ];

  return (
    <>
      {showSuspend && <SuspendDialog merchant={merchant} onClose={() => setShowSuspend(false)} />}

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
              <button onClick={() => toast.success('Merchant reactivated')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-green-600 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/10">
                <Check className="w-4 h-4" /> Reactivate
              </button>
            )}
            {merchant.status === 'ACTIVE' && (
              <button onClick={() => setShowSuspend(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10">
                <ShieldAlert className="w-4 h-4" /> Suspend
              </button>
            )}
            {merchant.status !== 'TERMINATED' && (
              <button onClick={() => toast.error('Termination requires compliance review')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                <X className="w-4 h-4" /> Terminate
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Monthly Volume" value={merchant.monthlyVolume} format="money" compact icon={TrendingUp} />
          <StatCard label="Terminals" value={merchant.terminalCount} format="number" icon={Terminal} />
          <StatCard label="Avg Ticket" value={avgTicket} format="money" compact icon={CreditCard} />
          <StatCard label="Chargeback %" value={merchant.chargebackRate} format="percent" icon={AlertTriangle} />
          <StatCard label="Approval Rate" value={approvalRate} format="percent" icon={Store} />
        </div>

        {/* Info Grid */}
        <div className="rounded-lg border bg-card p-5">
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
