import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, AreaChart, Area,
} from 'recharts';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
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

// ── IRR Risk Metrics Card ─────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  color?: 'green' | 'amber' | 'red' | 'blue';
  loading?: boolean;
}

function MetricCard({ label, value, sub, icon: Icon, color, loading }: MetricCardProps) {
  const colorCls: Record<string, string> = {
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  };
  const valColor: Record<string, string> = {
    green: 'text-green-700 dark:text-green-400',
    amber: 'text-amber-700 dark:text-amber-400',
    red: 'text-red-700 dark:text-red-400',
    blue: 'text-blue-700 dark:text-blue-400',
  };

  if (loading) return <Skeleton className="h-28" />;

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn('p-2 rounded-lg', color ? colorCls[color] : 'bg-muted text-muted-foreground')}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={cn('text-2xl font-bold tabular-nums', color ? valColor[color] : 'text-foreground')}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Repricing Gap Trend Chart ─────────────────────────────────────────────────

function RepricingGapTrend({ reports, loading }: { reports: AlmGapReport[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-72" />;
  if (reports.length === 0) return (
    <div className="h-72 flex items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
      No gap report history. Generate gap reports to populate this chart.
    </div>
  );

  const data = reports.slice(-12).map((r) => ({
    date: `${r.reportDate} (${r.currencyCode})`,
    cumulativeGap: Number(r.cumulativeGap),
    gapRatio: Number(r.gapRatio) * 100,
    niiSensitivity: Number(r.niiSensitivity),
    eveSensitivity: Number(r.eveSensitivity),
  }));

  return (
    <div className="bg-card rounded-xl border p-5">
      <h3 className="text-sm font-semibold mb-1">Repricing Gap Trend (12-Month History)</h3>
      <p className="text-xs text-muted-foreground mb-4">Cumulative repricing gap and gap ratio over time</p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis yAxisId="left" tickFormatter={fmtM} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            formatter={(v: number, name: string) => name === 'gapRatio' ? [`${v.toFixed(2)}%`, 'Gap Ratio'] : [fmtM(v), name === 'cumulativeGap' ? 'Cumulative Gap' : 'NII Sensitivity']}
          />
          <Legend />
          <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--border))" />
          <Area yAxisId="left" type="monotone" dataKey="cumulativeGap" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} name="cumulativeGap" />
          <Line yAxisId="left" type="monotone" dataKey="niiSensitivity" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="niiSensitivity" />
          <Line yAxisId="right" type="monotone" dataKey="gapRatio" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="gapRatio" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── NII/EVE Scenario Ladder ───────────────────────────────────────────────────

function IrrScenarioLadder({ report }: { report: AlmGapReport | undefined }) {
  if (!report) return (
    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
      Select a gap report to view the IRR scenario ladder.
    </div>
  );

  const rsa = Number(report.totalRsa);
  const rsl = Number(report.totalRsl);
  const gap = rsa - rsl;
  const eveBase = Number(report.eveBase);
  const durationGap = Number(report.durationGap ?? 0);

  // Build ladder rows at multiple shock levels
  const SHOCK_BPS = [-300, -200, -100, 0, 100, 200, 300, 400];
  const rows = SHOCK_BPS.map((bps) => {
    const shock = bps / 10000;
    // NII: gap × shock × liability repricing factor (80%)
    const deltaNii = gap * shock;
    const niiUp = Number(report.niiBase) + deltaNii;
    const niiPct = Number(report.niiBase) !== 0 ? (deltaNii / Math.abs(Number(report.niiBase))) * 100 : 0;
    // EVE: -duration_gap × EVE_base × shock
    const deltaEve = -(durationGap * eveBase * shock);
    const eveScenario = eveBase + deltaEve;
    const evePct = eveBase !== 0 ? (deltaEve / Math.abs(eveBase)) * 100 : 0;
    const niiBreach = Math.abs(niiPct) > 15;
    const eveBreach = Math.abs(evePct) > 20;
    return { bps, deltaNii, nii: niiUp, niiPct, deltaEve, eve: eveScenario, evePct, niiBreach, eveBreach };
  });

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-semibold">IRR Shock Scenario Ladder</h3>
        <p className="text-xs text-muted-foreground">Report: {report.reportDate} ({report.currencyCode})</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/20">
            <tr>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs">Shock</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">Delta NII</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">Projected NII</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">NII % Change</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">Delta EVE</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">Projected EVE</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs">EVE % Change</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground text-xs">Breach</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const isBase = row.bps === 0;
              const hasBreach = row.niiBreach || row.eveBreach;
              return (
                <tr key={row.bps} className={cn(
                  'hover:bg-muted/20 transition-colors',
                  isBase && 'bg-blue-50/30 dark:bg-blue-950/10',
                  hasBreach && 'border-l-2 border-l-red-500',
                )}>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold',
                      row.bps > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      row.bps < 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    )}>
                      {row.bps === 0 ? 'Base' : `${row.bps > 0 ? '+' : ''}${row.bps}bps`}
                    </span>
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-mono text-xs', row.deltaNii >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {row.deltaNii >= 0 ? '+' : ''}{fmtM(row.deltaNii)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtM(row.nii)}</td>
                  <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-semibold', row.niiBreach ? 'text-red-600 font-bold' : row.niiPct >= 0 ? 'text-green-600' : 'text-amber-600')}>
                    {row.niiPct >= 0 ? '+' : ''}{row.niiPct.toFixed(2)}%
                    {row.niiBreach && <span className="ml-1 text-red-500">(!)</span>}
                  </td>
                  <td className={cn('px-4 py-2.5 text-right font-mono text-xs', row.deltaEve >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {row.deltaEve >= 0 ? '+' : ''}{fmtM(row.deltaEve)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fmtM(row.eve)}</td>
                  <td className={cn('px-4 py-2.5 text-right font-mono text-xs font-semibold', row.eveBreach ? 'text-red-600 font-bold' : row.evePct >= 0 ? 'text-green-600' : 'text-amber-600')}>
                    {row.evePct >= 0 ? '+' : ''}{row.evePct.toFixed(2)}%
                    {row.eveBreach && <span className="ml-1 text-red-500">(!)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {hasBreach ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="w-3 h-3" /> BREACH
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
        Regulatory limits: NII impact ≤ 15% of base NII; EVE impact ≤ 20% of Tier 1 capital.
        Rows highlighted in red indicate limit breaches. Base case row in blue.
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function IrrAnalysisPage() {
  useEffect(() => { document.title = 'IRR Analysis | CBS ALM'; }, []);

  const { data: reports = [], isLoading } = useAlmGapReports();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // Default to latest report
  const latestReport = reports.length > 0 ? reports[reports.length - 1] : undefined;
  const selectedReport = useMemo(
    () => selectedReportId != null ? reports.find((r) => r.id === selectedReportId) : latestReport,
    [reports, selectedReportId, latestReport],
  );

  // Risk metrics from selected report
  const cumulativeGap = selectedReport ? Number(selectedReport.cumulativeGap) : 0;
  const gapRatio = selectedReport ? Number(selectedReport.gapRatio) : 0;
  const niiSens = selectedReport ? Number(selectedReport.niiSensitivity) : 0;
  const eveSens = selectedReport ? Number(selectedReport.eveSensitivity) : 0;
  const durationGap = selectedReport ? Number(selectedReport.durationGap ?? 0) : 0;

  const riskZone = Math.abs(cumulativeGap) > 5e9 ? 'red' : Math.abs(cumulativeGap) > 2e9 ? 'amber' : 'green';

  return (
    <>
      <PageHeader
        title="IRR Analysis"
        subtitle="Interest Rate Risk — repricing gap, NII & EVE sensitivity across shock scenarios"
        backTo="/alm"
      />

      <div className="page-container space-y-6">
        {/* Report Selector */}
        {reports.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Gap Report:</label>
            <select
              value={selectedReportId ?? ''}
              onChange={(e) => setSelectedReportId(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-1.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Latest ({latestReport?.reportDate} / {latestReport?.currencyCode})</option>
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reportDate} — {r.currencyCode} ({r.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Cumulative Gap"
            value={isLoading ? '—' : fmtM(cumulativeGap)}
            sub={cumulativeGap > 0 ? 'Asset-sensitive' : cumulativeGap < 0 ? 'Liability-sensitive' : 'Neutral'}
            icon={Activity}
            color={riskZone as 'green' | 'amber' | 'red'}
            loading={isLoading}
          />
          <MetricCard
            label="Gap Ratio (RSA/RSL)"
            value={isLoading ? '—' : `${(gapRatio * 100).toFixed(2)}%`}
            sub={gapRatio > 1 ? 'More assets repricing' : gapRatio < 1 ? 'More liabilities repricing' : '—'}
            icon={Shield}
            color={Math.abs(gapRatio - 1) < 0.05 ? 'green' : Math.abs(gapRatio - 1) < 0.15 ? 'amber' : 'red'}
            loading={isLoading}
          />
          <MetricCard
            label="NII Sensitivity (+100bps)"
            value={isLoading ? '—' : `${niiSens >= 0 ? '+' : ''}${fmtM(niiSens)}`}
            sub="1-year NII change"
            icon={niiSens >= 0 ? TrendingUp : TrendingDown}
            color={niiSens >= 0 ? 'green' : 'red'}
            loading={isLoading}
          />
          <MetricCard
            label="EVE Sensitivity (+200bps)"
            value={isLoading ? '—' : `${eveSens >= 0 ? '+' : ''}${fmtM(eveSens)}`}
            sub="Economic value impact"
            icon={eveSens >= 0 ? TrendingUp : TrendingDown}
            color={eveSens >= 0 ? 'green' : 'red'}
            loading={isLoading}
          />
          <MetricCard
            label="Duration Gap"
            value={isLoading ? '—' : `${durationGap >= 0 ? '+' : ''}${Number(durationGap).toFixed(2)}Y`}
            sub={durationGap > 0 ? 'Assets longer' : durationGap < 0 ? 'Liabilities longer' : 'Immunized'}
            icon={Zap}
            color={Math.abs(durationGap) < 1.5 ? 'green' : Math.abs(durationGap) < 2.5 ? 'amber' : 'red'}
            loading={isLoading}
          />
        </div>

        {/* Repricing Gap Trend */}
        <RepricingGapTrend reports={reports} loading={isLoading} />

        {/* IRR Scenario Ladder */}
        <IrrScenarioLadder report={selectedReport} />
      </div>
    </>
  );
}
