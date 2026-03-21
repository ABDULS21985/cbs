import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts';
import { Activity, TrendingDown, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import { useAlmGapReports } from '../hooks/useAlm';
import type { AlmGapReport } from '../api/almApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtM(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted rounded-lg', className)} />;
}

// ── NII Sensitivity Chart ─────────────────────────────────────────────────────

interface NiiChartProps {
  reports: AlmGapReport[];
  loading: boolean;
}

function NiiSensitivityBarChart({ reports, loading }: NiiChartProps) {
  if (loading) return <Skeleton className="h-80" />;
  if (reports.length === 0) return (
    <div className="h-80 flex items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
      No gap reports available. Generate a gap report first.
    </div>
  );

  // Build chart data showing base/up100/down100 for each report
  const data = reports.slice(-12).map((r) => ({
    date: r.reportDate,
    currency: r.currencyCode,
    label: `${r.reportDate} (${r.currencyCode})`,
    niiBase: Number(r.niiBase),
    niiUp100bp: Number(r.niiUp100bp),
    niiDown100bp: Number(r.niiDown100bp),
    niiSensitivity: Number(r.niiSensitivity),
  }));

  return (
    <div className="bg-card rounded-xl border p-5">
      <h3 className="text-sm font-semibold mb-1">NII Sensitivity by Report Date</h3>
      <p className="text-xs text-muted-foreground mb-4">Base NII vs. +100bps and -100bps parallel shock scenarios</p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number, name: string) => [fmtM(v), name === 'niiBase' ? 'Base NII' : name === 'niiUp100bp' ? '+100bps NII' : name === 'niiDown100bp' ? '-100bps NII' : 'NII Sensitivity']}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
          />
          <Legend formatter={(v) => v === 'niiBase' ? 'Base NII' : v === 'niiUp100bp' ? '+100bps' : v === 'niiDown100bp' ? '-100bps' : 'Sensitivity'} />
          <Bar dataKey="niiBase" fill="#3b82f6" opacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="niiUp100bp" fill="#22c55e" opacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="niiDown100bp" fill="#ef4444" opacity={0.8} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="niiSensitivity" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="niiSensitivity" />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── What-If Simulator ─────────────────────────────────────────────────────────

interface WhatIfProps {
  latestReport: AlmGapReport | undefined;
}

function NiiWhatIfSimulator({ latestReport }: WhatIfProps) {
  const [shockBps, setShockBps] = useState(100);
  const [repricingSpeed, setRepricingSpeed] = useState(75); // % of liabilities that reprice

  if (!latestReport) return null;

  const rsa = Number(latestReport.totalRsa);
  const rsl = Number(latestReport.totalRsl);
  const baseNii = Number(latestReport.niiBase);
  const shock = shockBps / 10000;
  const liabRepricingFactor = repricingSpeed / 100;

  // NII = RSA × shock - RSL × shock × repricing_factor
  const simulatedDeltaNii = rsa * shock - rsl * shock * liabRepricingFactor;
  const simulatedNii = baseNii + simulatedDeltaNii;
  const pctChange = baseNii !== 0 ? (simulatedDeltaNii / Math.abs(baseNii)) * 100 : 0;

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="bg-card rounded-xl border p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">What-If NII Simulator</h3>
        <p className="text-xs text-muted-foreground">Simulate NII impact for a custom rate shock using the latest gap report</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Rate Shock (bps)</label>
          <input
            type="number"
            step={25}
            value={shockBps}
            onChange={(e) => setShockBps(Number(e.target.value))}
            className={inputCls}
          />
          <p className="text-[10px] text-muted-foreground mt-1">Positive = rate rise, negative = rate cut</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Liability Repricing Speed (%)</label>
          <input
            type="number"
            step={5}
            min={0}
            max={100}
            value={repricingSpeed}
            onChange={(e) => setRepricingSpeed(Number(e.target.value))}
            className={inputCls}
          />
          <p className="text-[10px] text-muted-foreground mt-1">% of liabilities that reprice at same rate as assets</p>
        </div>
        <div className="flex flex-col justify-center space-y-2">
          <div className="rounded-lg bg-muted/40 border p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Base NII</p>
            <p className="text-sm font-semibold font-mono">{fmtM(baseNii)}</p>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
        <div className="rounded-lg bg-muted/30 border p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Delta NII</p>
          <p className={cn('text-lg font-bold font-mono', simulatedDeltaNii >= 0 ? 'text-green-600' : 'text-red-600')}>
            {simulatedDeltaNii >= 0 ? '+' : ''}{fmtM(simulatedDeltaNii)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 border p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Projected NII</p>
          <p className="text-lg font-bold font-mono">{fmtM(simulatedNii)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 border p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">% Change</p>
          <p className={cn('text-lg font-bold font-mono', pctChange >= 0 ? 'text-green-600' : 'text-red-600')}>
            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
          </p>
        </div>
      </div>

      {Math.abs(pctChange) > 15 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          NII impact exceeds 15% of base NII — potential regulatory limit breach.
        </div>
      )}
    </div>
  );
}

// ── Report Table ──────────────────────────────────────────────────────────────

function NiiReportTable({ reports, loading }: { reports: AlmGapReport[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-64" />;
  if (reports.length === 0) return (
    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
      No gap reports found. Generate a gap report from the ALM Dashboard.
    </div>
  );

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">NII Sensitivity — All Reports</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/20">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Report Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Currency</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">Base NII</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">+100bps NII</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">-100bps NII</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">NII Sensitivity</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">EVE Base</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">EVE +200bps</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">EVE Sensitivity</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {reports.map((r) => {
              const niiSens = Number(r.niiSensitivity);
              const eveSens = Number(r.eveSensitivity);
              return (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.reportDate}</td>
                  <td className="px-4 py-3">{r.currencyCode}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtM(Number(r.niiBase))}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-green-600 dark:text-green-400">{fmtM(Number(r.niiUp100bp))}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-red-600 dark:text-red-400">{fmtM(Number(r.niiDown100bp))}</td>
                  <td className={cn('px-4 py-3 text-right font-mono text-xs font-semibold', niiSens >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {niiSens >= 0 ? '+' : ''}{fmtM(niiSens)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtM(Number(r.eveBase))}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtM(Number(r.eveUp200bp))}</td>
                  <td className={cn('px-4 py-3 text-right font-mono text-xs font-semibold', eveSens >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {eveSens >= 0 ? '+' : ''}{fmtM(eveSens)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold',
                      r.status === 'FINAL'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    )}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function NiiSensitivityPage() {
  useEffect(() => { document.title = 'NII Sensitivity | CBS ALM'; }, []);

  const { data: reports = [], isLoading } = useAlmGapReports();

  const latestReport = reports.length > 0 ? reports[reports.length - 1] : undefined;
  const niiSens = latestReport ? Number(latestReport.niiSensitivity) : 0;
  const eveSens = latestReport ? Number(latestReport.eveSensitivity) : 0;
  const niiBase = latestReport ? Number(latestReport.niiBase) : 0;
  const eveBase = latestReport ? Number(latestReport.eveBase) : 0;

  return (
    <>
      <PageHeader
        title="NII & EVE Sensitivity"
        subtitle="Net Interest Income and Economic Value of Equity sensitivity to rate shocks"
        backTo="/alm"
      />

      <div className="page-container space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Base NII"
            value={isLoading ? '—' : fmtM(niiBase)}
            icon={DollarSign}
            loading={isLoading}
          />
          <StatCard
            label="NII Sensitivity (+100bps)"
            value={isLoading ? '—' : `${niiSens >= 0 ? '+' : ''}${fmtM(niiSens)}`}
            icon={niiSens >= 0 ? TrendingUp : TrendingDown}
            loading={isLoading}
          />
          <StatCard
            label="EVE Base"
            value={isLoading ? '—' : fmtM(eveBase)}
            icon={Activity}
            loading={isLoading}
          />
          <StatCard
            label="EVE Sensitivity (+200bps)"
            value={isLoading ? '—' : `${eveSens >= 0 ? '+' : ''}${fmtM(eveSens)}`}
            icon={eveSens >= 0 ? TrendingUp : TrendingDown}
            loading={isLoading}
          />
        </div>

        {/* NII Sensitivity Chart */}
        <NiiSensitivityBarChart reports={reports} loading={isLoading} />

        {/* What-If Simulator */}
        <NiiWhatIfSimulator latestReport={latestReport} />

        {/* Full History Table */}
        <NiiReportTable reports={reports} loading={isLoading} />
      </div>
    </>
  );
}
