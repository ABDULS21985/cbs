import { useState, useMemo } from 'react';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { SensitivitySlider } from './SensitivitySlider';
import type { MacroScenario } from '../../types/ecl';

interface Props {
  scenarios: MacroScenario[];
}

interface LocalWeights {
  Base: number;
  Optimistic: number;
  Pessimistic: number;
}

const SCENARIO_STYLES: Record<string, { badge: string; card: string }> = {
  Base: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    card: 'border-blue-200 dark:border-blue-800',
  },
  Optimistic: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    card: 'border-green-200 dark:border-green-800',
  },
  Pessimistic: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    card: 'border-red-200 dark:border-red-800',
  },
};

export function MacroScenarioPanel({ scenarios }: Props) {
  const [weights, setWeights] = useState<LocalWeights>(() => {
    const initial: LocalWeights = { Base: 0, Optimistic: 0, Pessimistic: 0 };
    scenarios.forEach((s) => {
      if (s.name in initial) {
        initial[s.name] = s.weight;
      }
    });
    return initial;
  });

  const total = weights.Base + weights.Optimistic + weights.Pessimistic;
  const isValid = total === 100;

  const weightedEcl = useMemo(() => {
    return scenarios.reduce((sum, s) => {
      const w = weights[s.name] ?? 0;
      return sum + (s.ecl * w) / 100;
    }, 0);
  }, [scenarios, weights]);

  function handleWeightChange(name: keyof LocalWeights, value: number) {
    setWeights((prev) => ({ ...prev, [name]: value }));
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No macro scenario data available.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {scenarios.map((scenario) => {
          const style = SCENARIO_STYLES[scenario.name] ?? {
            badge: 'bg-muted text-muted-foreground',
            card: '',
          };
          return (
            <div
              key={scenario.name}
              className={`rounded-lg border p-4 ${style.card}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{scenario.name}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}
                >
                  {weights[scenario.name as keyof LocalWeights] ?? scenario.weight}%
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                <div className="flex justify-between">
                  <span>GDP Growth</span>
                  <span className="font-medium text-foreground">
                    {formatPercent(scenario.gdpGrowth, 1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Inflation</span>
                  <span className="font-medium text-foreground">
                    {formatPercent(scenario.inflation, 1)}
                  </span>
                </div>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">ECL</p>
                <p className="text-sm font-bold tabular-nums">{formatMoneyCompact(scenario.ecl)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weight Sliders */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario Weights
          </p>
          {!isValid && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              Weights must sum to 100% (currently {total}%)
            </span>
          )}
          {isValid && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Weights sum to 100%
            </span>
          )}
        </div>
        <div className="space-y-3">
          {(['Base', 'Optimistic', 'Pessimistic'] as const).map((name) => (
            <SensitivitySlider
              key={name}
              label={name}
              value={weights[name]}
              onChange={(v) => handleWeightChange(name, v)}
            />
          ))}
        </div>
      </div>

      {/* Weighted ECL Result */}
      <div
        className={`rounded-lg border p-4 ${
          isValid
            ? 'border-primary/30 bg-primary/5'
            : 'border-muted bg-muted/20'
        }`}
      >
        <p className="text-xs text-muted-foreground mb-1">
          Weighted ECL (Scenario-Adjusted)
        </p>
        <p className="text-2xl font-bold tabular-nums">
          {isValid ? formatMoneyCompact(weightedEcl) : '—'}
        </p>
        {!isValid && (
          <p className="text-xs text-muted-foreground mt-1">
            Adjust weights to sum to 100% to see weighted ECL.
          </p>
        )}
      </div>
    </div>
  );
}
