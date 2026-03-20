import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plus, Calendar, Download, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatMoneyCompact } from '@/lib/formatters';
import { DataTable, StatusBadge } from '@/components/shared';
import type { DistributionRecord, ScheduledDistribution } from '../../api/wealthApi';
import {
  useRecordDistribution,
  useTrustDistributions,
  useScheduledDistributions,
  useScheduleDistribution,
} from '../../hooks/useWealth';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DistributionSchedulerProps {
  trustCode: string;
  currency: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DISTRIBUTION_TYPES = ['INCOME', 'PRINCIPAL', 'SPECIAL'] as const;
const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMonthlyTrend(records: DistributionRecord[]): { month: string; amount: number }[] {
  const now = new Date();
  const map: Record<string, number> = {};
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    map[key] = 0;
  }
  records.forEach((r) => {
    const d = new Date(r.date);
    const key = `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    if (key in map) map[key] += r.amount;
  });
  return Object.entries(map).map(([month, amount]) => ({ month, amount }));
}

function downloadCSV(records: DistributionRecord[], currency: string) {
  const header = 'Date,Beneficiary,Amount,Type,Approved By\n';
  const rows = records
    .map((r) => `${r.date},${r.beneficiary},${r.amount},${r.type},${r.approvedBy}`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `distributions_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DistributionScheduler({ trustCode, currency }: DistributionSchedulerProps) {
  const { data: distributions = [], isLoading: distLoading } = useTrustDistributions(trustCode);
  const { data: scheduled = [], isLoading: schedLoading } = useScheduledDistributions(trustCode);

  const recordMutation = useRecordDistribution(trustCode);
  const scheduleMutation = useScheduleDistribution(trustCode);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Record distribution form
  const [recordForm, setRecordForm] = useState({
    beneficiary: '',
    amount: '',
    type: 'INCOME' as string,
    date: new Date().toISOString().slice(0, 10),
    reference: '',
  });

  // Schedule distribution form
  const [scheduleForm, setScheduleForm] = useState({
    beneficiaryId: '',
    beneficiaryName: '',
    amount: '',
    frequency: 'MONTHLY' as ScheduledDistribution['frequency'],
    type: 'INCOME' as ScheduledDistribution['type'],
    nextDate: '',
  });

  // ── Derived data ──

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const totalYtd = useMemo(
    () =>
      distributions
        .filter((d) => new Date(d.date) >= startOfYear)
        .reduce((sum, d) => sum + d.amount, 0),
    [distributions],
  );

  const lastDistribution = useMemo(() => {
    if (distributions.length === 0) return null;
    return [...distributions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [distributions]);

  const nextScheduled = useMemo(() => {
    const upcoming = scheduled
      .filter((s) => s.status === 'ACTIVE' && new Date(s.nextDate) >= now)
      .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());
    return upcoming[0] ?? null;
  }, [scheduled]);

  const trendData = useMemo(() => buildMonthlyTrend(distributions), [distributions]);

  // ── Distribution history columns ──

  const distColumns: ColumnDef<DistributionRecord, unknown>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.date)}</span>,
    },
    {
      accessorKey: 'beneficiary',
      header: 'Beneficiary',
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.beneficiary}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold">
          {formatMoney(row.original.amount, currency)}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <StatusBadge status={row.original.type} />,
    },
    {
      accessorKey: 'approvedBy',
      header: 'Approved By',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.approvedBy}</span>
      ),
    },
  ];

  // ── Record distribution submit ──

  async function handleRecordSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await recordMutation.mutateAsync({
        amount: parseFloat(recordForm.amount),
        beneficiary: recordForm.beneficiary,
      });
      toast.success('Distribution recorded successfully');
      setShowRecordModal(false);
      setRecordForm({ beneficiary: '', amount: '', type: 'INCOME', date: new Date().toISOString().slice(0, 10), reference: '' });
    } catch {
      toast.error('Failed to record distribution');
    }
  }

  // ── Schedule distribution submit ──

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await scheduleMutation.mutateAsync({
        beneficiaryId: scheduleForm.beneficiaryId,
        beneficiaryName: scheduleForm.beneficiaryName,
        amount: parseFloat(scheduleForm.amount),
        frequency: scheduleForm.frequency,
        type: scheduleForm.type,
        nextDate: scheduleForm.nextDate,
      });
      toast.success('Distribution scheduled successfully');
      setShowScheduleModal(false);
      setScheduleForm({ beneficiaryId: '', beneficiaryName: '', amount: '', frequency: 'MONTHLY', type: 'INCOME', nextDate: '' });
    } catch {
      toast.error('Failed to schedule distribution');
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-2">Total Distributions YTD</p>
          <p className="text-2xl font-bold font-mono">{formatMoney(totalYtd, currency)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-2">Last Distribution</p>
          {lastDistribution ? (
            <>
              <p className="text-2xl font-bold font-mono">
                {formatMoney(lastDistribution.amount, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(lastDistribution.date)} &middot; {lastDistribution.beneficiary}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No distributions</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-2">Next Scheduled</p>
          {nextScheduled ? (
            <>
              <p className="text-2xl font-bold font-mono">
                {formatMoney(nextScheduled.amount, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(nextScheduled.nextDate)} &middot; {nextScheduled.beneficiaryName}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">None scheduled</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowRecordModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record Distribution
        </button>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Schedule Distribution
        </button>
        <button
          onClick={() => downloadCSV(distributions, currency)}
          disabled={distributions.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Download Statement
        </button>
      </div>

      {/* Distribution Trend Chart */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Distribution Trend (24 Months)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trendData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10 }}
              interval={1}
            />
            <YAxis
              tickFormatter={(v) => formatMoneyCompact(v, currency)}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number) => formatMoney(v, currency)}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution History Table */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-sm font-semibold">Distribution History</h3>
        </div>
        <DataTable
          columns={distColumns}
          data={distributions}
          isLoading={distLoading}
          enableGlobalFilter
          pageSize={10}
          emptyMessage="No distributions recorded"
        />
      </div>

      {/* Record Distribution Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Record Distribution</h2>
              <button
                onClick={() => setShowRecordModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Beneficiary *</label>
                <input
                  required
                  type="text"
                  value={recordForm.beneficiary}
                  onChange={(e) => setRecordForm((f) => ({ ...f, beneficiary: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Beneficiary name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Amount ({currency}) *
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={recordForm.amount}
                  onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Type *</label>
                <select
                  required
                  value={recordForm.type}
                  onChange={(e) => setRecordForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DISTRIBUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Date *</label>
                <input
                  required
                  type="date"
                  value={recordForm.date}
                  onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Reference</label>
                <input
                  type="text"
                  value={recordForm.reference}
                  onChange={(e) => setRecordForm((f) => ({ ...f, reference: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Optional reference"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordMutation.isPending}
                  className={cn(
                    'flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
                    recordMutation.isPending && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {recordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Distribution Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
          <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Schedule Distribution</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Beneficiary Name *</label>
                <input
                  required
                  type="text"
                  value={scheduleForm.beneficiaryName}
                  onChange={(e) =>
                    setScheduleForm((f) => ({
                      ...f,
                      beneficiaryName: e.target.value,
                      beneficiaryId: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    }))
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Beneficiary name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                  Amount ({currency}) *
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={scheduleForm.amount}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Frequency *</label>
                  <select
                    required
                    value={scheduleForm.frequency}
                    onChange={(e) =>
                      setScheduleForm((f) => ({ ...f, frequency: e.target.value as ScheduledDistribution['frequency'] }))
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq.charAt(0) + freq.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Type *</label>
                  <select
                    required
                    value={scheduleForm.type}
                    onChange={(e) =>
                      setScheduleForm((f) => ({ ...f, type: e.target.value as ScheduledDistribution['type'] }))
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {DISTRIBUTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Start Date *</label>
                <input
                  required
                  type="date"
                  value={scheduleForm.nextDate}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, nextDate: e.target.value }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending}
                  className={cn(
                    'flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
                    scheduleMutation.isPending && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  {scheduleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
