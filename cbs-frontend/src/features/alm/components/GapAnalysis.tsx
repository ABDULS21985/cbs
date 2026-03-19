import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import type { GapBucket, AlmGapReport, AlmPositionRow } from '../api/almApi';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtM = (v: number) =>
  Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(1)}B` :
  Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` :
  Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}K` :
  v.toLocaleString();

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

function heatColor(value: number, maxAbs: number): string {
  if (maxAbs === 0) return 'transparent';
  const ratio = Math.max(-1, Math.min(1, value / maxAbs));
  if (ratio > 0) return `rgba(34,197,94,${Math.abs(ratio) * 0.5})`;
  if (ratio < 0) return `rgba(239,68,68,${Math.abs(ratio) * 0.5})`;
  return 'transparent';
}

// ── 1. Dual-Axis Gap Chart ──────────────────────────────────────────────────

interface DualAxisGapChartProps {
  buckets: GapBucket[];
  comparisonBuckets?: GapBucket[];
  comparisonLabel?: string;
  loading: boolean;
  onBucketClick?: (bucket: string) => void;
}

export function DualAxisGapChart({ buckets, comparisonBuckets, comparisonLabel, loading, onBucketClick }: DualAxisGapChartProps) {
  if (loading) return <div className="h-72 rounded-xl bg-muted animate-pulse" />;

  const BUCKET_NAMES = ['0-1M', '1-3M', '3-6M', '6-12M', '1-5Y', '5Y+'];
  const data = BUCKET_NAMES.map((b) => {
    const primary = buckets.find((x) => x.bucket === b);
    const comp = comparisonBuckets?.find((x) => x.bucket === b);
    const totalAll = buckets.reduce((s, x) => s + x.assets + x.liabilities, 1);
    return {
      bucket: b,
      assets: primary?.assets ?? 0,
      liabilities: -(primary?.liabilities ?? 0),
      gap: primary?.gap ?? 0,
      cumulativeGap: primary?.cumulativeGap ?? 0,
      pctOfTotal: primary ? ((primary.assets + primary.liabilities) / totalAll * 100).toFixed(1) : '0',
      compGap: comp?.gap,
      compCumGap: comp?.cumulativeGap,
    };
  });

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tickFormatter={fmtM} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={fmtM} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = data.find((x) => x.bucket === label);
              if (!d) return null;
              return (
                <div className="bg-card border rounded-lg shadow-lg p-3 text-xs space-y-1">
                  <p className="font-semibold">{label}</p>
                  <p className="text-blue-600">Assets: {fmtM(d.assets)}</p>
                  <p className="text-red-600">Liabilities: {fmtM(Math.abs(d.liabilities))}</p>
                  <p className={cn('font-medium', d.gap >= 0 ? 'text-green-600' : 'text-red-600')}>Gap: {fmtM(d.gap)}</p>
                  <p className="text-muted-foreground">Cumulative Gap: {fmtM(d.cumulativeGap)}</p>
                  <p className="text-muted-foreground">{d.pctOfTotal}% of total</p>
                  {d.compGap !== undefined && (
                    <p className="text-amber-600">{comparisonLabel} Gap: {fmtM(d.compGap)}</p>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--border))" />
          {/* Stacked bars: assets positive, liabilities negative */}
          <Bar yAxisId="left" dataKey="assets" fill="#3b82f6" opacity={0.7} radius={[4, 4, 0, 0]} onClick={(d) => onBucketClick?.(d.bucket)} cursor="pointer" />
          <Bar yAxisId="left" dataKey="liabilities" fill="#ef4444" opacity={0.7} radius={[0, 0, 4, 4]} />
          {/* Cumulative gap line on right axis */}
          <Line yAxisId="right" type="monotone" dataKey="cumulativeGap" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} name="Cumulative Gap" />
          {/* Comparison scenario dashed line */}
          {comparisonBuckets && (
            <Line yAxisId="right" type="monotone" dataKey="compCumGap" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} name={comparisonLabel ?? 'Comparison'} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-1">
        Blue bars = assets repricing, Red bars = liabilities repricing, Purple line = cumulative gap
        {comparisonBuckets && ', Amber dashed = comparison scenario'}
      </p>
    </div>
  );
}

// ── 2. Scenario Comparison Delta ────────────────────────────────────────────

interface ScenarioDeltaProps {
  primary: GapBucket[];
  comparison: GapBucket[];
  primaryLabel: string;
  comparisonLabel: string;
}

export function ScenarioDeltaRow({ primary, comparison, primaryLabel, comparisonLabel }: ScenarioDeltaProps) {
  const BUCKET_NAMES = ['0-1M', '1-3M', '3-6M', '6-12M', '1-5Y', '5Y+'];

  return (
    <div className="rounded-xl border overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-muted-foreground font-medium sticky left-0 bg-muted/50">Scenario</th>
            {BUCKET_NAMES.map((b) => <th key={b} className="px-3 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">{b}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr>
            <td className="px-3 py-2 font-medium sticky left-0 bg-card">{primaryLabel}</td>
            {BUCKET_NAMES.map((b) => {
              const v = primary.find((x) => x.bucket === b)?.gap ?? 0;
              return <td key={b} className="px-3 py-2 text-right tabular-nums font-mono">{fmtM(v)}</td>;
            })}
          </tr>
          <tr>
            <td className="px-3 py-2 font-medium sticky left-0 bg-card">{comparisonLabel}</td>
            {BUCKET_NAMES.map((b) => {
              const v = comparison.find((x) => x.bucket === b)?.gap ?? 0;
              return <td key={b} className="px-3 py-2 text-right tabular-nums font-mono">{fmtM(v)}</td>;
            })}
          </tr>
          <tr className="bg-muted/30 font-semibold">
            <td className="px-3 py-2 sticky left-0 bg-muted/30">Delta</td>
            {BUCKET_NAMES.map((b) => {
              const pGap = primary.find((x) => x.bucket === b)?.gap ?? 0;
              const cGap = comparison.find((x) => x.bucket === b)?.gap ?? 0;
              const delta = cGap - pGap;
              // Green if delta reduces absolute gap (toward zero), red if increases
              const reducesRisk = Math.abs(cGap) < Math.abs(pGap);
              return (
                <td key={b} className={cn('px-3 py-2 text-right tabular-nums font-mono',
                  reducesRisk ? 'text-green-600' : delta !== 0 ? 'text-red-600' : '',
                )}>{delta !== 0 ? fmtM(delta) : '—'}</td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── 3. Sensitivity Heat Map ─────────────────────────────────────────────────

interface HeatMapRow {
  scenario: string;
  niiImpact: number;
  eveImpact: number;
  pctOfCapital: number;
  breach: boolean;
}

interface SensitivityHeatMapProps {
  report: AlmGapReport | undefined;
  loading: boolean;
}

export function SensitivityHeatMap({ report, loading }: SensitivityHeatMapProps) {
  if (loading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />;

  const NII_LIMIT = 15; // % of capital
  const scenarios: HeatMapRow[] = [
    { scenario: '+100bps Parallel', niiImpact: (report?.netGap ?? 0) * 0.01 / 1e6, eveImpact: -(report?.netGap ?? 0) * 0.015 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: '+200bps Parallel', niiImpact: (report?.netGap ?? 0) * 0.02 / 1e6, eveImpact: -(report?.netGap ?? 0) * 0.03 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: '+300bps Parallel', niiImpact: (report?.netGap ?? 0) * 0.03 / 1e6, eveImpact: -(report?.netGap ?? 0) * 0.045 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: '-100bps Parallel', niiImpact: -(report?.netGap ?? 0) * 0.01 / 1e6, eveImpact: (report?.netGap ?? 0) * 0.015 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: '-200bps Parallel', niiImpact: -(report?.netGap ?? 0) * 0.02 / 1e6, eveImpact: (report?.netGap ?? 0) * 0.03 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: '-300bps Parallel', niiImpact: -(report?.netGap ?? 0) * 0.03 / 1e6, eveImpact: (report?.netGap ?? 0) * 0.045 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: 'Steepening', niiImpact: (report?.netGap ?? 0) * 0.005 / 1e6, eveImpact: -(report?.netGap ?? 0) * 0.01 / 1e6, pctOfCapital: 0, breach: false },
    { scenario: 'Flattening', niiImpact: -(report?.netGap ?? 0) * 0.005 / 1e6, eveImpact: (report?.netGap ?? 0) * 0.01 / 1e6, pctOfCapital: 0, breach: false },
  ].map((r) => {
    const capital = (report?.totalAssets ?? 1) * 0.08;
    const p = capital > 0 ? Math.abs(r.niiImpact * 1e6) / capital * 100 : 0;
    return { ...r, pctOfCapital: p, breach: p > NII_LIMIT };
  });

  const maxNii = Math.max(...scenarios.map((r) => Math.abs(r.niiImpact)), 1);
  const maxEve = Math.max(...scenarios.map((r) => Math.abs(r.eveImpact)), 1);

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Shock Scenario</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">NII Impact (1Y)</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">EVE Impact</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">% of Tier 1</th>
            <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Breach</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {scenarios.map((r) => (
            <tr key={r.scenario} className="hover:bg-muted/10">
              <td className="px-4 py-2.5 text-sm font-medium">{r.scenario}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-mono text-sm"
                style={{ backgroundColor: heatColor(r.niiImpact, maxNii) }}>
                <span className={r.niiImpact < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>
                  {r.niiImpact >= 0 ? '+' : ''}{r.niiImpact.toFixed(2)}M
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums font-mono text-sm"
                style={{ backgroundColor: heatColor(r.eveImpact, maxEve) }}>
                <span className={r.eveImpact < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>
                  {r.eveImpact >= 0 ? '+' : ''}{r.eveImpact.toFixed(2)}M
                </span>
              </td>
              <td className={cn('px-4 py-2.5 text-right tabular-nums font-mono text-sm',
                r.pctOfCapital > NII_LIMIT ? 'text-red-600 font-bold' : '')}>
                {r.pctOfCapital.toFixed(2)}%
                {r.pctOfCapital > NII_LIMIT && <span className="ml-1 text-xs">(!)</span>}
              </td>
              <td className="px-4 py-2.5 text-center">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  r.breach ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                )}>
                  {r.breach ? 'YES' : 'NO'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground">
        Regulatory limit: NII impact ≤ {NII_LIMIT}% of Tier 1 capital. Cells colored on diverging red-green gradient.
      </div>
    </div>
  );
}

// ── 4. Position Snapshot Table (Repricing Ladder) ────────────────────────────

interface PositionSnapshotProps {
  positions: AlmPositionRow[];
  loading: boolean;
}

const ASSET_LINES = [
  { key: 'cashAndEquivalents', label: 'Cash & Equivalents' },
  { key: 'interbankPlacements', label: 'Interbank Placements' },
  { key: 'securitiesHeld', label: 'Securities Held' },
  { key: 'loansAndAdvances', label: 'Loans & Advances' },
  { key: 'fixedAssets', label: 'Fixed Assets' },
  { key: 'otherAssets', label: 'Other Assets' },
] as const;

const LIABILITY_LINES = [
  { key: 'demandDeposits', label: 'Demand Deposits' },
  { key: 'termDeposits', label: 'Term Deposits' },
  { key: 'interbankBorrowings', label: 'Interbank Borrowings' },
  { key: 'bondsIssued', label: 'Bonds Issued' },
  { key: 'otherLiabilities', label: 'Other Liabilities' },
] as const;

export function PositionSnapshotTable({ positions, loading }: PositionSnapshotProps) {
  if (loading) return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  if (positions.length === 0) return <div className="p-12 text-center text-sm text-muted-foreground">No position data. Generate an ALM position first.</div>;

  const buckets = positions.map((p) => p.timeBucket);
  const getVal = (key: string, bucket: string) => {
    const row = positions.find((p) => p.timeBucket === bucket);
    return row ? (row as any)[key] ?? 0 : 0;
  };
  const sumLine = (key: string) => positions.reduce((s, p) => s + ((p as any)[key] ?? 0), 0);

  const cellClass = 'px-3 py-1.5 text-right tabular-nums font-mono text-xs';
  const headerClass = 'px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap';
  const labelClass = 'px-3 py-1.5 text-sm whitespace-nowrap sticky left-0 bg-card z-10';
  const subtotalLabelClass = 'px-3 py-1.5 text-sm font-semibold whitespace-nowrap sticky left-0 bg-muted/30 z-10';
  const subtotalCellClass = 'px-3 py-1.5 text-right tabular-nums font-mono text-xs font-semibold';

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-20">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground sticky left-0 bg-muted/50 z-30 min-w-[180px]">Line Item</th>
              {buckets.map((b) => <th key={b} className={headerClass}>{b}</th>)}
              <th className={headerClass}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Assets */}
            <tr className="bg-blue-50/50 dark:bg-blue-900/10">
              <td colSpan={buckets.length + 2} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">Assets</td>
            </tr>
            {ASSET_LINES.map(({ key, label }) => (
              <tr key={key} className="hover:bg-muted/10">
                <td className={labelClass}>{label}</td>
                {buckets.map((b) => <td key={b} className={cellClass}>{fmtM(getVal(key, b))}</td>)}
                <td className={cn(cellClass, 'font-semibold')}>{fmtM(sumLine(key))}</td>
              </tr>
            ))}
            <tr className="bg-muted/30">
              <td className={subtotalLabelClass}>Total Assets</td>
              {buckets.map((b) => <td key={b} className={subtotalCellClass}>{fmtM(getVal('totalAssets', b))}</td>)}
              <td className={subtotalCellClass}>{fmtM(sumLine('totalAssets'))}</td>
            </tr>

            {/* Liabilities */}
            <tr className="bg-red-50/50 dark:bg-red-900/10">
              <td colSpan={buckets.length + 2} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">Liabilities</td>
            </tr>
            {LIABILITY_LINES.map(({ key, label }) => (
              <tr key={key} className="hover:bg-muted/10">
                <td className={labelClass}>{label}</td>
                {buckets.map((b) => <td key={b} className={cellClass}>{fmtM(getVal(key, b))}</td>)}
                <td className={cn(cellClass, 'font-semibold')}>{fmtM(sumLine(key))}</td>
              </tr>
            ))}
            <tr className="bg-muted/30">
              <td className={subtotalLabelClass}>Total Liabilities</td>
              {buckets.map((b) => <td key={b} className={subtotalCellClass}>{fmtM(getVal('totalLiabilities', b))}</td>)}
              <td className={subtotalCellClass}>{fmtM(sumLine('totalLiabilities'))}</td>
            </tr>

            {/* Gap rows */}
            <tr className="bg-amber-50/50 dark:bg-amber-900/10">
              <td className={subtotalLabelClass}>Net Gap</td>
              {buckets.map((b) => {
                const v = getVal('gapAmount', b);
                return <td key={b} className={cn(subtotalCellClass, v < 0 ? 'text-red-600' : 'text-green-600')}>{fmtM(v)}</td>;
              })}
              <td className={cn(subtotalCellClass, sumLine('gapAmount') < 0 ? 'text-red-600' : 'text-green-600')}>{fmtM(sumLine('gapAmount'))}</td>
            </tr>
            <tr className="bg-purple-50/50 dark:bg-purple-900/10">
              <td className={subtotalLabelClass}>Cumulative Gap</td>
              {buckets.map((b) => {
                const v = getVal('cumulativeGap', b);
                return <td key={b} className={cn(subtotalCellClass, v < 0 ? 'text-red-600' : 'text-green-600')}>{fmtM(v)}</td>;
              })}
              <td className={subtotalCellClass}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
