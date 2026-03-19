import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatCard, StatusBadge, EmptyState, SummaryBar } from '@/components/shared';
import { Activity, CheckCircle, AlertTriangle, BarChart2, TrendingUp } from 'lucide-react';
import { formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  useActiveMarketMaking,
  useMarketMakingCompliance,
  useMandatePerformance,
} from '../hooks/useTreasury';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  MarketMakingMandate,
  ObligationCompliance,
  ComplianceStatus,
} from '../api/tradingApi';
import { useState } from 'react';

// ─── Compliance Status Color Map ───────────────────────────────────────────────

const complianceColor: Record<ComplianceStatus, string> = {
  COMPLIANT: 'text-green-600 dark:text-green-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  BREACH: 'text-red-600 dark:text-red-400',
  SUSPENDED: 'text-red-700 dark:text-red-500',
};

const complianceBg: Record<ComplianceStatus, string> = {
  COMPLIANT: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  WARNING: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  BREACH: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  SUSPENDED: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
};

// ─── Mandate Performance Chart ─────────────────────────────────────────────────

function MandatePerformanceChart({ code }: { code: string }) {
  const { data, isLoading } = useMandatePerformance(code);

  if (isLoading) {
    return (
      <div className="animate-pulse h-48 bg-muted rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading chart…</span>
      </div>
    );
  }

  if (!data || data.dataPoints.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        No performance data available for {code}.
      </div>
    );
  }

  const chartData = data.dataPoints.map((p) => ({
    date: p.date,
    volume: Math.round(p.volume / 1_000_000),
    spreadBps: Number(p.spreadBps.toFixed(2)),
    quoteTimePct: Number(p.quoteTimePct.toFixed(1)),
  }));

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="volume" orientation="left" tick={{ fontSize: 10 }} unit="M" />
        <YAxis yAxisId="bps" orientation="right" tick={{ fontSize: 10 }} unit="bps" />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === 'Volume (₦M)' ? `₦${value}M` : `${value}bps`,
            name,
          ]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="volume" dataKey="volume" name="Volume (₦M)" fill="#2563eb" radius={[2, 2, 0, 0]} />
        <Bar yAxisId="bps" dataKey="spreadBps" name="Spread (bps)" fill="#d97706" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Active Mandates Table ─────────────────────────────────────────────────────

const mandateColumns: ColumnDef<MarketMakingMandate, any>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">{row.original.code}</span>
    ),
  },
  { accessorKey: 'instrumentName', header: 'Instrument' },
  {
    accessorKey: 'obligationType',
    header: 'Obligation',
    cell: ({ row }) => <StatusBadge status={row.original.obligationType} />,
  },
  {
    accessorKey: 'maxBidAskSpreadBps',
    header: 'Max Spread (bps)',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.maxBidAskSpreadBps} bps</span>
    ),
  },
  {
    accessorKey: 'currentBidAskSpread',
    header: 'Current Spread',
    cell: ({ row }) => {
      const current = row.original.currentBidAskSpread;
      const max = row.original.maxBidAskSpreadBps;
      if (current == null) return <span className="text-muted-foreground text-xs">—</span>;
      const over = current > max;
      return (
        <span
          className={cn(
            'font-mono text-sm font-medium',
            over ? 'text-red-600' : 'text-green-600',
          )}
        >
          {current.toFixed(1)} bps
        </span>
      );
    },
  },
  {
    accessorKey: 'minQuoteTimePct',
    header: 'Min Quote Time',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatPercent(row.original.minQuoteTimePct)}</span>
    ),
  },
  {
    accessorKey: 'quoteTimePct',
    header: 'Actual Quote Time',
    cell: ({ row }) => {
      const actual = row.original.quoteTimePct;
      const min = row.original.minQuoteTimePct;
      return (
        <span
          className={cn(
            'font-mono text-sm font-medium',
            actual < min ? 'text-red-600' : 'text-green-600',
          )}
        >
          {formatPercent(actual)}
        </span>
      );
    },
  },
  {
    accessorKey: 'complianceStatus',
    header: 'Compliance',
    cell: ({ row }) => {
      const s = row.original.complianceStatus;
      return (
        <span className={cn('text-xs font-semibold', complianceColor[s])}>
          {s === 'COMPLIANT' ? (
            <CheckCircle className="inline w-3.5 h-3.5 mr-0.5" />
          ) : (
            <AlertTriangle className="inline w-3.5 h-3.5 mr-0.5" />
          )}
          {s}
        </span>
      );
    },
  },
];

// ─── Compliance Report Table ───────────────────────────────────────────────────

const complianceColumns: ColumnDef<ObligationCompliance, any>[] = [
  {
    accessorKey: 'mandateCode',
    header: 'Mandate',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">{row.original.mandateCode}</span>
    ),
  },
  { accessorKey: 'instrument', header: 'Instrument' },
  {
    accessorKey: 'requiredQuoteTimePct',
    header: 'Req. Quote Time',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatPercent(row.original.requiredQuoteTimePct)}</span>
    ),
  },
  {
    accessorKey: 'actualQuoteTimePct',
    header: 'Actual Quote Time',
    cell: ({ row }) => {
      const actual = row.original.actualQuoteTimePct;
      const req = row.original.requiredQuoteTimePct;
      return (
        <span
          className={cn(
            'font-mono text-sm font-semibold',
            actual < req ? 'text-red-600' : 'text-green-600',
          )}
        >
          {formatPercent(actual)}
        </span>
      );
    },
  },
  {
    accessorKey: 'maxAllowedSpreadBps',
    header: 'Max Spread',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.maxAllowedSpreadBps} bps</span>
    ),
  },
  {
    accessorKey: 'avgActualSpreadBps',
    header: 'Avg Spread',
    cell: ({ row }) => {
      const avg = row.original.avgActualSpreadBps;
      const max = row.original.maxAllowedSpreadBps;
      return (
        <span
          className={cn('font-mono text-sm font-semibold', avg > max ? 'text-red-600' : 'text-green-600')}
        >
          {avg.toFixed(1)} bps
        </span>
      );
    },
  },
  {
    accessorKey: 'breachCount',
    header: 'Breaches',
    cell: ({ row }) => {
      const count = row.original.breachCount;
      return (
        <span
          className={cn(
            'font-mono text-sm font-semibold',
            count > 0 ? 'text-red-600' : 'text-green-600',
          )}
        >
          {count}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border',
          complianceBg[row.original.status],
          complianceColor[row.original.status],
        )}
      >
        {row.original.status === 'COMPLIANT' ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        {row.original.status}
      </div>
    ),
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MarketMakingPage() {
  const { data: mandates = [], isLoading: mandatesLoading } = useActiveMarketMaking();
  const { data: compliance = [], isLoading: complianceLoading } = useMarketMakingCompliance();
  const [selectedMandateCode, setSelectedMandateCode] = useState<string>('');

  const activeMandates = mandates.length;
  const compliantCount = mandates.filter((m) => m.complianceStatus === 'COMPLIANT').length;
  const compliancePct = activeMandates > 0 ? (compliantCount / activeMandates) * 100 : 0;
  const avgSpread =
    mandates.length > 0
      ? mandates.reduce((s, m) => s + (m.currentBidAskSpread ?? m.maxBidAskSpreadBps), 0) /
        mandates.length
      : 0;
  const totalVolume = mandates.reduce((s, m) => s + m.todayVolume, 0);

  const firstMandateCode = mandates[0]?.code ?? '';
  const chartCode = selectedMandateCode || firstMandateCode;

  return (
    <>
      <PageHeader
        title="Market Making"
        subtitle="Active mandates, obligation compliance and performance analytics"
      />

      <div className="page-container space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Mandates"
            value={activeMandates}
            format="number"
            icon={Activity}
            loading={mandatesLoading}
          />
          <StatCard
            label="Obligation Compliance"
            value={compliancePct}
            format="percent"
            icon={CheckCircle}
            trend={compliancePct >= 80 ? 'up' : 'down'}
            loading={mandatesLoading}
          />
          <StatCard
            label="Avg Bid/Ask Spread"
            value={`${avgSpread.toFixed(1)} bps`}
            icon={BarChart2}
            loading={mandatesLoading}
          />
          <StatCard
            label="Today's Total Volume"
            value={totalVolume}
            format="money"
            compact
            icon={TrendingUp}
            loading={mandatesLoading}
          />
        </div>

        {/* Breach Alert Banner */}
        {!mandatesLoading && mandates.some((m) => m.complianceStatus === 'BREACH') && (
          <div
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg border text-sm',
              complianceBg['BREACH'],
              complianceColor['BREACH'],
            )}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <strong>Compliance Breach Detected</strong> —{' '}
              {mandates.filter((m) => m.complianceStatus === 'BREACH').length} mandate(s) are
              currently in breach of their obligation requirements. Immediate review required.
            </div>
          </div>
        )}

        {/* Active Mandates Table */}
        <div className="card">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Active Mandates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time spread and quote time compliance monitoring
            </p>
          </div>
          <div className="p-4">
            <DataTable
              columns={mandateColumns}
              data={mandates}
              isLoading={mandatesLoading}
              enableGlobalFilter
              enableExport
              exportFilename="market-making-mandates"
            />
            {!mandatesLoading && mandates.length === 0 && (
              <EmptyState
                icon={Activity}
                title="No active mandates"
                description="Market making mandates will appear here once configured."
              />
            )}
          </div>
        </div>

        {/* Performance Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Mandate Performance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily volume and spread for selected mandate
              </p>
            </div>
            {mandates.length > 0 && (
              <select
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={chartCode}
                onChange={(e) => setSelectedMandateCode(e.target.value)}
              >
                {mandates.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code} — {m.instrumentName}
                  </option>
                ))}
              </select>
            )}
          </div>
          {chartCode ? (
            <MandatePerformanceChart code={chartCode} />
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              Select a mandate to view performance.
            </div>
          )}
        </div>

        {/* Compliance Report */}
        <div className="card">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Obligation Compliance Report</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Period-by-period compliance assessment for all mandates
            </p>
          </div>
          <div className="p-4">
            <SummaryBar
              items={[
                { label: 'Mandates Assessed', value: compliance.length, format: 'number' },
                {
                  label: 'Compliant',
                  value: compliance.filter((c) => c.status === 'COMPLIANT').length,
                  format: 'number',
                  color: 'success',
                },
                {
                  label: 'Warning',
                  value: compliance.filter((c) => c.status === 'WARNING').length,
                  format: 'number',
                  color: 'warning',
                },
                {
                  label: 'Breach',
                  value: compliance.filter((c) => c.status === 'BREACH').length,
                  format: 'number',
                  color: 'danger',
                },
                {
                  label: 'Total Breaches',
                  value: compliance.reduce((s, c) => s + c.breachCount, 0),
                  format: 'number',
                  color: 'danger',
                },
              ]}
            />
            <div className="mt-4">
              <DataTable
                columns={complianceColumns}
                data={compliance}
                isLoading={complianceLoading}
                enableGlobalFilter
                enableExport
                exportFilename="market-making-compliance"
              />
              {!complianceLoading && compliance.length === 0 && (
                <EmptyState
                  icon={CheckCircle}
                  title="No compliance records"
                  description="Compliance assessment records will appear here."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
