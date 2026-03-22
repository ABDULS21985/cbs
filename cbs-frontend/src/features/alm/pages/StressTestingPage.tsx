import { useState, useEffect, useRef } from 'react';
import { Shield, Play, Pause, RotateCcw, Plus, Loader2, GitCompare, History, Zap, ChevronRight, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';
import {
  useAlmScenarios,
  useRegulatoryScenarios,
  useRunScenario,
  useHistoricalReplay,
  useCompareScenarios,
  useStressTestRuns,
} from '../hooks/useAlm';
import type { AlmScenario, StressTestResult, HistoricalReplayResult, ScenarioComparison, StressTestRunSummary } from '../api/almApi';
import { ScenarioBuilder } from '../components/ScenarioBuilder';
import { StressResultsPanel, HistoricalReplayChart, ScenarioRadarChart } from '../components/StressResultsPanel';

type View = 'library' | 'builder' | 'results' | 'historical' | 'comparison';

const HISTORICAL_CRISES = [
  { key: 'GFC_2008', label: 'GFC 2008', desc: 'Global Financial Crisis — extreme rate cuts and liquidity freeze', color: 'text-red-600' },
  { key: 'COVID_2020', label: 'COVID 2020', desc: 'Pandemic shock — emergency rate cuts and market dislocation', color: 'text-purple-600' },
  { key: 'SVB_2023', label: 'SVB 2023', desc: 'Silicon Valley Bank — rapid rate hikes and duration mismatch', color: 'text-amber-600' },
  { key: 'NIGERIA_2016', label: 'Nigeria 2016', desc: 'Recession — currency devaluation and high rates', color: 'text-blue-600' },
];

const CATEGORY_COLORS: Record<string, string> = {
  PARALLEL_UP: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PARALLEL_DOWN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  STEEPENING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  FLATTENING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CUSTOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function StressTestingPage() {
  useEffect(() => { document.title = 'Stress Testing | CBS ALM'; }, []);

  const [view, setView] = useState<View>('library');
  const [selectedScenario, setSelectedScenario] = useState<AlmScenario | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Historical replay animation
  const [selectedCrisis, setSelectedCrisis] = useState<string | null>(null);
  const [replayMonth, setReplayMonth] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Queries
  const { data: scenarios = [], isLoading: scenariosLoading } = useAlmScenarios();
  const { data: regulatory = [] } = useRegulatoryScenarios();

  // Mutations
  const runScenario = useRunScenario();
  const historicalReplay = useHistoricalReplay();
  const compareScenarios = useCompareScenarios();
  const { data: stressRuns = [] } = useStressTestRuns();

  // Results
  const [stressResult, setStressResult] = useState<StressTestResult | null>(null);
  const [replayResult, setReplayResult] = useState<HistoricalReplayResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparison | null>(null);

  // Filter scenarios
  const allScenarios = [...scenarios];
  const filtered = allScenarios.filter(s => {
    if (filterCategory && s.scenarioType !== filterCategory) return false;
    if (filterSearch && !s.scenarioName.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const regulatoryIds = new Set(regulatory.map(r => r.id));

  // Run scenario handler
  const handleRunScenario = (scenario: AlmScenario) => {
    setSelectedScenario(scenario);
    runScenario.mutate(scenario.id, {
      onSuccess: (result) => { setStressResult(result); setView('results'); },
    });
  };

  // Historical replay
  const handleStartReplay = (crisisName: string) => {
    setSelectedCrisis(crisisName);
    setReplayMonth(0);
    setIsPlaying(false);
    historicalReplay.mutate(crisisName, {
      onSuccess: (result) => { setReplayResult(result); setView('historical'); },
    });
  };

  // Animation controls
  useEffect(() => {
    if (isPlaying && replayResult) {
      intervalRef.current = setInterval(() => {
        setReplayMonth(prev => {
          if (prev >= replayResult.path.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, replayResult]);

  // Compare toggle
  const toggleCompare = (id: number) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const handleCompare = () => {
    if (compareIds.length < 2) return;
    compareScenarios.mutate(compareIds, {
      onSuccess: (result) => { setComparisonResult(result); setView('comparison'); },
    });
  };

  return (
    <>
      <PageHeader
        title="Stress Testing & Scenario Engine"
        subtitle="Run stress scenarios, historical backtests, and multi-scenario comparisons"
        backTo="/alm"
        actions={
          <div className="flex items-center gap-2">
            {compareIds.length >= 2 && view === 'library' && (
              <button onClick={handleCompare} disabled={compareScenarios.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                {compareScenarios.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
                Compare ({compareIds.length})
              </button>
            )}
            <button onClick={() => setView(view === 'builder' ? 'library' : 'builder')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {view === 'builder' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {view === 'builder' ? 'Close Builder' : 'Create Scenario'}
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* ── Scenario Builder ──────────────────────────────────────────── */}
        {view === 'builder' && (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-base font-semibold mb-4">Custom Scenario Builder</h2>
            <ScenarioBuilder onCreated={() => setView('library')} />
          </div>
        )}

        {/* ── Stress Results ────────────────────────────────────────────── */}
        {view === 'results' && stressResult && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">{stressResult.scenarioName}</h2>
                <p className="text-xs text-muted-foreground">Avg shock: {stressResult.avgShockBps}bps · Run at: {new Date(stressResult.runAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setView('library')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Library
              </button>
            </div>
            <StressResultsPanel result={stressResult} />
          </div>
        )}

        {/* ── Historical Replay ─────────────────────────────────────────── */}
        {view === 'historical' && replayResult && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">{HISTORICAL_CRISES.find(c => c.key === selectedCrisis)?.label} — Historical Replay</h2>
                <p className="text-xs text-muted-foreground">{replayResult.totalMonths} months · {HISTORICAL_CRISES.find(c => c.key === selectedCrisis)?.desc}</p>
              </div>
              <button onClick={() => setView('library')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Library
              </button>
            </div>

            {/* Animation controls */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50 border">
              <button onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => { setReplayMonth(0); setIsPlaying(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <input type="range" min={0} max={replayResult.path.length - 1} value={replayMonth}
                onChange={e => { setReplayMonth(Number(e.target.value)); setIsPlaying(false); }}
                className="flex-1" />
              <span className="text-xs font-mono font-semibold w-16 text-right">Month {replayMonth}</span>
            </div>

            <div className="bg-card rounded-lg border p-6">
              <HistoricalReplayChart data={replayResult} currentMonth={replayMonth} />
            </div>
          </div>
        )}

        {/* ── Multi-Scenario Comparison ─────────────────────────────────── */}
        {view === 'comparison' && comparisonResult && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Scenario Comparison ({comparisonResult.scenarios.length} scenarios)</h2>
              <button onClick={() => { setView('library'); setCompareIds([]); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Library
              </button>
            </div>

            {/* Side-by-side cards */}
            <div className={cn('grid gap-4 mb-6', `grid-cols-${Math.min(comparisonResult.scenarios.length, 4)}`)}>
              {comparisonResult.scenarios.map(s => (
                <div key={s.scenarioId} className="bg-card rounded-lg border p-4 space-y-3">
                  <h3 className="text-sm font-semibold">{s.scenarioName}</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">NII Impact</span><span className={cn('font-mono font-semibold', s.niiImpact >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(s.niiImpact)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">EVE Impact</span><span className={cn('font-mono font-semibold', s.eveImpact >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(s.eveImpact)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CET1 After</span><span className="font-mono font-semibold">{Number(s.capitalAdequacy.cet1After).toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Breaches</span><span className={cn('font-semibold', s.limitBreaches.length > 0 ? 'text-red-600' : 'text-green-600')}>{s.limitBreaches.length}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar chart */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-sm font-semibold mb-4">Risk Dimension Comparison</h3>
              <ScenarioRadarChart comparison={comparisonResult} />
            </div>

            {/* Comparison table */}
            <div className="bg-card rounded-lg border overflow-x-auto mt-6">
              <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Detailed Comparison (for ALCO Reporting)</h3></div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Metric</th>
                    {comparisonResult.scenarios.map(s => (
                      <th key={s.scenarioId} className="text-right px-4 py-3 font-medium text-muted-foreground">{s.scenarioName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: 'Avg Shock (bps)', fn: (s: StressTestResult) => `${s.avgShockBps}` },
                    { label: 'NII Impact', fn: (s: StressTestResult) => formatMoney(s.niiImpact) },
                    { label: 'EVE Impact', fn: (s: StressTestResult) => formatMoney(s.eveImpact) },
                    { label: 'CET1 Before', fn: (s: StressTestResult) => `${Number(s.capitalAdequacy.cet1Before).toFixed(2)}%` },
                    { label: 'CET1 After', fn: (s: StressTestResult) => `${Number(s.capitalAdequacy.cet1After).toFixed(2)}%` },
                    { label: 'Capital Impact', fn: (s: StressTestResult) => `${Number(s.capitalAdequacy.capitalImpactPct).toFixed(2)}%` },
                    { label: 'Limit Breaches', fn: (s: StressTestResult) => `${s.limitBreaches.length}` },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-muted/40">
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      {comparisonResult.scenarios.map(s => (
                        <td key={s.scenarioId} className="px-4 py-2 text-right font-mono text-xs">{row.fn(s)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Scenario Library (default view) ──────────────────────────── */}
        {(view === 'library') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Scenario list */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3">
                <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search scenarios..." className="flex-1 px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">All Types</option>
                  <option value="PARALLEL_UP">Parallel Up</option>
                  <option value="PARALLEL_DOWN">Parallel Down</option>
                  <option value="STEEPENING">Steepening</option>
                  <option value="FLATTENING">Flattening</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              {/* Scenario cards */}
              {scenariosLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">No scenarios found.</div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(scenario => {
                    const isReg = regulatoryIds.has(scenario.id);
                    const isSelected = compareIds.includes(scenario.id);
                    return (
                      <div key={scenario.id}
                        className={cn('rounded-lg border bg-card p-4 transition-all', isSelected && 'ring-2 ring-purple-500 border-purple-300')}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Compare checkbox */}
                            <input type="checkbox" checked={isSelected} onChange={() => toggleCompare(scenario.id)}
                              className="mt-1 rounded" title="Select for comparison" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {isReg && <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                                <h3 className="font-semibold text-sm truncate">{scenario.scenarioName}</h3>
                                {isReg && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">{scenario.description || 'No description'}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[scenario.scenarioType] || CATEGORY_COLORS.CUSTOM)}>
                                  {scenario.scenarioType}
                                </span>
                                <span className="font-mono">{Object.keys(scenario.shiftBps).length > 0 ? `avg ${Math.round(Object.values(scenario.shiftBps).reduce((s, v) => s + v, 0) / Object.values(scenario.shiftBps).length)}bps` : '0bps'}</span>
                                <StatusBadge status={scenario.isActive ? 'ACTIVE' : 'INACTIVE'} />
                              </div>
                            </div>
                          </div>

                          <button onClick={() => handleRunScenario(scenario)}
                            disabled={runScenario.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0">
                            {runScenario.isPending && selectedScenario?.id === scenario.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                            Run
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Historical scenarios */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Historical Scenario Replay</h2>
              {HISTORICAL_CRISES.map(crisis => (
                <button key={crisis.key} onClick={() => handleStartReplay(crisis.key)}
                  disabled={historicalReplay.isPending}
                  className="w-full text-left rounded-lg border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all disabled:opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <History className={cn('w-4 h-4', crisis.color)} />
                    <h3 className="text-sm font-semibold">{crisis.label}</h3>
                    {historicalReplay.isPending && selectedCrisis === crisis.key && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{crisis.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Stress Test Audit Trail ─────────────────────────────────── */}
        {view === 'library' && stressRuns.length > 0 && (
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Stress Test Run History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Persisted audit trail of all stress test executions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Scenario</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Shock (bps)</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">NII Impact</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">EVE Impact</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">CET1 After</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Breaches</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Run By</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Run At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stressRuns.slice(0, 20).map((run) => (
                    <tr key={run.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-sm">{run.scenarioName}</td>
                      <td className="px-4 py-3">
                        <span className={cn('ui-chip', CATEGORY_COLORS[run.scenarioType] || CATEGORY_COLORS.CUSTOM)}>
                          {run.scenarioType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{run.avgShockBps > 0 ? '+' : ''}{run.avgShockBps}</td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs', run.niiImpact >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatMoney(run.niiImpact)}
                      </td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs', run.eveImpact >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatMoney(run.eveImpact)}
                      </td>
                      <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs', run.cet1After < 10.5 ? 'text-red-600 font-bold' : '')}>
                        {run.cet1After?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        {run.breachCount > 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold dark:bg-red-900/30 dark:text-red-400">
                            {run.breachCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{run.runBy || '--'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{new Date(run.runAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
