import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line,
} from 'recharts';
import { AlertTriangle, TrendingDown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import type {
  StressTestResult, HistoricalReplayResult, ScenarioComparison,
} from '../api/almApi';

// ── NII Waterfall Chart ─────────────────────────────────────────────────────

function NiiWaterfallChart({ data }: { data: StressTestResult['niiWaterfall'] }) {
  const chartData = data.map((d, i) => {
    const isFirst = i === 0;
    const isLast = i === data.length - 1;
    const prev = i > 0 ? data[i - 1].cumulative : 0;
    return {
      step: d.step,
      base: isFirst || isLast ? 0 : Math.min(prev, d.cumulative),
      value: isFirst || isLast ? d.cumulative : Math.abs(d.value),
      fill: isFirst || isLast ? '#3b82f6' : d.value >= 0 ? '#10b981' : '#ef4444',
      label: d.value,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="step" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
          tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} />
        <Tooltip formatter={(v: number) => formatMoney(v)} />
        <Bar dataKey="base" stackId="stack" fill="transparent" />
        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── EVE Sensitivity Pie ─────────────────────────────────────────────────────

const EVE_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

function EveSensitivityPie({ data }: { data: StressTestResult['eveBreakdown'] }) {
  const pieData = [
    { name: 'Repricing Risk', value: Math.abs(data.repricingRisk) },
    { name: 'Basis Risk', value: Math.abs(data.basisRisk) },
    { name: 'Option Risk', value: Math.abs(data.optionRisk) },
    { name: 'Yield Curve', value: Math.abs(data.yieldCurveRisk) },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {pieData.map((_, i) => <Cell key={i} fill={EVE_COLORS[i]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => formatMoney(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Balance Sheet Projection ────────────────────────────────────────────────

function BalanceSheetChart({ data }: { data: StressTestResult['balanceSheetProjection'] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
          tickFormatter={v => `M${v}`} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
          tickFormatter={v => `${(v / 1e9).toFixed(0)}B`} />
        <Tooltip formatter={(v: number) => formatMoney(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="assets" name="Assets" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
        <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Capital Adequacy Bar ────────────────────────────────────────────────────

function CapitalAdequacyBar({ data }: { data: StressTestResult['capitalAdequacy'] }) {
  const chartData = [
    { name: 'Before Stress', value: Number(data.cet1Before), fill: '#3b82f6' },
    { name: 'After Stress', value: Number(data.cet1After), fill: Number(data.cet1After) < Number(data.regulatoryMinimum) ? '#ef4444' : '#10b981' },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 8 }} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 20]} tickFormatter={v => `${v}%`} className="fill-muted-foreground" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} className="fill-muted-foreground" />
        <ReferenceLine x={Number(data.regulatoryMinimum)} stroke="#ef4444" strokeDasharray="6 4"
          label={{ value: `Min ${data.regulatoryMinimum}%`, position: 'top', fontSize: 10, fill: '#ef4444' }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
          {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
        <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Limit Breaches Table ────────────────────────────────────────────────────

function LimitBreachesTable({ breaches }: { breaches: StressTestResult['limitBreaches'] }) {
  if (breaches.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40">
        <Shield className="w-5 h-5 text-green-600" />
        <span className="text-sm text-green-700 dark:text-green-400 font-medium">No limit breaches detected under this scenario.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 dark:border-red-900/40 overflow-hidden">
      <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span className="text-sm font-semibold text-red-700 dark:text-red-400">{breaches.length} Limit Breach{breaches.length > 1 ? 'es' : ''} Detected</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-red-50/50 dark:bg-red-900/10">
            <th className="text-left px-4 py-2 font-medium text-red-700 dark:text-red-400">Limit</th>
            <th className="text-left px-4 py-2 font-medium text-red-700 dark:text-red-400">Threshold</th>
            <th className="text-left px-4 py-2 font-medium text-red-700 dark:text-red-400">Actual</th>
            <th className="text-left px-4 py-2 font-medium text-red-700 dark:text-red-400">Severity</th>
          </tr>
        </thead>
        <tbody>
          {breaches.map((b, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-4 py-2 font-medium">{b.limit}</td>
              <td className="px-4 py-2 font-mono text-xs">{b.threshold}</td>
              <td className="px-4 py-2 font-mono text-xs text-red-600 dark:text-red-400">{b.actual}</td>
              <td className="px-4 py-2">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  b.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')}>
                  {b.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Historical Replay Chart ─────────────────────────────────────────────────

export function HistoricalReplayChart({ data, currentMonth }: { data: HistoricalReplayResult; currentMonth?: number }) {
  const visiblePath = currentMonth !== undefined ? data.path.slice(0, currentMonth + 1) : data.path;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Peak Loss</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400 font-mono">{formatMoney(data.peakLoss)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Peak Gain</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400 font-mono">{formatMoney(data.peakGain)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Final P&L</p>
          <p className={cn('text-lg font-semibold font-mono', Number(data.finalPnl) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {formatMoney(data.finalPnl)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={visiblePath} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" tickFormatter={v => `M${v}`} />
          <YAxis yAxisId="pnl" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
            tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} />
          <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground"
            tickFormatter={v => `${v}bps`} />
          <Tooltip formatter={(v: number, name: string) => name.includes('Rate') ? `${v}bps` : formatMoney(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine yAxisId="pnl" y={0} stroke="#888" strokeDasharray="4 2" />
          <Line yAxisId="pnl" type="monotone" dataKey="cumulativePnl" name="Cumulative P&L" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
          <Line yAxisId="rate" type="monotone" dataKey="rateBps" name="Rate Change (bps)" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Radar Chart for Comparison ──────────────────────────────────────────────

const RADAR_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export function ScenarioRadarChart({ comparison }: { comparison: ScenarioComparison }) {
  const { scenarios } = comparison;
  if (scenarios.length === 0) return null;

  // Normalize each dimension to 0–100 scale
  const maxNii = Math.max(...scenarios.map(s => Math.abs(s.niiImpact)), 1);
  const maxEve = Math.max(...scenarios.map(s => Math.abs(s.eveImpact)), 1);
  const maxCapital = Math.max(...scenarios.map(s => Math.abs(s.capitalAdequacy.capitalImpactPct)), 1);
  const maxBreaches = Math.max(...scenarios.map(s => s.limitBreaches.length), 1);

  const radarData = [
    { axis: 'NII Impact', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, (Math.abs(s.niiImpact) / maxNii) * 100])) },
    { axis: 'EVE Impact', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, (Math.abs(s.eveImpact) / maxEve) * 100])) },
    { axis: 'Capital Impact', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, (Math.abs(s.capitalAdequacy.capitalImpactPct) / maxCapital) * 100])) },
    { axis: 'Limit Breaches', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, (s.limitBreaches.length / maxBreaches) * 100])) },
    { axis: 'Shock Magnitude', ...Object.fromEntries(scenarios.map((s, i) => [`s${i}`, Math.min(Math.abs(s.avgShockBps) / 4, 100)])) },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={radarData}>
        <PolarGrid className="stroke-border" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <PolarRadiusAxis tick={false} domain={[0, 100]} />
        {scenarios.map((s, i) => (
          <Radar key={s.scenarioId} name={s.scenarioName} dataKey={`s${i}`}
            stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]}
            fillOpacity={0.1} strokeWidth={2} />
        ))}
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Main Stress Results Panel ───────────────────────────────────────────────

interface StressResultsPanelProps {
  result: StressTestResult;
}

export function StressResultsPanel({ result }: StressResultsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">NII Impact</div>
          <div className={cn('stat-value font-mono', result.niiImpact >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {formatMoney(result.niiImpact)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">EVE Impact</div>
          <div className={cn('stat-value font-mono', result.eveImpact >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
            {formatMoney(result.eveImpact)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CET1 After Stress</div>
          <div className={cn('stat-value font-mono', Number(result.capitalAdequacy.cet1After) < Number(result.capitalAdequacy.regulatoryMinimum) ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
            {Number(result.capitalAdequacy.cet1After).toFixed(2)}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Limit Breaches</div>
          <div className={cn('stat-value', result.limitBreaches.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
            {result.limitBreaches.length}
          </div>
        </div>
      </div>

      {/* NII Waterfall */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-sm font-semibold mb-4">NII Impact Waterfall</h3>
        <NiiWaterfallChart data={result.niiWaterfall} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EVE Sensitivity */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">EVE Sensitivity by Risk Factor</h3>
          <EveSensitivityPie data={result.eveBreakdown} />
        </div>

        {/* Capital Adequacy */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-sm font-semibold mb-4">Capital Adequacy Impact</h3>
          <CapitalAdequacyBar data={result.capitalAdequacy} />
        </div>
      </div>

      {/* Balance Sheet Projection */}
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-sm font-semibold mb-4">12-Month Balance Sheet Projection Under Stress</h3>
        <BalanceSheetChart data={result.balanceSheetProjection} />
      </div>

      {/* Limit Breaches */}
      <LimitBreachesTable breaches={result.limitBreaches} />
    </div>
  );
}
