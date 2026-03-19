import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent } from '@/lib/formatters';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, ReferenceLine, Legend,
} from 'recharts';
import { Activity, TrendingUp, Target, DollarSign, Calculator, X, ArrowRight } from 'lucide-react';
import { MoneyInput } from '@/components/shared/MoneyInput';
import { DurationGauge } from '../components/DurationGauge';
import { useDurationAnalytics } from '../hooks/useAlm';
import type { Dv01LadderRow, KeyRateDurationPoint } from '../api/almApi';

const PORTFOLIO = 'MAIN';

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted rounded-lg', className)} />;
}

// ── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Activity;
  color?: 'green' | 'amber' | 'red' | 'blue';
  loading?: boolean;
}) {
  const colorCls = {
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  };
  const valColor = {
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

// ── DV01 Ladder Table ────────────────────────────────────────────────────────

function Dv01Ladder({ rows, loading }: { rows: Dv01LadderRow[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-96" />;

  const maxDv01 = Math.max(...rows.map((r) => Math.abs(r.dv01)), 1);

  const totals = rows.reduce(
    (acc, r) => ({
      notional: acc.notional + r.notional,
      dv01: acc.dv01 + r.dv01,
      kr1Y: acc.kr1Y + r.kr1Y,
      kr2Y: acc.kr2Y + r.kr2Y,
      kr5Y: acc.kr5Y + r.kr5Y,
      kr10Y: acc.kr10Y + r.kr10Y,
    }),
    { notional: 0, dv01: 0, kr1Y: 0, kr2Y: 0, kr5Y: 0, kr10Y: 0 },
  );

  const dv01HeatColor = (v: number) => {
    const intensity = Math.min(Math.abs(v) / maxDv01, 1);
    return `rgba(59, 130, 246, ${intensity * 0.3 + 0.05})`;
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">DV01 Ladder</h3>
        <p className="text-xs text-muted-foreground">Contribution by portfolio bucket</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/20">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bucket</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Notional</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">DV01</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">% Total</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">KR01 1Y</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">KR01 2Y</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">KR01 5Y</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">KR01 10Y</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.bucket} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{row.bucket}</td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{formatMoney(row.notional, 'NGN')}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.duration.toFixed(2)}Y</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ backgroundColor: dv01HeatColor(row.dv01) }}>
                  {formatMoney(row.dv01, 'NGN')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPercent(row.pctOfTotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(row.kr1Y, 'NGN')}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(row.kr2Y, 'NGN')}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(row.kr5Y, 'NGN')}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(row.kr10Y, 'NGN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-muted/30 font-semibold">
            <tr>
              <td className="px-4 py-3">Portfolio Total</td>
              <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{formatMoney(totals.notional, 'NGN')}</td>
              <td className="px-4 py-3 text-right">—</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.dv01, 'NGN')}</td>
              <td className="px-4 py-3 text-right">100%</td>
              <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(totals.kr1Y, 'NGN')}</td>
              <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(totals.kr2Y, 'NGN')}</td>
              <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(totals.kr5Y, 'NGN')}</td>
              <td className="px-4 py-3 text-right tabular-nums text-xs">{formatMoney(totals.kr10Y, 'NGN')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Key Rate Duration Chart ──────────────────────────────────────────────────

function KeyRateDurationChart({ data, loading }: { data: KeyRateDurationPoint[]; loading: boolean }) {
  if (loading) return <Skeleton className="h-80" />;

  return (
    <div className="bg-card rounded-xl border p-5">
      <h3 className="text-sm font-semibold mb-1">Key Rate Duration Profile</h3>
      <p className="text-xs text-muted-foreground mb-4">Asset vs liability duration by tenor point</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="tenor" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}Y`} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            formatter={(value: number, name: string) => [`${value.toFixed(4)}Y`, name === 'assetKrd' ? 'Assets' : name === 'liabilityKrd' ? 'Liabilities' : 'Net']}
          />
          <Legend formatter={(value) => value === 'assetKrd' ? 'Assets' : value === 'liabilityKrd' ? 'Liabilities' : 'Net Gap'} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Area type="monotone" dataKey="assetKrd" stroke="none" fill="hsl(217 91% 60%)" fillOpacity={0.08} />
          <Area type="monotone" dataKey="liabilityKrd" stroke="none" fill="hsl(0 84% 60%)" fillOpacity={0.08} />
          <Line type="monotone" dataKey="assetKrd" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="liabilityKrd" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="netKrd" stroke="hsl(142 71% 45%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Immunization Strategy Panel ──────────────────────────────────────────────

function ImmunizationPanel({ durationGap, dv01, loading }: { durationGap: number; dv01: number; loading: boolean }) {
  const [instrument, setInstrument] = useState('FGN_5Y');
  const [notional, setNotional] = useState(0);
  const [showResult, setShowResult] = useState(false);

  if (loading) return <Skeleton className="h-72" />;

  const instruments: Record<string, { label: string; duration: number }> = {
    FGN_5Y: { label: '5Y FGN Bond', duration: 4.2 },
    FGN_10Y: { label: '10Y FGN Bond', duration: 7.8 },
    FGN_2Y: { label: '2Y FGN Bond', duration: 1.9 },
    IRS_5Y: { label: '5Y IRS (Receive Fixed)', duration: 4.5 },
    TBILL_1Y: { label: '1Y T-Bill', duration: 0.95 },
  };

  const selected = instruments[instrument];
  const dv01Change = selected ? (selected.duration * notional * 0.0001) : 0;
  const newGap = durationGap - (notional > 0 ? selected.duration * (notional / (dv01 / 0.0001 + notional)) : 0);

  // Optimal hedge recommendation
  const optimalNotional = Math.abs(durationGap) > 0 && selected
    ? Math.abs(durationGap * (dv01 / 0.0001)) / selected.duration
    : 0;

  const handleSimulate = () => { if (notional > 0) setShowResult(true); };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="bg-card rounded-xl border p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Immunization Strategy</h3>
        <p className="text-xs text-muted-foreground">Simulate trades to reduce duration gap</p>
      </div>

      {/* Optimal hedge recommendation */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 p-4">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Optimal Hedge Recommendation</p>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          {durationGap > 0
            ? `Sell ${formatMoney(optimalNotional, 'NGN')} of ${selected.label} to close the ${durationGap.toFixed(2)}Y gap`
            : `Buy ${formatMoney(optimalNotional, 'NGN')} of ${selected.label} to close the ${Math.abs(durationGap).toFixed(2)}Y gap`}
        </p>
      </div>

      {/* What-if tool */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Instrument</label>
          <select value={instrument} onChange={(e) => { setInstrument(e.target.value); setShowResult(false); }} className={inputCls}>
            {Object.entries(instruments).map(([k, v]) => (
              <option key={k} value={k}>{v.label} (Dur: {v.duration}Y)</option>
            ))}
          </select>
        </div>
        <MoneyInput label="Notional" value={notional} onChange={(v) => { setNotional(v); setShowResult(false); }} currency="NGN" />
        <div className="flex items-end">
          <button onClick={handleSimulate} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Calculator className="w-4 h-4" /> Simulate
          </button>
        </div>
      </div>

      {/* Result */}
      {showResult && notional > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Before</p>
              <p className={cn('text-lg font-bold tabular-nums', Math.abs(durationGap) > 2.5 ? 'text-red-600' : Math.abs(durationGap) > 1.5 ? 'text-amber-600' : 'text-green-600')}>
                {durationGap >= 0 ? '+' : ''}{durationGap.toFixed(2)}Y
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">After</p>
              <p className={cn('text-lg font-bold tabular-nums', Math.abs(newGap) > 2.5 ? 'text-red-600' : Math.abs(newGap) > 1.5 ? 'text-amber-600' : 'text-green-600')}>
                {newGap >= 0 ? '+' : ''}{newGap.toFixed(2)}Y
              </p>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">DV01 Change</span>
            <span className="font-mono tabular-nums">{formatMoney(dv01Change, 'NGN')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Cost (bid-ask)</span>
            <span className="font-mono tabular-nums">{formatMoney(notional * 0.001, 'NGN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function DurationAnalyticsPage() {
  const { data, isLoading } = useDurationAnalytics(PORTFOLIO);

  const durationGap = data?.durationGap ?? 0;
  const gapZone = Math.abs(durationGap) <= 1.5 ? 'green' : Math.abs(durationGap) <= 2.5 ? 'amber' : 'red';

  return (
    <>
      <PageHeader
        title="Duration Analytics"
        subtitle="Portfolio duration, DV01 ladder, key rate risk, and immunization strategy"
        backTo="/alm"
      />

      <div className="page-container space-y-6">
        {/* 1. Duration Dashboard Header — 4 metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Macaulay Duration (Assets)"
            value={data ? `${data.macaulayDurationAssets.toFixed(2)}Y` : '—'}
            sub="Weighted average time to cash flows"
            icon={Activity}
            color="blue"
            loading={isLoading}
          />
          <MetricCard
            label="Modified Duration (Liabilities)"
            value={data ? `${data.modifiedDurationLiabilities.toFixed(2)}Y` : '—'}
            sub="Price sensitivity to rate changes"
            icon={TrendingUp}
            color="blue"
            loading={isLoading}
          />
          <MetricCard
            label="Duration Gap"
            value={data ? `${durationGap >= 0 ? '+' : ''}${durationGap.toFixed(2)}Y` : '—'}
            sub={durationGap > 0 ? 'Asset-sensitive' : durationGap < 0 ? 'Liability-sensitive' : 'Immunized'}
            icon={Target}
            color={gapZone as 'green' | 'amber' | 'red'}
            loading={isLoading}
          />
          <MetricCard
            label="DV01"
            value={data ? formatMoney(data.dv01, 'NGN') : '—'}
            sub="P&L impact of 1bp parallel shift"
            icon={DollarSign}
            color="blue"
            loading={isLoading}
          />
        </div>

        {/* 2. Duration Gap Gauge + 3. DV01 Ladder side by side on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl border p-5 flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold mb-4 self-start">Duration Gap Gauge</h3>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <DurationGauge value={durationGap} />
            )}
          </div>
          <div className="lg:col-span-2">
            <Dv01Ladder rows={data?.dv01Ladder ?? []} loading={isLoading} />
          </div>
        </div>

        {/* 4. Key Rate Duration Chart */}
        <KeyRateDurationChart data={data?.keyRateDurations ?? []} loading={isLoading} />

        {/* 5. Immunization Strategy Panel */}
        <ImmunizationPanel durationGap={durationGap} dv01={data?.dv01 ?? 0} loading={isLoading} />
      </div>
    </>
  );
}
