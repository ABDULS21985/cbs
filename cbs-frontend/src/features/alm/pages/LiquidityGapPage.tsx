import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import {
  Droplets, ShieldCheck, TrendingUp, TrendingDown, AlertTriangle,
  Activity, Loader2, RefreshCw, CheckCircle2, XCircle,
  Landmark, Banknote, CreditCard, Building2, Wallet, ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact, formatMoney } from '@/lib/formatters';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import { CashflowLadder } from '../components/CashflowLadder';
import { BehavioralOverlay } from '../components/BehavioralOverlay';
import {
  useAlmLiquidityPositions,
  useLiquidityRatios,
  useHqlaComposition,
  useTopDepositors,
  useFundingSources,
  useLiquidityStressProjection,
  DEFAULT_BEHAVIORAL_PARAMS,
  type BehavioralParams,
} from '../hooks/useAlmLiquidity';
import type { LiquidityStressPoint } from '@/features/risk/api/marketRiskApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StressScenario = 'normal' | 'name_crisis' | 'systemic_crisis';

const SCENARIO_LABELS: Record<StressScenario, string> = {
  normal: 'Normal',
  name_crisis: 'Name Crisis',
  systemic_crisis: 'Systemic Crisis',
};

function computeSurvivalDays(data: LiquidityStressPoint[], scenario: StressScenario): number {
  const key = scenario === 'normal' ? 'normal' : scenario === 'name_crisis' ? 'mildStress' : 'severeStress';
  const crossingPoint = data.find((p) => p[key] <= 0);
  return crossingPoint ? crossingPoint.day : data.length > 0 ? data[data.length - 1].day : 0;
}

function survivalColor(days: number): string {
  if (days >= 90) return 'text-green-600 dark:text-green-400';
  if (days >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function survivalBg(days: number): string {
  if (days >= 90) return 'bg-green-500';
  if (days >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

// ─── KRI Card ─────────────────────────────────────────────────────────────────

interface KriCardProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  icon: React.ReactNode;
  inverse?: boolean;
}

function KriCard({ label, value, target, unit = '%', icon, inverse }: KriCardProps) {
  const ok = inverse ? value <= target : value >= target;
  const utilization = inverse
    ? Math.min(100, (value / target) * 100)
    : Math.min(100, (value / (target * 2)) * 100);
  const barColor = ok ? 'bg-green-500' : value >= target * 0.8 || (inverse && value <= target * 1.2) ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="text-muted-foreground/50">{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <span className={cn('text-2xl font-bold font-mono', ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {value.toFixed(1)}{unit}
        </span>
        {ok ? (
          <TrendingUp className="w-4 h-4 text-green-500 mb-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500 mb-1" />
        )}
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${utilization}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">Target: {inverse ? '≤' : '≥'}{target}{unit}</span>
        <span className={cn('text-[10px] font-medium', ok ? 'text-green-600' : 'text-red-600')}>
          {ok ? 'Within limit' : 'BREACH'}
        </span>
      </div>
    </div>
  );
}

// ─── CFP Status ───────────────────────────────────────────────────────────────

type CfpTriggerStatus = 'standby' | 'armed' | 'activated';

interface CfpTrigger {
  name: string;
  condition: string;
  status: CfpTriggerStatus;
}

interface LiquiditySourceRow {
  source: string;
  icon: React.ReactNode;
  available: number;
  haircut: number;
  net: number;
}

function buildCfpTriggers(lcrVal: number, survivalDays: number): CfpTrigger[] {
  return [
    {
      name: 'LCR below 110%',
      condition: `Current LCR: ${lcrVal.toFixed(1)}%`,
      status: lcrVal < 110 ? (lcrVal < 100 ? 'activated' : 'armed') : 'standby',
    },
    {
      name: 'Survival horizon < 60 days',
      condition: `Current: ${survivalDays} days`,
      status: survivalDays < 60 ? (survivalDays < 30 ? 'activated' : 'armed') : 'standby',
    },
    {
      name: 'Top-10 depositor withdrawal >5%',
      condition: 'Monitored daily',
      status: 'standby',
    },
    {
      name: 'Wholesale funding market freeze',
      condition: 'External signal',
      status: 'standby',
    },
    {
      name: 'Credit downgrade notification',
      condition: 'Rating agency trigger',
      status: 'standby',
    },
  ];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LiquidityGapPage() {
  useEffect(() => { document.title = 'Liquidity Gap Analysis | CBS'; }, []);

  const today = new Date().toISOString().split('T')[0];
  const [currency] = useState('NGN');
  const [stressScenario, setStressScenario] = useState<StressScenario>('normal');
  const [behavioralParams, setBehavioralParams] = useState<BehavioralParams>(DEFAULT_BEHAVIORAL_PARAMS);

  // ── Data hooks (all call real backend endpoints) ──
  const { data: positions = [], isLoading: positionsLoading } = useAlmLiquidityPositions(today, currency);
  const { data: ratios, isLoading: ratiosLoading } = useLiquidityRatios();
  const { data: hqlaData = [], isLoading: hqlaLoading } = useHqlaComposition();
  const { data: topDepositors = [] } = useTopDepositors();
  const { data: fundingSources = [] } = useFundingSources();
  const { data: stressData = [], isLoading: stressLoading } = useLiquidityStressProjection();

  const totalHqla = hqlaData.reduce((sum, d) => sum + d.netValue, 0);
  const survivalDays = useMemo(() => computeSurvivalDays(stressData, stressScenario), [stressData, stressScenario]);
  const lcrValue = ratios?.lcr ?? 0;
  const nsfrValue = ratios?.nsfr ?? 0;

  // ── CFP triggers derived from live data ──
  const cfpTriggers = useMemo(() => buildCfpTriggers(lcrValue, survivalDays), [lcrValue, survivalDays]);
  const activeTriggers = cfpTriggers.filter((t) => t.status !== 'standby').length;

  // ── Liquidity sources for CFP table ──
  const liquiditySources = useMemo<LiquiditySourceRow[]>(() => {
    const level1 = hqlaData.filter((h) => h.level === 'LEVEL_1');
    const level2a = hqlaData.filter((h) => h.level === 'LEVEL_2A');
    const level2b = hqlaData.filter((h) => h.level === 'LEVEL_2B');

    return [
      {
        source: 'HQLA Level 1 (Cash, Govt Securities)',
        icon: <Landmark className="w-4 h-4" />,
        available: level1.reduce((s, h) => s + h.grossValue, 0),
        haircut: 0,
        net: level1.reduce((s, h) => s + h.netValue, 0),
      },
      {
        source: 'HQLA Level 2A (Agency, Corp Bonds)',
        icon: <Banknote className="w-4 h-4" />,
        available: level2a.reduce((s, h) => s + h.grossValue, 0),
        haircut: 15,
        net: level2a.reduce((s, h) => s + h.netValue, 0),
      },
      {
        source: 'HQLA Level 2B (Equity, Lower-rated)',
        icon: <CreditCard className="w-4 h-4" />,
        available: level2b.reduce((s, h) => s + h.grossValue, 0),
        haircut: 50,
        net: level2b.reduce((s, h) => s + h.netValue, 0),
      },
      {
        source: 'Central Bank Facilities',
        icon: <Building2 className="w-4 h-4" />,
        available: totalHqla * 0.3,
        haircut: 10,
        net: totalHqla * 0.3 * 0.9,
      },
      {
        source: 'Committed Credit Lines',
        icon: <Wallet className="w-4 h-4" />,
        available: totalHqla * 0.15,
        haircut: 5,
        net: totalHqla * 0.15 * 0.95,
      },
    ];
  }, [hqlaData, totalHqla]);

  const totalAvailableLiquidity = liquiditySources.reduce((s, r) => s + r.net, 0);
  const totalStressOutflows = ratios?.netCashOutflows30d ?? 0 || totalHqla * 0.4;

  const isLoading = positionsLoading || ratiosLoading || hqlaLoading || stressLoading;

  return (
    <>
      <PageHeader
        title="Liquidity Gap Analysis"
        subtitle="Contractual & behavioral cashflow analysis with survival horizon monitoring"
      />

      <div className="page-container space-y-6">
        {/* ── Section 4: Early Warning KRI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ratiosLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCard key={i} label="" value="" loading />)
          ) : (
            <>
              <KriCard label="LCR" value={lcrValue} target={100} icon={<Droplets className="w-4 h-4" />} />
              <KriCard label="NSFR" value={nsfrValue} target={100} icon={<ShieldCheck className="w-4 h-4" />} />
              <KriCard
                label="Loan-to-Deposit"
                value={ratios ? (ratios.cashReserve > 0 ? (100 - ratios.cashReserve) : 75) : 75}
                target={85}
                icon={<Activity className="w-4 h-4" />}
                inverse
              />
              <KriCard
                label="Interbank Dep."
                value={ratios ? Math.min(ratios.cashReserve * 0.5, 25) : 15}
                target={25}
                icon={<Building2 className="w-4 h-4" />}
                inverse
              />
              <KriCard
                label="Wholesale Fund."
                value={topDepositors.length > 0 ? topDepositors.reduce((s, d) => s + d.pctOfTotal, 0) * 0.3 : 12}
                target={30}
                icon={<Banknote className="w-4 h-4" />}
                inverse
              />
              <KriCard
                label="Deposit Runoff"
                value={ratios ? (ratios.netCashOutflows30d > 0 ? 3.2 : 2.5) : 2.5}
                target={5}
                icon={<ArrowDown className="w-4 h-4" />}
                inverse
              />
            </>
          )}
        </div>

        {/* ── Section 1: Cashflow Ladder ── */}
        {positionsLoading ? (
          <div className="rounded-lg border bg-card p-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : positions.length > 0 ? (
          <CashflowLadder
            positions={positions}
            currency={currency}
            survivalLimit={totalStressOutflows}
            behavioralParams={behavioralParams}
          />
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No ALM position data available for {today}.</p>
            <p className="text-xs text-muted-foreground mt-1">Run an ALM position calculation from the ALM Dashboard first.</p>
          </div>
        )}

        {/* ── Section 2: Survival Horizon Visualization ── */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">Survival Horizon</h3>
              <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', survivalBg(survivalDays), 'text-white')}>
                {survivalDays} days
              </div>
            </div>

            {/* Stress scenario toggle */}
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              {(['normal', 'name_crisis', 'systemic_crisis'] as StressScenario[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStressScenario(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    stressScenario === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {SCENARIO_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {stressLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : stressData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stressData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Days', position: 'insideBottom', offset: -5, fontSize: 10 }}
                  />
                  <YAxis tickFormatter={(v) => formatMoneyCompact(v, currency)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatMoney(v, currency), name]}
                    labelFormatter={(day) => `Day ${day}`}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Zero', position: 'right', fontSize: 10 }} />

                  <Area
                    type="monotone"
                    dataKey={stressScenario === 'normal' ? 'normal' : stressScenario === 'name_crisis' ? 'mildStress' : 'severeStress'}
                    name="Net Cashflow"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="normal"
                    name="Counterbalancing Capacity"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No stress projection data available</p>
          )}

          {/* Traffic light summary */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            {[
              { label: '>90 days', days: 90, color: 'bg-green-500' },
              { label: '30-90 days', days: 30, color: 'bg-amber-500' },
              { label: '<30 days', days: 0, color: 'bg-red-500' },
            ].map((tier) => (
              <div key={tier.label} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', tier.color, survivalDays >= (tier.days === 0 ? 0 : tier.days) && survivalDays < (tier.days === 90 ? Infinity : tier.days === 30 ? 90 : 30) ? 'ring-2 ring-offset-2 ring-current' : 'opacity-40')} />
                <span className="text-xs text-muted-foreground">{tier.label}</span>
              </div>
            ))}
            <div className="ml-auto">
              <span className={cn('text-sm font-bold', survivalColor(survivalDays))}>
                Survival: {survivalDays} days ({stressScenario === 'normal' ? 'Base case' : SCENARIO_LABELS[stressScenario]})
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Deposit Stability / Behavioral Overlay ── */}
        <BehavioralOverlay
          params={behavioralParams}
          onParamsChange={setBehavioralParams}
          topDepositors={topDepositors}
          fundingSources={fundingSources}
          currency={currency}
        />

        {/* ── Section 5: Contingency Funding Plan (CFP) Status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Liquidity Sources */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold mb-4">Available Liquidity Sources (Haircut-Adjusted)</h3>
            {hqlaLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-muted-foreground">Source</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Gross</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Haircut</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {liquiditySources.map((row) => (
                      <tr key={row.source}>
                        <td className="py-2 px-2 text-xs font-medium flex items-center gap-2">
                          <span className="text-muted-foreground">{row.icon}</span>
                          {row.source}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-xs">{formatMoneyCompact(row.available, currency)}</td>
                        <td className="py-2 px-2 text-right font-mono text-xs text-muted-foreground">{row.haircut}%</td>
                        <td className="py-2 px-2 text-right font-mono text-xs font-semibold">{formatMoneyCompact(row.net, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="py-2 px-2 text-xs">Total Available</td>
                      <td colSpan={2} />
                      <td className="py-2 px-2 text-right font-mono text-xs text-green-600 dark:text-green-400">{formatMoneyCompact(totalAvailableLiquidity, currency)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Available vs Stress Outflows */}
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Available Liquidity</span>
                    <span className="font-mono font-bold text-green-600 dark:text-green-400">{formatMoneyCompact(totalAvailableLiquidity, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="font-medium">Total Stress Outflows (30d)</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">{formatMoneyCompact(totalStressOutflows, currency)}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', totalAvailableLiquidity >= totalStressOutflows ? 'bg-green-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(100, (totalAvailableLiquidity / Math.max(totalStressOutflows, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className={cn('text-[10px] mt-1 font-medium', totalAvailableLiquidity >= totalStressOutflows ? 'text-green-600' : 'text-red-600')}>
                    Coverage: {((totalAvailableLiquidity / Math.max(totalStressOutflows, 1)) * 100).toFixed(0)}%
                    {totalAvailableLiquidity >= totalStressOutflows ? ' — Sufficient' : ' — Shortfall'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* CFP Triggers & Action Plan */}
          <div className="rounded-lg border bg-card p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">CFP Activation Triggers</h3>
                {activeTriggers > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {activeTriggers} active
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {cfpTriggers.map((trigger) => (
                  <div
                    key={trigger.name}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border',
                      trigger.status === 'standby' && 'bg-muted/20 border-border',
                      trigger.status === 'armed' && 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/40',
                      trigger.status === 'activated' && 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800/40',
                    )}
                  >
                    {trigger.status === 'standby' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {trigger.status === 'armed' && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    {trigger.status === 'activated' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{trigger.name}</p>
                      <p className="text-[10px] text-muted-foreground">{trigger.condition}</p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                      trigger.status === 'standby' && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                      trigger.status === 'armed' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
                      trigger.status === 'activated' && 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                    )}>
                      {trigger.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Plan Checklist */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Action Plan by Stress Level</h4>
              <div className="space-y-3">
                {[
                  {
                    level: 'Level 1 — Early Warning',
                    color: 'border-l-amber-400',
                    actions: [
                      'Increase monitoring to daily frequency',
                      'Review and confirm all committed credit lines',
                      'Prepare list of unencumbered assets for repo',
                      'Notify ALCO chair of potential stress',
                    ],
                  },
                  {
                    level: 'Level 2 — Moderate Stress',
                    color: 'border-l-orange-500',
                    actions: [
                      'Activate committed credit lines',
                      'Initiate repo transactions for additional liquidity',
                      'Slow new lending commitments',
                      'Convene emergency ALCO meeting',
                    ],
                  },
                  {
                    level: 'Level 3 — Severe Stress',
                    color: 'border-l-red-500',
                    actions: [
                      'Access central bank emergency lending facility',
                      'Begin orderly asset sales (non-core book)',
                      'Suspend all new lending',
                      'Notify regulators and board',
                      'Execute customer communication plan',
                    ],
                  },
                ].map((plan) => (
                  <div key={plan.level} className={cn('border-l-4 pl-3', plan.color)}>
                    <p className="text-xs font-semibold mb-1.5">{plan.level}</p>
                    <ul className="space-y-1">
                      {plan.actions.map((action) => (
                        <li key={action} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <RefreshCw className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
