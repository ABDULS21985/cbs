import { useCallback } from 'react';
import {
  FileText,
  AlertOctagon,
  Award,
  Building2,
  Trash2,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useNotificationStore } from '@/stores/notificationStore';
import { ReconciliationReport } from '../components/ReconciliationReport';
import { useComplianceChecklist, useComplianceScoreTrend } from '../hooks/useReconciliation';
import { generateReconciliationReport } from '../api/reconciliationApi';

const REPORTS = [
  {
    id: 'daily-status',
    title: 'Daily Reconciliation Status',
    description: 'Summary of all nostro/vostro accounts reconciled today with match rates and outstanding items.',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'outstanding-breaks',
    title: 'Outstanding Breaks Report',
    description: 'All unresolved reconciliation breaks with aging analysis, assignment status, and escalation level.',
    icon: <AlertOctagon className="w-5 h-5" />,
  },
  {
    id: 'monthly-certificate',
    title: 'Monthly Reconciliation Certificate',
    description: 'Certification report for month-end sign-off by operations manager and head of finance.',
    icon: <Award className="w-5 h-5" />,
  },
  {
    id: 'nostro-proof',
    title: 'Nostro Proof of Reconciliation',
    description: 'Detailed nostro account proof showing opening balance, movements, and closing reconciliation.',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: 'write-off-summary',
    title: 'Write-Off Summary',
    description: 'Summary of all write-offs approved during the period with GL impact and authorization trail.',
    icon: <Trash2 className="w-5 h-5" />,
  },
];

const CBN_REQUIREMENTS: Array<{ id: string; requirement: string }> = [
  { id: 'cbr-1', requirement: 'All nostro accounts reconciled within T+1 business day' },
  { id: 'cbr-2', requirement: 'Outstanding breaks aged >30 days reported to management' },
  { id: 'cbr-3', requirement: 'Monthly reconciliation certificate signed by authorized officers' },
  { id: 'cbr-4', requirement: 'Write-offs exceeding NGN 5M approved by Board Risk Committee' },
  { id: 'cbr-5', requirement: 'Quarterly regulatory return submitted to CBN within 15 business days' },
];

export function ReconciliationReportsPage() {
  const addToast = useNotificationStore((s) => s.addToast);
  const { data: complianceChecklist = [], isLoading: checklistLoading } = useComplianceChecklist();
  const { data: complianceScore = [] } = useComplianceScoreTrend();

  const handleGenerate = useCallback(async (reportType: string, dateFrom: string, dateTo: string) => {
    try {
      const blob = await generateReconciliationReport(reportType, { dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recon-report-${reportType}-${dateFrom}-to-${dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Report Generated', message: `${reportType} report downloaded successfully.` });
    } catch {
      addToast({ type: 'error', title: 'Report Failed', message: 'Failed to generate report. Please try again.' });
    }
  }, [addToast]);

  const handlePreview = useCallback((dateFrom: string, dateTo: string) => {
    handleGenerate('daily-status', dateFrom, dateTo);
  }, [handleGenerate]);

  const handleDownload = useCallback((dateFrom: string, dateTo: string) => {
    handleGenerate('daily-status', dateFrom, dateTo);
  }, [handleGenerate]);

  const handleEmail = useCallback((_dateFrom: string, _dateTo: string) => {
    addToast({ type: 'info', title: 'Email', message: 'Email distribution will be available in a future release.' });
  }, [addToast]);

  const metCount = complianceChecklist.filter((c) => c.met).length;
  const compliancePercent = complianceChecklist.length > 0 ? Math.round((metCount / complianceChecklist.length) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Reconciliation Reports"
        subtitle="Generate reports and monitor compliance with CBN reconciliation requirements"
        backTo="/accounts/reconciliation"
      />

      <div className="page-container space-y-8">
        {/* Report Cards */}
        <section>
          <h2 className="text-sm font-semibold mb-4">Report Generation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {REPORTS.map((report) => (
              <ReconciliationReport
                key={report.id}
                title={report.title}
                description={report.description}
                icon={report.icon}
                onGenerate={(dateFrom, dateTo) => handleGenerate(report.id, dateFrom, dateTo)}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onEmail={handleEmail}
              />
            ))}
          </div>
        </section>

        {/* Compliance Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CBN Compliance Checklist */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">CBN Compliance Checklist</p>
                <p className="text-xs text-muted-foreground mt-0.5">Regulatory reconciliation requirements</p>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                  compliancePercent === 100
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : compliancePercent >= 60
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                )}
              >
                {compliancePercent}%
              </div>
            </div>

            <div className="divide-y">
              {checklistLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading compliance data...</div>
              ) : (
                complianceChecklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    {item.met ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs', item.met ? 'text-foreground' : 'text-foreground font-medium')}>
                        {item.requirement}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Last checked: {formatDate(item.lastChecked)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Compliance Score Trend */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Compliance Score Trend</p>
                <p className="text-xs text-muted-foreground mt-0.5">12-month compliance score (target: 100%)</p>
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="p-4">
              {complianceScore.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={complianceScore} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => {
                        const [, m] = v.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return months[parseInt(m, 10) - 1] || m;
                      }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 8,
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Score']}
                    />
                    <ReferenceLine y={100} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Target', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
                  No compliance data available
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded bg-primary" />
                Compliance Score
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded bg-primary/40 border border-dashed border-primary" />
                Target (100%)
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
