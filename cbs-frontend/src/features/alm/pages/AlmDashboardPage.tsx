import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { RefreshCw, CheckCircle, Activity, TrendingUp, BookOpen, BarChart2, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAlmGapReportsByDate,
  useAlmGapReports,
  useAlmPositions,
  useAlmScenarios,
  useRegulatoryScenarios,
  useGenerateGapReport,
  useDurationAnalytics,
} from '../hooks/useAlm';
import { almApi, type AlmGapReport } from '../api/almApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DualAxisGapChart,
  ScenarioDeltaRow,
  SensitivityHeatMap,
  PositionSnapshotTable,
} from '../components/GapAnalysis';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];
const DEFAULT_PORTFOLIO = 'MAIN';

// ── Generate Report Form ────────────────────────────────────────────────────

function GenerateReportForm({ onGenerated }: { onGenerated: (date: string) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const [totalRsa, setTotalRsa] = useState(80_000_000_000);
  const [totalRsl, setTotalRsl] = useState(75_000_000_000);
  const [multiCurrency, setMultiCurrency] = useState(false);
  const generate = useGenerateGapReport();

  const handleSubmit = async () => {
    if (multiCurrency) {
      for (const c of CURRENCIES) {
        await almApi.generateGapReport({ reportDate, currencyCode: c, totalRsa, totalRsl });
      }
      toast.success(`Gap reports generated for ${CURRENCIES.join(', ')}`);
      onGenerated(reportDate);
    } else {
      generate.mutate(
        { reportDate, currencyCode, totalRsa, totalRsl },
        {
          onSuccess: () => { toast.success('Gap report generated'); onGenerated(reportDate); },
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
    setReportDate(d.toISOString().split('T')[0]);
  };

  const inputCls = 'flex-1 h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Generate New Gap Report</p>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Report Date</label>
          <div className="flex gap-1">
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
              className={inputCls} />
            <button onClick={setLastBusinessDay} title="Last business day"
              className="h-8 px-2 text-xs rounded-lg border bg-muted hover:bg-muted/80 whitespace-nowrap">LBD</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Currency</label>
          <div className="flex items-center gap-2">
            <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} disabled={multiCurrency}
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
          <label className="text-xs text-muted-foreground block mb-1">Total RSA</label>
          <input type="number" value={totalRsa} onChange={(e) => setTotalRsa(Number(e.target.value))}
            className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Total RSL</label>
          <input type="number" value={totalRsl} onChange={(e) => setTotalRsl(Number(e.target.value))}
            className={inputCls} />
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

  const { data: reports = [], isLoading } = useAlmGapReportsByDate(reportDate);
  const { data: positions = [], isLoading: posLoading } = useAlmPositions(reportDate, reportCurrency);

  // Use first report for selected currency, or any report
  const report = reports.find((r) => r.currencyCode === reportCurrency) ?? reports[0];

  // Compute GapBucket array from the report's bucket JSONB
  const chartData = report?.buckets ?? [];

  const queryClient = useQueryClient();
  const approveReport = useMutation({
    mutationFn: (id: number) => almApi.approveGapReport(id),
    onSuccess: () => {
      toast.success('Report approved');
      queryClient.invalidateQueries({ queryKey: ['alm', 'gap-reports', reportDate] });
    },
    onError: () => toast.error('Failed to approve report'),
  });

  const handleExportAlco = () => {
    if (!report) return;
    const payload = {
      reportDate: report.reportDate,
      currencyCode: report.currencyCode,
      status: report.status,
      approvedBy: report.approvedBy,
      totalRsa: report.totalRsa,
      totalRsl: report.totalRsl,
      cumulativeGap: report.cumulativeGap,
      niiSensitivity: report.niiSensitivity,
      eveSensitivity: report.eveSensitivity,
      durationGap: report.durationGap,
      buckets: report.buckets,
      positions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alco-pack-${report.reportDate}-${report.currencyCode}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('ALCO pack exported');
  };

  return (
    <div className="p-4 space-y-4">
      <GenerateReportForm onGenerated={setReportDate} />

      {/* Report Header */}
      {report && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium">Report — {formatDate(report.reportDate)}</p>
            <StatusBadge status={report.status} dot />
            {report.approvedBy && (
              <span className="text-xs text-muted-foreground">
                Approved by {report.approvedBy}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={reportCurrency} onChange={(e) => setReportCurrency(e.target.value)}
              className="h-8 px-2 text-xs rounded-lg border bg-background">
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button onClick={handleExportAlco}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> ALCO Pack
            </button>
            {report.status === 'DRAFT' && (
              <button onClick={() => approveReport.mutate(report.id)} disabled={approveReport.isPending}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" />
                {approveReport.isPending ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* NII / EVE Summary */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'NII Base', value: fmtCompact(report.niiBase) },
            { label: 'NII +100bp', value: fmtCompact(report.niiUp100bp) },
            { label: 'NII Sensitivity', value: fmtCompact(report.niiSensitivity) },
            { label: 'Duration Gap', value: report.durationGap != null ? `${Number(report.durationGap).toFixed(2)}Y` : '--' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 1. Dual-Axis Gap Chart */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Repricing Gap — Assets vs Liabilities</p>
        <DualAxisGapChart
          buckets={chartData}
          loading={isLoading}
        />
      </div>

      {/* 2. Sensitivity Heat Map */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">NII & EVE Sensitivity Heat Map</p>
        <SensitivityHeatMap report={report} loading={isLoading} />
      </div>

      {/* 3. All Reports for Date */}
      {reports.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">Reports for {formatDate(reportDate)}</p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Currency</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total RSA</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Total RSL</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Gap</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">NII Sensitivity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setReportCurrency(r.currencyCode)}>
                    <td className="px-4 py-3 font-medium">{r.currencyCode}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{fmtCompact(r.totalRsa)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{fmtCompact(r.totalRsl)}</td>
                    <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs font-medium',
                      r.cumulativeGap >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {fmtCompact(r.cumulativeGap)}
                    </td>
                    <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs font-medium',
                      r.niiSensitivity >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {fmtCompact(r.niiSensitivity)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} dot /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const { data: dur, isLoading } = useDurationAnalytics(DEFAULT_PORTFOLIO);

  const metrics = dur
    ? [
        { label: 'Macaulay Duration (Assets)', value: `${Number(dur.macaulayDurationAssets).toFixed(3)}Y` },
        { label: 'Modified Duration (Assets)', value: `${Number(dur.modifiedDurationAssets).toFixed(3)}Y` },
        { label: 'Modified Duration (Liabilities)', value: `${Number(dur.modifiedDurationLiabilities).toFixed(3)}Y` },
        { label: 'Duration Gap', value: `${Number(dur.durationGap).toFixed(3)}Y` },
        { label: 'DV01', value: Number(dur.dv01).toLocaleString() },
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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

  const avgShock = (s: { shiftBps: Record<string, number> }) => {
    const vals = Object.values(s.shiftBps);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

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
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Avg Shock (bps)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scenarios.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No active scenarios</td></tr>
                ) : scenarios.filter((s) => s.isActive).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-sm">{s.scenarioName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.scenarioType}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{avgShock(s) > 0 ? '+' : ''}{avgShock(s)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} dot />
                    </td>
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Avg Shock (bps)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {regScenarios.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">No regulatory scenarios configured</td></tr>
                ) : regScenarios.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-sm">{s.scenarioName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.scenarioType}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{avgShock(s)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} dot />
                    </td>
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

// ── All Gap Reports Tab ──────────────────────────────────────────────────────

function AllReportsTab() {
  const { data: allReports = [], isLoading } = useAlmGapReports();

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      ) : allReports.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-sm">No gap reports on record. Generate your first report from the Gap Report tab.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Report Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Currency</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">RSA</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">RSL</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Gap</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Gap Ratio</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">NII Sensitivity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Generated By</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allReports.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{formatDate(r.reportDate)}</td>
                  <td className="px-4 py-3 font-medium">{r.currencyCode}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{fmtCompact(r.totalRsa)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">{fmtCompact(r.totalRsl)}</td>
                  <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs font-medium',
                    r.cumulativeGap >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {fmtCompact(r.cumulativeGap)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-xs">
                    {Number(r.gapRatio).toFixed(4)}
                  </td>
                  <td className={cn('px-4 py-3 text-right tabular-nums font-mono text-xs',
                    r.niiSensitivity >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {fmtCompact(r.niiSensitivity)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} dot /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.generatedBy ?? '--'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function AlmDashboardPage() {
  useEffect(() => { document.title = 'ALM Dashboard | CBS'; }, []);

  const today = new Date().toISOString().split('T')[0];
  const { data: latestReports = [] } = useAlmGapReportsByDate(today);
  const latestReport = latestReports[0];
  const { data: duration } = useDurationAnalytics(DEFAULT_PORTFOLIO);
  const { data: scenarios = [] } = useAlmScenarios();

  const niiAtRisk = latestReport
    ? Math.abs(Number(latestReport.niiSensitivity) / 1e6)
    : 0;

  return (
    <>
      <PageHeader
        title="Asset-Liability Management"
        subtitle="Repricing gap analysis, duration metrics, NII sensitivity, and scenario management"
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Duration Gap"
            value={duration?.durationGap != null ? `${Number(duration.durationGap).toFixed(2)}Y` : '--'}
            icon={Activity}
          />
          <StatCard
            label="NII Sensitivity"
            value={niiAtRisk > 0 ? `${niiAtRisk.toFixed(1)}M` : '--'}
            icon={TrendingUp}
          />
          <StatCard
            label="Active Scenarios"
            value={scenarios.filter((s) => s.isActive).length}
            format="number"
            icon={BarChart2}
          />
          <StatCard
            label="Cumulative Gap"
            value={latestReport ? fmtCompact(latestReport.cumulativeGap) : '--'}
            icon={BookOpen}
          />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            { id: 'gap-report', label: 'Gap Report', content: <GapReportTab /> },
            { id: 'duration', label: 'Duration Metrics', content: <DurationTab /> },
            { id: 'scenarios', label: 'Scenarios', content: <ScenariosTab /> },
            { id: 'history', label: 'Report History', content: <AllReportsTab /> },
          ]}
        />
      </div>
    </>
  );
}

function formatDateTime(ts: string): string {
  if (!ts) return '--';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}
