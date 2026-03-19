import { cn } from '@/lib/utils';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CapitalAdequacyData } from '../../api/financialReportApi';

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
  label: string;
  valueLabel?: string;
  showPercent?: boolean;
}

function ProgressBar({ value, max, color, label, valueLabel, showPercent }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono font-semibold text-muted-foreground">
          {valueLabel ?? formatMoneyCompact(value)}
          {showPercent && <span className="ml-1 text-xs">({formatPercent(pct, 1)})</span>}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Capital Tile ─────────────────────────────────────────────────────────────

interface CapitalTileProps {
  label: string;
  value: number;
  sublabel: string;
  color: string;
  icon: React.ElementType;
}

function CapitalTile({ label, value, sublabel, color, icon: Icon }: CapitalTileProps) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-2', color)}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono">{formatMoneyCompact(value)}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

// ─── Formula Display ──────────────────────────────────────────────────────────

interface FormulaProps {
  numerator: string;
  denominator: string;
  result: string;
}

function FormulaDisplay({ numerator, denominator, result }: FormulaProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex flex-col items-center">
        <span className="font-semibold border-b border-foreground pb-0.5 px-2">{numerator}</span>
        <span className="pt-0.5 px-2">{denominator}</span>
      </div>
      <span className="text-muted-foreground font-mono">=</span>
      <span className="text-2xl font-black font-mono text-primary">{result}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CapitalAdequacyReportProps {
  data: CapitalAdequacyData;
}

export function CapitalAdequacyReport({ data }: CapitalAdequacyReportProps) {
  const isAboveMinimum = data.car >= data.minimumCar;
  const carProgress = Math.min((data.car / 25) * 100, 100); // 25% as 100% for visual scale
  const minimumLine = (data.minimumCar / 25) * 100;

  const tier1Pct = (data.tier1Capital / data.totalCapital) * 100;
  const tier2Pct = (data.tier2Capital / data.totalCapital) * 100;

  const totalRwa = data.creditRiskRwa + data.marketRiskRwa + data.operationalRiskRwa;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Report header */}
      <div className="px-6 py-5 border-b border-border text-center bg-muted/20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          First Consolidated Bank Plc
        </p>
        <h2 className="text-lg font-bold tracking-tight">Capital Adequacy Report</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Basel III Framework — CBN Minimum Requirement: <span className="font-semibold">{data.minimumCar}%</span>
        </p>
      </div>

      <div className="p-6 space-y-8">

        {/* CAR Gauge + Status */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* CAR Visual */}
          <div className="flex-1 bg-muted/30 rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Capital Adequacy Ratio (CAR)
                </p>
                <FormulaDisplay
                  numerator="Total Regulatory Capital"
                  denominator="Risk-Weighted Assets (RWA)"
                  result={formatPercent(data.car)}
                />
              </div>
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
                isAboveMinimum
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              )}>
                {isAboveMinimum ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {isAboveMinimum ? 'Compliant' : 'Below Minimum'}
              </div>
            </div>

            {/* Progress bar with minimum marker */}
            <div className="relative mt-4">
              <div className="h-5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2',
                    isAboveMinimum ? 'bg-green-500' : 'bg-red-500')}
                  style={{ width: `${carProgress}%` }}
                >
                  <span className="text-white text-[10px] font-bold">{formatPercent(data.car, 1)}</span>
                </div>
              </div>
              {/* Minimum line marker */}
              <div
                className="absolute top-0 h-5 w-0.5 bg-red-600 dark:bg-red-400"
                style={{ left: `${minimumLine}%` }}
              >
                <div className="absolute -top-5 -translate-x-1/2 text-[10px] text-red-600 dark:text-red-400 font-semibold whitespace-nowrap">
                  Min {data.minimumCar}%
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>25%+</span>
            </div>

            {/* Capital buffer */}
            <div className={cn(
              'mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
              isAboveMinimum
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40',
            )}>
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Capital buffer:{' '}
              <span className="font-bold font-mono">{formatMoneyCompact(Math.abs(data.capitalBuffer))}</span>
              {isAboveMinimum ? ' above minimum requirement' : ' shortfall from minimum requirement'}
            </div>
          </div>
        </div>

        {/* Capital Tier Breakdown */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Regulatory Capital Composition
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <CapitalTile
              label="Tier 1 Capital (CET1)"
              value={data.tier1Capital}
              sublabel="Ordinary share capital, retained earnings, statutory reserves"
              color="bg-blue-50/60 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300"
              icon={ShieldCheck}
            />
            <CapitalTile
              label="Tier 2 Capital"
              value={data.tier2Capital}
              sublabel="Subordinated debt instruments, general loan loss reserves"
              color="bg-purple-50/60 dark:bg-purple-900/15 border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300"
              icon={TrendingUp}
            />
            <CapitalTile
              label="Total Regulatory Capital"
              value={data.totalCapital}
              sublabel={`Tier 1: ${formatPercent(tier1Pct, 1)} | Tier 2: ${formatPercent(tier2Pct, 1)}`}
              color="bg-green-50/60 dark:bg-green-900/15 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300"
              icon={CheckCircle}
            />
          </div>

          {/* Tier composition bar */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Capital Tier Mix</p>
            <div className="h-4 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 h-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ width: `${tier1Pct}%` }}
              >
                T1 {formatPercent(tier1Pct, 0)}
              </div>
              <div
                className="bg-purple-400 h-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ width: `${tier2Pct}%` }}
              >
                T2 {formatPercent(tier2Pct, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* RWA Breakdown */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Risk-Weighted Assets (RWA) Breakdown
          </h3>
          <div className="bg-muted/30 rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold">Total RWA</span>
              <span className="text-xl font-black font-mono">{formatMoneyCompact(data.rwa)}</span>
            </div>
            <div className="space-y-4">
              <ProgressBar
                label="Credit Risk RWA"
                value={data.creditRiskRwa}
                max={totalRwa}
                color="bg-orange-500"
                valueLabel={formatMoneyCompact(data.creditRiskRwa)}
                showPercent
              />
              <ProgressBar
                label="Market Risk RWA"
                value={data.marketRiskRwa}
                max={totalRwa}
                color="bg-yellow-500"
                valueLabel={formatMoneyCompact(data.marketRiskRwa)}
                showPercent
              />
              <ProgressBar
                label="Operational Risk RWA"
                value={data.operationalRiskRwa}
                max={totalRwa}
                color="bg-red-400"
                valueLabel={formatMoneyCompact(data.operationalRiskRwa)}
                showPercent
              />
            </div>

            {/* RWA by category summary table */}
            <table className="w-full mt-5 text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Category</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">RWA</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">% of Total</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">CAR Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { label: 'Credit Risk', rwa: data.creditRiskRwa, color: 'text-orange-600 dark:text-orange-400' },
                  { label: 'Market Risk', rwa: data.marketRiskRwa, color: 'text-yellow-600 dark:text-yellow-400' },
                  { label: 'Operational Risk', rwa: data.operationalRiskRwa, color: 'text-red-600 dark:text-red-400' },
                ].map(({ label, rwa, color }) => {
                  const pct = (rwa / totalRwa) * 100;
                  const carContrib = (data.totalCapital / rwa) * 100;
                  return (
                    <tr key={label} className="hover:bg-muted/30 transition-colors">
                      <td className={cn('py-2.5 font-medium', color)}>{label}</td>
                      <td className="py-2.5 text-right font-mono">{formatMoney(rwa, 'NGN')}</td>
                      <td className="py-2.5 text-right font-mono">{formatPercent(pct, 1)}</td>
                      <td className="py-2.5 text-right font-mono font-semibold">{formatPercent(carContrib, 1)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-bold">
                  <td className="py-2.5">Total</td>
                  <td className="py-2.5 text-right font-mono">{formatMoney(totalRwa, 'NGN')}</td>
                  <td className="py-2.5 text-right font-mono">100.0%</td>
                  <td className="py-2.5 text-right font-mono text-primary">{formatPercent(data.car, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CBN Thresholds Reference */}
        <div className="bg-blue-50/40 dark:bg-blue-900/10 rounded-xl border border-blue-200/60 dark:border-blue-800/30 p-5">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-3">
            CBN Regulatory Capital Thresholds
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Minimum CAR', value: '10.0%', status: 'info' },
              { label: 'Capital Conservation Buffer', value: '2.5%', status: 'info' },
              { label: 'Countercyclical Buffer', value: '0–2.5%', status: 'info' },
              { label: 'Combined Buffer Requirement', value: '12.5%+', status: 'warn' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="font-bold font-mono text-blue-700 dark:text-blue-400">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Computed under Basel III as adopted by the CBN. Tier 1 must be ≥ 6% of RWA (CET1 ≥ 4.5%).
          This report is for internal management review and CBN regulatory returns.
        </p>
      </div>
    </div>
  );
}
