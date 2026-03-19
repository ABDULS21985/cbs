import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime, formatMoney } from '@/lib/formatters';
import { RefreshCw, CheckCircle, Activity, TrendingUp, BookOpen, BarChart2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAlmGapReport,
  useAlmPositions,
  useAlmScenarios,
  useRegulatoryScenarios,
  useGenerateGapReport,
  usePortfolioDuration,
} from '../hooks/useAlm';
import { almApi, type ShockScenario, type AlmGapReport } from '../api/almApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DualAxisGapChart,
  ScenarioDeltaRow,
  SensitivityHeatMap,
  PositionSnapshotTable,
} from '../components/GapAnalysis';

const SCENARIOS: { key: ShockScenario; label: string }[] = [
  { key: 'PARALLEL_UP_200', label: '+200bps Parallel' },
  { key: 'PARALLEL_DOWN_200', label: '-200bps Parallel' },
  { key: 'STEEPENING', label: 'Steepening' },
  { key: 'FLATTENING', label: 'Flattening' },
];

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];
const DEFAULT_PORTFOLIO = 'MAIN';

// ── Generate Report Form ────────────────────────────────────────────────────

function GenerateReportForm({ onGenerated }: { onGenerated: (date: string) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [currency, setCurrency] = useState('NGN');
  const [shock, setShock] = useState<ShockScenario>('PARALLEL_UP_200');
  const [multiCurrency, setMultiCurrency] = useState(false);
  const generate = useGenerateGapReport();

  const handleSubmit = async () => {
    if (multiCurrency) {
      for (const c of CURRENCIES) {
        await almApi.generateGapReport({ asOfDate: date, currency: c, shockScenario: shock });
      }
      toast.success(`Gap reports generated for ${CURRENCIES.join(', ')}`);
      onGenerated(date);
    } else {
      generate.mutate(
        { asOfDate: date, currency, shockScenario: shock },
        {
          onSuccess: () => { toast.success('Gap report generated'); onGenerated(date); },
          onError: () => toast.error('Failed to generate report'),
        },
      );
    }
  };

  const setLastBusinessDay = () => {
    const d = new Date();
    const day = d.getDay();
    if (day === 0) d.setDate(d.getDate() - 2);
    else if (day === 6) d.setDate(d.getDate() - 1);
    else if (day === 1) d.setDate(d.getDate() - 3);
    else d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Generate New Gap Report</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">As-of Date</label>
          <div className="flex gap-1">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="flex-1 h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={setLastBusinessDay} title="Last business day"
              className="h-8 px-2 text-xs rounded-lg border bg-muted hover:bg-muted/80 whitespace-nowrap">LBD</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Currency</label>
          <div className="flex items-center gap-2">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={multiCurrency}
              className="flex-1 h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs whitespace-nowrap">
              <input type="checkbox" checked={multiCurrency} onChange={(e) => setMultiCurrency(e.target.checked)} className="rounded" />
              All
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Shock Scenario</label>
          <select value={shock} onChange={(e) => setShock(e.target.value as ShockScenario)}
            className="w-full h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {SCENARIOS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={handleSubmit} disabled={generate.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <RefreshCw className={cn('w-3.5 h-3.5', generate.isPending && 'animate-spin')} />
            {generate.isPending ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gap Report Tab ──────────────────────────────────────────────────────────

function GapReportTab() {
  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);
  const [reportCurrency, setReportCurrency] = useState('NGN');
  const [comparisonScenario, setComparisonScenario] = useState<string>('');
  const [drillBucket, setDrillBucket] = useState<string | null>(null);

  const { data: report, isLoading } = useAlmGapReport(reportDate);
  const { data: positions = [], isLoading: posLoading } = useAlmPositions(reportDate, reportCurrency);

  // Fetch a second report for comparison overlay (client-side)
  const { data: compReport } = useAlmGapReport(comparisonScenario ? reportDate : '');

  const queryClient = useQueryClient();
  const approveReport = useMutation({
    mutationFn: (id: number) => almApi.approveGapReport(id),
    onSuccess: () => {
      toast.success('Report approved');
      queryClient.invalidateQueries({ queryKey: ['alm', 'gap-report', reportDate] });
    },
    onError: () => toast.error('Failed to approve report'),
  });

  const handleExportAlco = () => {
    if (!report) return;
    const payload = {
      reportDate: report.asOfDate,
      currency: report.currency,
      status: report.status,
      approvedBy: report.approvedBy,
      totalAssets: report.totalAssets,
      totalLiabilities: report.totalLiabilities,
      netGap: report.netGap,
      buckets: report.buckets,
      positions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alco-pack-${report.asOfDate}-${report.currency}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('ALCO pack exported');
  };

  const chartData = report?.buckets ?? [];
  const compData = comparisonScenario && compReport ? compReport.buckets : undefined;

  return (
    <div className="p-4 space-y-4">
      <GenerateReportForm onGenerated={setReportDate} />

      {/* Report Header + Scenario Selector */}
      {report && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium">Report — {formatDate(report.asOfDate)}</p>
            <StatusBadge status={report.status} dot />
            {report.approvedBy && (
              <span className="text-xs text-muted-foreground">
                Approved by {report.approvedBy} {report.approvedAt && `at ${formatDateTime(report.approvedAt)}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Compare scenario */}
            <select value={comparisonScenario} onChange={(e) => setComparisonScenario(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">No comparison</option>
              {SCENARIOS.filter((s) => s.key !== report.shockScenario).map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {/* Currency for positions */}
            <select value={reportCurrency} onChange={(e) => setReportCurrency(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border bg-background">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button onClick={handleExportAlco}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> ALCO Pack
            </button>
            {report.status !== 'APPROVED' && (
              <button onClick={() => approveReport.mutate(report.id)} disabled={approveReport.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" />
                {approveReport.isPending ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Dual-Axis Gap Chart */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Repricing Gap — Assets vs Liabilities</p>
        <DualAxisGapChart
          buckets={chartData}
          comparisonBuckets={compData}
          comparisonLabel={comparisonScenario ? SCENARIOS.find((s) => s.key === comparisonScenario)?.label : undefined}
          loading={isLoading}
          onBucketClick={setDrillBucket}
        />
      </div>

      {/* 2. Scenario Comparison Delta */}
      {compData && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Scenario Comparison</p>
          <ScenarioDeltaRow
            primary={chartData}
            comparison={compData}
            primaryLabel={SCENARIOS.find((s) => s.key === report?.shockScenario)?.label ?? 'Primary'}
            comparisonLabel={SCENARIOS.find((s) => s.key === comparisonScenario)?.label ?? 'Comparison'}
          />
        </div>
      )}

      {/* 3. Sensitivity Heat Map */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">NII & EVE Sensitivity Heat Map</p>
        <SensitivityHeatMap report={report} loading={isLoading} />
      </div>

      {/* Drill-down panel */}
      {drillBucket && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Bucket Drill-down: {drillBucket}</p>
            <button onClick={() => setDrillBucket(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          {(() => {
            const pos = positions.find((p) => p.timeBucket === drillBucket);
            if (!pos) return <p className="text-xs text-muted-foreground">No position data for this bucket.</p>;
            const items = [
              { cat: 'Assets', lines: [
                { label: 'Cash & Equivalents', value: pos.cashAndEquivalents },
                { label: 'Interbank Placements', value: pos.interbankPlacements },
                { label: 'Securities', value: pos.securitiesHeld },
                { label: 'Loans & Advances', value: pos.loansAndAdvances },
                { label: 'Other', value: pos.otherAssets },
              ]},
              { cat: 'Liabilities', lines: [
                { label: 'Demand Deposits', value: pos.demandDeposits },
                { label: 'Term Deposits', value: pos.termDeposits },
                { label: 'Interbank Borrowings', value: pos.interbankBorrowings },
                { label: 'Bonds Issued', value: pos.bondsIssued },
                { label: 'Other', value: pos.otherLiabilities },
              ]},
            ];
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(({ cat, lines }) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{cat}</p>
                    <div className="space-y-1">
                      {lines.map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono tabular-nums">{fmtCompact(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. Position Snapshot Table */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Repricing Ladder — Position Snapshot ({reportCurrency})</p>
        <PositionSnapshotTable positions={positions} loading={posLoading} />
      </div>
    </div>
  );
}

function fmtCompact(v: number) {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toLocaleString();
}

// ── Duration Tab ────────────────────────────────────────────────────────────

function DurationTab() {
  const { data: dur, isLoading } = usePortfolioDuration(DEFAULT_PORTFOLIO);

  const metrics = dur
    ? [
        { label: 'Modified Duration (Assets)', value: dur.modifiedDurationAssets.toFixed(3) },
        { label: 'Modified Duration (Liabilities)', value: dur.modifiedDurationLiabilities.toFixed(3) },
        { label: 'Duration Gap', value: dur.durationGap.toFixed(3) },
        { label: 'DV01', value: dur.dv01.toLocaleString() },
      ]
    : [];

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-medium mb-4">Portfolio Duration Metrics — {DEFAULT_PORTFOLIO}</p>
        {isLoading ? (
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        ) : !dur ? (
          <p className="text-sm text-muted-foreground">Duration data unavailable.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scenarios Tab ───────────────────────────────────────────────────────────

function ScenariosTab() {
  const { data: scenarios = [], isLoading: scenLoading } = useAlmScenarios();
  const { data: regScenarios = [], isLoading: regLoading } = useRegulatoryScenarios();

  return (
    <div className="p-4 space-y-6">
      <div>
        <p className="text-sm font-medium mb-3">Active Scenarios</p>
        {scenLoading ? (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Shock (bps)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scenarios.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No active scenarios</td></tr>
                ) : scenarios.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.type}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{s.shockBps}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} dot /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Regulatory Scenarios</p>
        {regLoading ? (
          <div className="h-32 rounded-xl bg-muted animate-pulse" />
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Scenario</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Required Capital</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Computed Impact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {regScenarios.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No regulatory scenarios configured</td></tr>
                ) : regScenarios.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{s.requiredCapital?.toLocaleString() ?? '--'}</td>
                    <td className={cn('px-4 py-3 text-sm text-right tabular-nums font-medium',
                      s.computedImpact != null && s.computedImpact < 0 ? 'text-red-600' : 'text-green-600')}>
                      {s.computedImpact != null ? `${s.computedImpact > 0 ? '+' : ''}${s.computedImpact.toFixed(2)}%` : '--'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} dot /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AlmDashboardPage() {
  useEffect(() => { document.title = 'ALM Dashboard | CBS'; }, []);

  return (
    <>
      <PageHeader
        title="Asset-Liability Management"
        subtitle="Repricing gap analysis, duration metrics, NII sensitivity, and scenario management"
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Duration Gap" value="--" icon={Activity} />
          <StatCard label="NII at Risk" value="--" icon={TrendingUp} />
          <StatCard label="Active Scenarios" value={0} format="number" icon={BarChart2} />
          <StatCard label="Reports This Month" value={0} format="number" icon={BookOpen} />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            { id: 'gap-report', label: 'Gap Report', content: <GapReportTab /> },
            { id: 'duration', label: 'Duration Metrics', content: <DurationTab /> },
            { id: 'scenarios', label: 'Scenarios', content: <ScenariosTab /> },
          ]}
        />
      </div>
    </>
  );
}
