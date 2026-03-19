import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Activity, TrendingUp, BookOpen, BarChart2, RefreshCw, CheckCircle } from 'lucide-react';
import {
  useAlmGapReport,
  useAlmScenarios,
  useRegulatoryScenarios,
  useGenerateGapReport,
  usePortfolioDuration,
} from '../hooks/useAlm';
import { almApi, type ShockScenario } from '../api/almApi';
import { useMutation } from '@tanstack/react-query';

const BUCKETS = ['0-1M', '1-3M', '3-6M', '6-12M', '1-5Y', '5Y+'];
const SCENARIOS: { key: ShockScenario; label: string }[] = [
  { key: 'PARALLEL_UP_200', label: '+200bps Parallel' },
  { key: 'PARALLEL_DOWN_200', label: '-200bps Parallel' },
  { key: 'STEEPENING', label: 'Steepening' },
  { key: 'FLATTENING', label: 'Flattening' },
];

const DEFAULT_PORTFOLIO = 'MAIN';

// ---- Repricing Gap Chart --------------------------------------------------------

function RepricingGapChart({
  buckets,
  loading,
}: {
  buckets: { bucket: string; gap: number }[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-64 rounded-xl bg-muted animate-pulse" />;
  }

  const chartData =
    buckets.length > 0
      ? buckets
      : BUCKETS.map((b) => ({ bucket: b, gap: 0 }));

  const formatBillions = (v: number) =>
    Math.abs(v) >= 1e9
      ? `${(v / 1e9).toFixed(1)}B`
      : Math.abs(v) >= 1e6
      ? `${(v / 1e6).toFixed(1)}M`
      : v.toLocaleString();

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatBillions} tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => [formatBillions(v), 'Gap']}
          contentStyle={{ fontSize: 12 }}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar dataKey="gap" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.gap < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
              opacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- NII Sensitivity Table ------------------------------------------------------

function NiiSensitivityTable({
  buckets,
  loading,
}: {
  buckets: { bucket: string; niiImpact?: number; eveImpact?: number }[];
  loading: boolean;
}) {
  if (loading) return <div className="h-40 rounded-xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Scenario</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">NII Impact %</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">EVE Impact %</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {SCENARIOS.map(({ key, label }) => {
            const row = buckets.find((b) => (b as any).shockScenario === key);
            const nii = row?.niiImpact ?? null;
            const eve = row?.eveImpact ?? null;
            return (
              <tr key={key} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-sm">{label}</td>
                <td
                  className={cn(
                    'px-4 py-3 text-sm text-right tabular-nums font-medium',
                    nii !== null && nii < 0 ? 'text-red-600' : 'text-green-600',
                  )}
                >
                  {nii !== null ? `${nii > 0 ? '+' : ''}${nii.toFixed(2)}%` : '--'}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-sm text-right tabular-nums font-medium',
                    eve !== null && eve < 0 ? 'text-red-600' : 'text-green-600',
                  )}
                >
                  {eve !== null ? `${eve > 0 ? '+' : ''}${eve.toFixed(2)}%` : '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Generate Report Dialog (inline form) ---------------------------------------

function GenerateReportForm({
  onGenerated,
}: {
  onGenerated: (date: string) => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('NGN');
  const [shock, setShock] = useState<ShockScenario>('PARALLEL_UP_200');
  const generate = useGenerateGapReport();

  const handleSubmit = () => {
    generate.mutate(
      { asOfDate: date, currency, shockScenario: shock },
      { onSuccess: () => onGenerated(date) },
    );
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Generate New Gap Report</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">As-of Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {['NGN', 'USD', 'EUR', 'GBP'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Shock Scenario</label>
          <select
            value={shock}
            onChange={(e) => setShock(e.target.value as ShockScenario)}
            className="w-full h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {SCENARIOS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={generate.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <RefreshCw className={cn('w-3.5 h-3.5', generate.isPending && 'animate-spin')} />
        {generate.isPending ? 'Generating...' : 'Generate Report'}
      </button>
    </div>
  );
}

// ---- Gap Report Tab -------------------------------------------------------------

function GapReportTab() {
  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);
  const { data: report, isLoading } = useAlmGapReport(reportDate);

  const approveReport = useMutation({
    mutationFn: (id: number) => almApi.approveGapReport(id),
  });

  const chartData = report?.buckets ?? [];

  return (
    <div className="p-4 space-y-4">
      <GenerateReportForm onGenerated={setReportDate} />

      {report && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">
              Report — {formatDate(report.asOfDate)}
            </p>
            <StatusBadge status={report.status} dot />
          </div>
          {report.status !== 'APPROVED' && (
            <button
              onClick={() => approveReport.mutate(report.id)}
              disabled={approveReport.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {approveReport.isPending ? 'Approving...' : 'Approve Report'}
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">Repricing Gap by Bucket</p>
        <RepricingGapChart buckets={chartData} loading={isLoading} />
        <p className="text-xs text-muted-foreground mt-2">
          Positive = assets reprice faster (asset-sensitive). Negative = funding gap.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium mb-3">NII & EVE Sensitivity</p>
        <NiiSensitivityTable buckets={chartData} loading={isLoading} />
      </div>
    </div>
  );
}

// ---- Duration Tab ---------------------------------------------------------------

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

// ---- Scenarios Tab --------------------------------------------------------------

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
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No active scenarios
                    </td>
                  </tr>
                ) : (
                  scenarios.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.type}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{s.shockBps}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} dot />
                      </td>
                    </tr>
                  ))
                )}
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
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No regulatory scenarios configured
                    </td>
                  </tr>
                ) : (
                  regScenarios.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">
                        {s.requiredCapital != null
                          ? s.requiredCapital.toLocaleString()
                          : '--'}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-sm text-right tabular-nums font-medium',
                          s.computedImpact != null && s.computedImpact < 0
                            ? 'text-red-600'
                            : 'text-green-600',
                        )}
                      >
                        {s.computedImpact != null
                          ? `${s.computedImpact > 0 ? '+' : ''}${s.computedImpact.toFixed(2)}%`
                          : '--'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} dot />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function AlmDashboardPage() {
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
