import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Sliders, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact, formatMoney } from '@/lib/formatters';
import type { TopDepositor, FundingSource } from '@/features/risk/api/marketRiskApi';
import type { BehavioralParams } from '../hooks/useAlmLiquidity';
import { DEFAULT_BEHAVIORAL_PARAMS } from '../hooks/useAlmLiquidity';

// ─── Deposit Rollover Assumptions ─────────────────────────────────────────────

interface RolloverRow {
  product: string;
  historicalRollover: number;
  assumedRollover: number;
}

const DEFAULT_ROLLOVER_ASSUMPTIONS: RolloverRow[] = [
  { product: 'Demand Savings', historicalRollover: 85, assumedRollover: 75 },
  { product: 'Fixed Deposit (30d)', historicalRollover: 72, assumedRollover: 65 },
  { product: 'Fixed Deposit (90d)', historicalRollover: 78, assumedRollover: 70 },
  { product: 'Fixed Deposit (180d)', historicalRollover: 82, assumedRollover: 75 },
  { product: 'Call Deposit', historicalRollover: 60, assumedRollover: 50 },
  { product: 'Current Account', historicalRollover: 90, assumedRollover: 80 },
  { product: 'Domiciliary', historicalRollover: 88, assumedRollover: 78 },
];

// ─── Behavioral Parameter Controls ───────────────────────────────────────────

interface BehavioralOverlayProps {
  params: BehavioralParams;
  onParamsChange: (params: BehavioralParams) => void;
  topDepositors: TopDepositor[];
  fundingSources: FundingSource[];
  currency: string;
}

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
}

function SliderRow({ label, description, value, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        <span className="text-sm font-bold font-mono text-primary">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

// ─── Herfindahl Index Calculator ──────────────────────────────────────────────

function calcHerfindahl(depositors: TopDepositor[]): number {
  if (depositors.length === 0) return 0;
  return depositors.reduce((sum, d) => sum + (d.pctOfTotal / 100) ** 2, 0) * 10000;
}

function herfindahlLabel(hhi: number): { label: string; color: string } {
  if (hhi < 1500) return { label: 'Low concentration', color: 'text-green-600 dark:text-green-400' };
  if (hhi < 2500) return { label: 'Moderate concentration', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'High concentration', color: 'text-red-600 dark:text-red-400' };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BehavioralOverlay({ params, onParamsChange, topDepositors, fundingSources, currency }: BehavioralOverlayProps) {
  const [showParams, setShowParams] = useState(false);
  const hhi = calcHerfindahl(topDepositors);
  const { label: hhiLabel, color: hhiColor } = herfindahlLabel(hhi);

  const topDepositorPct = topDepositors.reduce((sum, d) => sum + d.pctOfTotal, 0);

  return (
    <div className="space-y-6">
      {/* Behavioral Parameter Controls */}
      <div className="rounded-lg border bg-card">
        <button
          type="button"
          onClick={() => setShowParams(!showParams)}
          className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Behavioral Adjustment Parameters</h3>
          </div>
          <span className="text-xs text-muted-foreground">{showParams ? 'Hide' : 'Show'}</span>
        </button>

        {showParams && (
          <div className="px-5 pb-5 space-y-4 border-t pt-4">
            <SliderRow
              label="Deposit Stickiness"
              description="Portion of demand deposits treated as core (stable)"
              value={params.depositStickinessRate}
              onChange={(v) => onParamsChange({ ...params, depositStickinessRate: v })}
            />
            <SliderRow
              label="Loan Prepayment Rate"
              description="Expected early loan repayment rate"
              value={params.loanPrepaymentRate}
              onChange={(v) => onParamsChange({ ...params, loanPrepaymentRate: v })}
            />
            <SliderRow
              label="Pipeline Drawdown"
              description="Committed but undrawn facilities expected to be drawn"
              value={params.pipelineDrawdownRate}
              onChange={(v) => onParamsChange({ ...params, pipelineDrawdownRate: v })}
            />
            <SliderRow
              label="Term Deposit Rollover"
              description="Proportion of maturing term deposits expected to renew"
              value={params.rolloverRate}
              onChange={(v) => onParamsChange({ ...params, rolloverRate: v })}
            />
            <button
              type="button"
              onClick={() => onParamsChange(DEFAULT_BEHAVIORAL_PARAMS)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Reset to defaults
            </button>
          </div>
        )}
      </div>

      {/* Deposit Stability — Top Depositor Concentration */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Top 20 Depositor Concentration</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">HHI:</span>
            <span className={cn('text-sm font-bold font-mono', hhiColor)}>{hhi.toFixed(0)}</span>
            <span className={cn('text-xs', hhiColor)}>({hhiLabel})</span>
          </div>
        </div>

        {topDepositors.length > 0 ? (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDepositors} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip
                    formatter={(v: number, _name: string, props: { payload: TopDepositor }) => [
                      `${v.toFixed(2)}% (${formatMoney(props.payload.amount, currency)})`,
                      'Share of Total',
                    ]}
                  />
                  <Bar dataKey="pctOfTotal" name="% of Total Deposits" barSize={14}>
                    {topDepositors.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? '#ef4444' : i < 10 ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Top 20 depositors represent <span className="font-semibold text-foreground">{topDepositorPct.toFixed(1)}%</span> of total deposits.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No depositor data available</p>
        )}
      </div>

      {/* Funding Source Mix */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Funding Source Composition</h3>
        {fundingSources.length > 0 ? (
          <div className="space-y-2">
            {fundingSources.map((source) => (
              <div key={source.source} className="flex items-center gap-3">
                <div className="w-32 text-xs font-medium truncate">{source.source}</div>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all"
                    style={{ width: `${Math.min(source.pctOfTotal, 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                    {source.pctOfTotal.toFixed(1)}%
                  </span>
                </div>
                <div className="w-28 text-right text-xs font-mono text-muted-foreground">
                  {formatMoneyCompact(source.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No funding source data available</p>
        )}
      </div>

      {/* Deposit Rollover Assumptions */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Deposit Rollover Assumptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Product</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Historical %</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Assumed %</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Sensitivity -10%</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Sensitivity +10%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DEFAULT_ROLLOVER_ASSUMPTIONS.map((row) => (
                <tr key={row.product}>
                  <td className="py-2.5 px-3 text-xs font-medium">{row.product}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{row.historicalRollover}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold">{row.assumedRollover}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-red-500">{Math.max(0, row.assumedRollover - 10)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-green-500">{Math.min(100, row.assumedRollover + 10)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
