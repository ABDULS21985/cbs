import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { formatMoney } from '@/lib/formatters';
import { type TraderPosition } from '../../api/tradingApi';

interface ScenarioSummary {
  key: string;
  name: string;
  description: string;
  positionsAffected: number;
  pnlImpact: number;
  capitalImpact: number;
  limitBreach: boolean;
}

interface StressTestScenariosProps {
  positions: TraderPosition[];
}

function isFxPosition(position: TraderPosition) {
  return position.instrument.includes('/') || position.currency.toUpperCase() !== 'NGN';
}

function isRatesPosition(position: TraderPosition) {
  const instrument = position.instrument.toUpperCase();
  return instrument.includes('BOND') || instrument.includes('TBILL') || instrument.includes('NOTE');
}

function isEquityPosition(position: TraderPosition) {
  const instrument = position.instrument.toUpperCase();
  return instrument.includes('EQUITY') || instrument.includes('STOCK') || instrument.includes('SHARE');
}

function summarizeScenario(
  key: string,
  name: string,
  description: string,
  positions: TraderPosition[],
  impactForPosition: (position: TraderPosition) => number,
): ScenarioSummary {
  const impacted = positions
    .map((position) => ({ position, impact: impactForPosition(position) }))
    .filter((item) => item.impact !== 0);
  const pnlImpact = impacted.reduce((sum, item) => sum + item.impact, 0);
  const capitalImpact = Math.abs(pnlImpact) * 0.15;
  const limitBreach = impacted.some(
    ({ position, impact }) => Math.abs(position.netExposure) + Math.abs(impact) > position.positionLimit,
  );

  return {
    key,
    name,
    description,
    positionsAffected: impacted.length,
    pnlImpact,
    capitalImpact,
    limitBreach,
  };
}

export function StressTestScenarios({ positions }: StressTestScenariosProps) {
  const [fxShockPct, setFxShockPct] = useState(20);
  const [rateShockBps, setRateShockBps] = useState(200);
  const [equityShockPct, setEquityShockPct] = useState(-25);

  const scenarios = useMemo(
    () => [
      summarizeScenario(
        'fx',
        'NGN Devalues 20%',
        'FX and foreign-currency positions reprice against NGN.',
        positions,
        (position) => (isFxPosition(position) ? position.netExposure * 0.2 : 0),
      ),
      summarizeScenario(
        'rates',
        'Interest Rates +200bps',
        'Duration-driven bond MTM shock on fixed-income positions.',
        positions,
        (position) => (isRatesPosition(position) ? -Math.abs(position.netExposure) * 0.06 : 0),
      ),
      summarizeScenario(
        'equity',
        'Equity Market -25%',
        'Equity holdings reprice lower on a sharp market correction.',
        positions,
        (position) => (isEquityPosition(position) ? position.netExposure * -0.25 : 0),
      ),
      summarizeScenario(
        'oil',
        'Oil Price -30%',
        'Sovereign spread widening and higher credit premium on rate books.',
        positions,
        (position) => (isRatesPosition(position) ? -Math.abs(position.netExposure) * 0.08 : 0),
      ),
    ],
    [positions],
  );

  const customScenario = useMemo(
    () =>
      summarizeScenario(
        'custom',
        'Custom Scenario',
        'User-defined combined FX, rates, and equity shocks.',
        positions,
        (position) => {
          let impact = 0;
          if (isFxPosition(position)) impact += position.netExposure * (fxShockPct / 100);
          if (isRatesPosition(position)) impact += -Math.abs(position.netExposure) * (rateShockBps / 10_000) * 3;
          if (isEquityPosition(position)) impact += position.netExposure * (equityShockPct / 100);
          return impact;
        },
      ),
    [equityShockPct, fxShockPct, positions, rateShockBps],
  );

  return (
    <div className="rounded-xl border bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold">Stress Test Scenarios</h3>
        <p className="text-xs text-muted-foreground">
          Formula-driven shocks applied to live treasury positions.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {scenarios.map((scenario) => (
          <div key={scenario.key} className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{scenario.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{scenario.description}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  scenario.limitBreach
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {scenario.limitBreach ? 'Limit Breach' : 'Within Limit'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Affected</p>
                <p className="mt-1 text-lg font-semibold">{scenario.positionsAffected}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">P&L Impact</p>
                <p className={`mt-1 text-lg font-semibold font-mono ${scenario.pnlImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(scenario.pnlImpact)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Capital Impact</p>
                <p className="mt-1 text-lg font-semibold font-mono">{formatMoney(scenario.capitalImpact)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Custom Scenario</h4>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>FX Shock: {fxShockPct}%</span>
            <input
              type="range"
              min="-30"
              max="30"
              value={fxShockPct}
              onChange={(event) => setFxShockPct(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Rate Shock: {rateShockBps}bps</span>
            <input
              type="range"
              min="-300"
              max="300"
              value={rateShockBps}
              onChange={(event) => setRateShockBps(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Equity Shock: {equityShockPct}%</span>
            <input
              type="range"
              min="-40"
              max="40"
              value={equityShockPct}
              onChange={(event) => setEquityShockPct(Number(event.target.value))}
              className="w-full"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-background px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Positions</p>
            <p className="mt-1 text-lg font-semibold">{customScenario.positionsAffected}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">P&L Impact</p>
            <p className={`mt-1 text-lg font-semibold font-mono ${customScenario.pnlImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(customScenario.pnlImpact)}
            </p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Capital Impact</p>
            <p className="mt-1 text-lg font-semibold font-mono">{formatMoney(customScenario.capitalImpact)}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Limit Result</p>
            <p className={`mt-1 text-lg font-semibold ${customScenario.limitBreach ? 'text-red-600' : 'text-green-600'}`}>
              {customScenario.limitBreach ? 'Breach' : 'Clear'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
