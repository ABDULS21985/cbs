import { useState } from 'react';
import { FileBarChart, Loader2, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { apiGet } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RiskAppetiteGauges } from '../components/dashboard/RiskAppetiteGauges';
import { RiskHeatmap } from '../components/dashboard/RiskHeatmap';
import { KeyRiskIndicators } from '../components/dashboard/KeyRiskIndicators';
import { RiskAlertsList } from '../components/dashboard/RiskAlertsList';
import { RiskLimitsSummaryTable } from '../components/dashboard/RiskLimitsSummaryTable';
import {
  useRiskAppetite,
  useRiskHeatmap,
  useKris,
  useRiskAlerts,
  useRiskLimits,
} from '../hooks/useRiskDashboard';

interface RiskReport {
  reportDate: string;
  totalActiveLoans: number;
  totalExposure: number;
  nplCount: number;
  nplAmount: number;
  nplRatio: number;
  totalProvisions: number;
  coverageRatio: number;
  watchListCount: number;
  stageDistribution: Record<string, number>;
  totalEcl: number;
  activeScoringModels: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function RiskDashboardPage() {
  const appetite = useRiskAppetite();
  const heatmap = useRiskHeatmap();
  const kris = useKris();
  const alerts = useRiskAlerts();
  const limits = useRiskLimits();

  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const data = await apiGet<RiskReport>('/api/v1/credit-risk/committee-pack');
      setReport(data);
      setShowReport(true);
      toast.success(
        `Risk report generated: ${data.totalActiveLoans} active loans, NPL ratio ${formatPct(data.nplRatio)}, coverage ${formatPct(data.coverageRatio)}`
      );
    } catch {
      toast.error('Failed to generate risk report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-report-${report.reportDate || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Enterprise Risk Dashboard"
        subtitle="Consolidated view of enterprise risk appetite, indicators, and limits"
        actions={
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileBarChart className="w-4 h-4" />
                Generate Risk Report
              </>
            )}
          </button>
        }
      />

      {/* Risk Report Modal */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Risk Report Summary</DialogTitle>
          </DialogHeader>

          {report && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Report Date: {report.reportDate}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Active Loans</p>
                  <p className="text-lg font-semibold">{report.totalActiveLoans.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Exposure</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.totalExposure)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">NPL Count</p>
                  <p className="text-lg font-semibold">{report.nplCount.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">NPL Amount</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.nplAmount)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">NPL Ratio</p>
                  <p className="text-lg font-semibold">{formatPct(report.nplRatio)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Provisions</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.totalProvisions)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Coverage Ratio</p>
                  <p className="text-lg font-semibold">{formatPct(report.coverageRatio)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Watch List Count</p>
                  <p className="text-lg font-semibold">{report.watchListCount.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total ECL</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.totalEcl)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Active Scoring Models</p>
                  <p className="text-lg font-semibold">{report.activeScoringModels}</p>
                </div>
              </div>

              {report.stageDistribution && Object.keys(report.stageDistribution).length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-2">Stage Distribution</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(report.stageDistribution).map(([stage, count]) => (
                      <div key={stage} className="text-sm">
                        <span className="font-medium">{stage}:</span> {count.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setShowReport(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
              Close
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-6 space-y-6">
        {/* Row 1: Risk Appetite Gauges */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Risk Appetite
          </h2>
          <RiskAppetiteGauges data={appetite.data ?? []} isLoading={appetite.isLoading} />
        </section>

        {/* Row 2: Risk Heatmap */}
        <section>
          <RiskHeatmap data={heatmap.data ?? []} isLoading={heatmap.isLoading} />
        </section>

        {/* Row 3: KRIs + Alerts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <KeyRiskIndicators data={kris.data ?? []} isLoading={kris.isLoading} />
          <RiskAlertsList data={alerts.data ?? []} isLoading={alerts.isLoading} />
        </section>

        {/* Row 4: Risk Limits Summary */}
        <section>
          <RiskLimitsSummaryTable data={limits.data ?? []} isLoading={limits.isLoading} />
        </section>
      </div>
    </div>
  );
}
