import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  Users, Shield, AlertTriangle, BarChart3, Plus, Clock,
  Check, X as XIcon,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ColumnDef } from '@tanstack/react-table';
import type { Counterparty } from '../types/counterparty';
import {
  useCounterpartiesByType, usePendingKycCounterparties,
  useUpdateCounterpartyExposure,
} from '../hooks/useCustodyExt';
import { ExposureGauge } from '../components/ExposureGauge';
import { CounterpartyForm } from '../components/CounterpartyForm';
import { KycReviewPanel } from '../components/KycReviewPanel';
import { toast } from 'sonner';

const TYPES = ['ALL', 'BANK', 'BROKER_DEALER', 'CUSTODIAN', 'CCP', 'CORPORATE', 'SOVEREIGN'];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const ratingColor = (rating: string): string => {
  if (!rating) return '';
  const upper = rating.toUpperCase();
  if (upper.startsWith('AAA') || upper.startsWith('AA') || upper.startsWith('A')) return 'text-green-600';
  if (upper.startsWith('BBB')) return 'text-amber-600';
  return 'text-red-600';
};

const riskColors: Record<string, string> = {
  LOW: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HIGH: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const kycColors: Record<string, string> = {
  VERIFIED: 'success', PENDING: 'warning', EXPIRED: 'danger', REJECTED: 'danger',
};

function AgreementIcon({ has }: { has: boolean }) {
  return has
    ? <Check className="w-3.5 h-3.5 text-green-600" />
    : <XIcon className="w-3.5 h-3.5 text-muted-foreground/30" />;
}

// ── Update Exposure Dialog ───────────────────────────────────────────────────

function UpdateExposureDialog({ counterparty, onClose }: { counterparty: Counterparty; onClose: () => void }) {
  const update = useUpdateCounterpartyExposure();
  const [amount, setAmount] = useState(counterparty.currentExposure);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><XIcon className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-4">Update Exposure</h2>
        <p className="text-sm text-muted-foreground mb-3">{counterparty.counterpartyName} ({counterparty.counterpartyCode})</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Current Exposure</label>
            <input type="number" step="0.01" className="w-full mt-1 input" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="text-xs text-muted-foreground">
            Limit: {formatMoney(counterparty.totalExposureLimit)} | Utilization: {counterparty.totalExposureLimit > 0 ? ((amount / counterparty.totalExposureLimit) * 100).toFixed(1) : 0}%
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => update.mutate({ code: counterparty.counterpartyCode, currentExposure: amount }, { onSuccess: () => { toast.success('Exposure updated'); onClose(); } })}
              disabled={update.isPending}
              className="btn-primary"
            >
              {update.isPending ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── All Counterparties Tab ───────────────────────────────────────────────────

function AllCounterpartiesTab() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('ALL');
  const [showForm, setShowForm] = useState(false);

  // Fetch all types to get totals, and filtered for the table
  const { data: allCps = [], isLoading: allLoading } = useCounterpartiesByType('BANK');
  const { data: filtered = [], isLoading } = useCounterpartiesByType(selectedType === 'ALL' ? 'BANK' : selectedType);

  // For "ALL", we aggregate multiple types
  const { data: brokers = [] } = useCounterpartiesByType('BROKER_DEALER');
  const { data: custodians = [] } = useCounterpartiesByType('CUSTODIAN');
  const { data: ccps = [] } = useCounterpartiesByType('CCP');
  const { data: corporates = [] } = useCounterpartiesByType('CORPORATE');
  const { data: sovereigns = [] } = useCounterpartiesByType('SOVEREIGN');

  const allCounterparties = useMemo(
    () => selectedType === 'ALL'
      ? [...allCps, ...brokers, ...custodians, ...ccps, ...corporates, ...sovereigns]
      : filtered,
    [selectedType, allCps, brokers, custodians, ccps, corporates, sovereigns, filtered],
  );

  const totalExposure = allCounterparties.reduce((s, c) => s + c.currentExposure, 0);
  const totalLimit = allCounterparties.reduce((s, c) => s + c.totalExposureLimit, 0);
  const totalAvailable = allCounterparties.reduce((s, c) => s + c.availableLimit, 0);
  const utilPct = totalLimit > 0 ? (totalExposure / totalLimit) * 100 : 0;
  const { data: pendingKyc = [] } = usePendingKycCounterparties();
  const highRisk = allCounterparties.filter((c) => c.riskCategory === 'HIGH').length;

  const columns: ColumnDef<Counterparty, any>[] = [
    { accessorKey: 'counterpartyCode', header: 'Code', cell: ({ row }) => <button onClick={() => navigate(`/custody/counterparties/${row.original.counterpartyCode}`)} className="font-mono text-xs font-medium text-primary hover:underline">{row.original.counterpartyCode}</button> },
    { accessorKey: 'counterpartyName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.counterpartyName}</span> },
    { accessorKey: 'counterpartyType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.counterpartyType} /> },
    { accessorKey: 'lei', header: 'LEI', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.lei || '--'}</span> },
    { accessorKey: 'country', header: 'Country', cell: ({ row }) => <span className="text-xs">{row.original.country}</span> },
    { accessorKey: 'creditRating', header: 'Rating', cell: ({ row }) => <span className={cn('text-xs font-bold', ratingColor(row.original.creditRating))}>{row.original.creditRating || '--'}</span> },
    { accessorKey: 'totalExposureLimit', header: 'Limit', cell: ({ row }) => <span className="text-xs tabular-nums">{formatMoney(row.original.totalExposureLimit)}</span> },
    { accessorKey: 'currentExposure', header: 'Exposure', cell: ({ row }) => <span className="text-xs tabular-nums font-medium">{formatMoney(row.original.currentExposure)}</span> },
    {
      id: 'utilization',
      header: 'Util %',
      cell: ({ row }) => {
        const pct = row.original.totalExposureLimit > 0 ? (row.original.currentExposure / row.original.totalExposureLimit) * 100 : 0;
        return (
          <div className="flex items-center gap-1.5 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-[10px] tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
    { accessorKey: 'kycStatus', header: 'KYC', cell: ({ row }) => <StatusBadge status={row.original.kycStatus} dot /> },
    { accessorKey: 'riskCategory', header: 'Risk', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', riskColors[row.original.riskCategory])}>{row.original.riskCategory}</span> },
    {
      id: 'agreements',
      header: 'Agreements',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5" title={`Netting: ${row.original.nettingAgreement ? 'Yes' : 'No'}, ISDA: ${row.original.isdaAgreement ? 'Yes' : 'No'}, CSA: ${row.original.csaAgreement ? 'Yes' : 'No'}`}>
          <AgreementIcon has={row.original.nettingAgreement} />
          <AgreementIcon has={row.original.isdaAgreement} />
          <AgreementIcon has={row.original.csaAgreement} />
        </div>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Counterparties" value={allCounterparties.length} format="number" icon={Users} />
        <StatCard label="Total Exposure" value={totalExposure} format="money" compact icon={BarChart3} />
        <StatCard label="Available Limit" value={totalAvailable} format="money" compact icon={Shield} />
        <div className="stat-card flex items-center justify-center">
          <ExposureGauge current={totalExposure} limit={totalLimit} size="sm" />
        </div>
        <StatCard label="KYC Pending" value={pendingKyc.length} format="number" icon={Clock} />
        <StatCard label="High Risk" value={highRisk} format="number" icon={AlertTriangle} />
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              selectedType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/40',
            )}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="w-4 h-4" /> New Counterparty
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={allCounterparties}
        isLoading={allLoading || isLoading}
        enableGlobalFilter
        enableExport
        exportFilename="counterparties"
        onRowClick={(row) => navigate(`/custody/counterparties/${row.counterpartyCode}`)}
        emptyMessage="No counterparties found"
      />

      {showForm && <CounterpartyForm onClose={() => setShowForm(false)} onSuccess={(code) => navigate(`/custody/counterparties/${code}`)} />}
    </div>
  );
}

// ── KYC Review Tab ───────────────────────────────────────────────────────────

function KycReviewTab() {
  const { data: pending = [], isLoading } = usePendingKycCounterparties();
  const [reviewTarget, setReviewTarget] = useState<Counterparty | null>(null);

  const columns: ColumnDef<Counterparty, any>[] = [
    { accessorKey: 'counterpartyCode', header: 'Code', cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.counterpartyCode}</span> },
    { accessorKey: 'counterpartyName', header: 'Name', cell: ({ row }) => <span className="text-sm font-medium">{row.original.counterpartyName}</span> },
    { accessorKey: 'counterpartyType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.counterpartyType} /> },
    { accessorKey: 'country', header: 'Country' },
    { accessorKey: 'kycStatus', header: 'KYC Status', cell: ({ row }) => <StatusBadge status={row.original.kycStatus} dot /> },
    { accessorKey: 'kycReviewDate', header: 'Last Review', cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.kycReviewDate ? formatDate(row.original.kycReviewDate) : 'Never'}</span> },
    { accessorKey: 'riskCategory', header: 'Risk', cell: ({ row }) => <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', riskColors[row.original.riskCategory])}>{row.original.riskCategory}</span> },
    {
      id: 'daysSince',
      header: 'Days Since',
      cell: ({ row }) => {
        if (!row.original.kycReviewDate) return <span className="text-xs text-red-600 font-bold">Never</span>;
        const days = Math.ceil((Date.now() - new Date(row.original.kycReviewDate).getTime()) / 86400_000);
        return <span className={cn('text-xs tabular-nums font-medium', days > 365 ? 'text-red-600' : days > 180 ? 'text-amber-600' : '')}>{days}d</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button onClick={() => setReviewTarget(row.original)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">
          Review
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {pending.length > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{pending.length}</strong> counterpart{pending.length !== 1 ? 'ies' : 'y'} require KYC review
          </p>
        </div>
      )}
      <DataTable columns={columns} data={pending} isLoading={isLoading} enableGlobalFilter emptyMessage="No pending KYC reviews" />
      {reviewTarget && <KycReviewPanel counterparty={reviewTarget} onClose={() => setReviewTarget(null)} />}
    </div>
  );
}

// ── Exposure Dashboard Tab ───────────────────────────────────────────────────

function ExposureDashboardTab() {
  const { data: banks = [] } = useCounterpartiesByType('BANK');
  const { data: brokers = [] } = useCounterpartiesByType('BROKER_DEALER');
  const { data: custodians = [] } = useCounterpartiesByType('CUSTODIAN');
  const { data: ccps = [] } = useCounterpartiesByType('CCP');
  const { data: corporates = [] } = useCounterpartiesByType('CORPORATE');
  const { data: sovereigns = [] } = useCounterpartiesByType('SOVEREIGN');

  const [exposureTarget, setExposureTarget] = useState<Counterparty | null>(null);

  const allCps = useMemo(() => [...banks, ...brokers, ...custodians, ...ccps, ...corporates, ...sovereigns], [banks, brokers, custodians, ccps, corporates, sovereigns]);

  const totalExposure = allCps.reduce((s, c) => s + c.currentExposure, 0);
  const totalLimit = allCps.reduce((s, c) => s + c.totalExposureLimit, 0);

  const top10 = useMemo(() => [...allCps].sort((a, b) => b.currentExposure - a.currentExposure).slice(0, 10), [allCps]);

  const concentrationData = useMemo(() => {
    const map = new Map<string, number>();
    allCps.forEach((c) => map.set(c.counterpartyType, (map.get(c.counterpartyType) ?? 0) + c.currentExposure));
    return Array.from(map.entries()).map(([type, exposure]) => ({ type: type.replace(/_/g, ' '), exposure }));
  }, [allCps]);

  const breaches = allCps.filter((c) => c.totalExposureLimit > 0 && (c.currentExposure / c.totalExposureLimit) > 0.8);

  return (
    <div className="p-4 space-y-6">
      {/* Central gauge */}
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center">
        <p className="text-sm font-medium mb-4">Total Portfolio Exposure</p>
        <ExposureGauge current={totalExposure} limit={totalLimit} size="lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 horizontal bar */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Top 10 Exposures</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
              <YAxis type="category" dataKey="counterpartyCode" tick={{ fontSize: 10 }} width={75} />
              <Tooltip formatter={(v: number) => [formatMoney(v), 'Exposure']} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="currentExposure" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Concentration pie */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Concentration by Type</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={concentrationData} dataKey="exposure" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {concentrationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [formatMoney(v), 'Exposure']} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breach Alert */}
      {breaches.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {breaches.length} counterpart{breaches.length !== 1 ? 'ies' : 'y'} above 80% utilization
            </p>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Exposure</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Limit</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Util %</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {breaches.map((c) => {
                  const pct = (c.currentExposure / c.totalExposureLimit) * 100;
                  return (
                    <tr key={c.counterpartyCode} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs font-medium">{c.counterpartyCode}</td>
                      <td className="px-4 py-2 text-sm">{c.counterpartyName}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm">{formatMoney(c.currentExposure)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm">{formatMoney(c.totalExposureLimit)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-sm text-red-600 font-bold">{pct.toFixed(1)}%</td>
                      <td className="px-4 py-2">
                        <button onClick={() => setExposureTarget(c)} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">Update</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {exposureTarget && <UpdateExposureDialog counterparty={exposureTarget} onClose={() => setExposureTarget(null)} />}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CounterpartyPage() {
  const { data: pendingKyc = [] } = usePendingKycCounterparties();

  return (
    <>
      <PageHeader
        title="Counterparty Management"
        subtitle="KYC management, exposure limits, and credit monitoring"
      />
      <div className="page-container space-y-6">
        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'all', label: 'All Counterparties', content: <AllCounterpartiesTab /> },
              {
                id: 'kyc',
                label: 'KYC Review',
                badge: pendingKyc.length > 0 ? pendingKyc.length : undefined,
                content: <KycReviewTab />,
              },
              { id: 'exposure', label: 'Exposure Dashboard', content: <ExposureDashboardTab /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
