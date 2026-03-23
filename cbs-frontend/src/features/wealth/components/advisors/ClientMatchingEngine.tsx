import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useMatchClient } from '../../hooks/useWealth';
import type { Advisor, ClientMatchResult } from '../../api/wealthApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientMatchingEngineProps {
  advisors: Advisor[];
}

const RISK_TOLERANCES = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE', 'BALANCED'] as const;

const GOAL_OPTIONS = ['Retirement', 'Education', 'Estate', 'Growth', 'Income'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientMatchingEngine({ advisors: _advisors }: ClientMatchingEngineProps) {
  const [aum, setAum] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [results, setResults] = useState<ClientMatchResult[]>([]);

  const matchMutation = useMatchClient();

  function toggleGoal(goal: string) {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aum || !riskTolerance || selectedGoals.length === 0) return;

    const data = await matchMutation.mutateAsync({
      aum: parseFloat(aum),
      riskTolerance,
      goals: selectedGoals,
    });
    setResults(data.slice(0, 3));
  }

  function handleReset() {
    setAum('');
    setRiskTolerance('');
    setSelectedGoals([]);
    setResults([]);
  }

  return (
    <div className="surface-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">Client-Advisor Matching Engine</h3>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* AUM */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
            Client AUM *
          </label>
          <input
            type="number"
            required
            min={0}
            value={aum}
            onChange={(e) => setAum(e.target.value)}
            placeholder="e.g. 500000000"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Risk Tolerance */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
            Risk Tolerance *
          </label>
          <select
            required
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select risk tolerance...</option>
            {RISK_TOLERANCES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
        </div>

        {/* Goals multi-select */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
            Investment Goals * (select one or more)
          </label>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = selectedGoals.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-border',
                  )}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                  {goal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={matchMutation.isPending || !aum || !riskTolerance || selectedGoals.length === 0}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors',
              matchMutation.isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90',
            )}
          >
            {matchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Find Best Match
          </button>
          {(results.length > 0 || aum || riskTolerance || selectedGoals.length > 0) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      {matchMutation.isError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-700 dark:text-red-400">
            Failed to find matches. Please try again.
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Top Matches
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((result, index) => (
              <div
                key={result.advisorId}
                className={cn(
                  'surface-card p-4 space-y-3',
                  index === 0 && 'ring-2 ring-primary/30',
                )}
              >
                {/* Rank badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
                      index === 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    #{index + 1}
                  </span>
                  <span className="text-lg font-bold font-mono text-primary">
                    {result.matchScore}%
                  </span>
                </div>

                {/* Advisor name */}
                <p className="font-semibold text-sm">{result.advisorName}</p>

                {/* Match score bar */}
                <div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        result.matchScore >= 80
                          ? 'bg-green-500'
                          : result.matchScore >= 60
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                      )}
                      style={{ width: `${result.matchScore}%` }}
                    />
                  </div>
                </div>

                {/* Reasons */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Match Reasons</p>
                  <ul className="space-y-1">
                    {result.reasons.map((reason, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
