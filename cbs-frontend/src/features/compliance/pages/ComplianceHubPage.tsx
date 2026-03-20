import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, ShieldAlert, Target, Scale, FileText, Search, Clock,
  AlertTriangle, CheckCircle2, BarChart3, Users, Eye, ArrowRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { complianceApi } from '../api/complianceApi';
import { useGapAnalysisDashboard, useOverdueGapAnalysis } from '../hooks/useComplianceExt';
import { useAmlStats } from '../hooks/useAml';
import { useFraudStats } from '../hooks/useFraud';
import { useSanctionsStats } from '../hooks/useSanctions';

// ── Health Gauge ─────────────────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444';
  const label = score >= 90 ? 'Strong' : score >= 70 ? 'Adequate' : 'Needs Attention';
  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference * (1 - score / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle cx="70" cy="70" r="60" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
          <circle cx="70" cy="70" r="60" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}%</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}

// ── Quick Link Card ──────────────────────────────────────────────────────────

function QuickLinkCard({ icon: Icon, label, description, path, badge, badgeColor }: {
  icon: React.ElementType; label: string; description: string; path: string;
  badge?: number; badgeColor?: string;
}) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(path)}
      className="rounded-xl border bg-card p-4 text-left hover:bg-muted/50 hover:border-border/80 transition-all group">
      <div className="flex items-start justify-between">
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        {badge != null && badge > 0 && (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', badgeColor ?? 'bg-primary/10 text-primary')}>{badge}</span>
        )}
      </div>
      <h3 className="text-sm font-semibold mt-3">{label}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ComplianceHubPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['compliance', 'stats'],
    queryFn: () => complianceApi.getStats(),
    staleTime: 60_000,
  });

  const { data: gapDashboard } = useGapAnalysisDashboard();
  const { data: overdueGaps = [] } = useOverdueGapAnalysis();
  const { data: amlStats } = useAmlStats();
  const { data: fraudStats } = useFraudStats();
  const { data: sanctionsStats } = useSanctionsStats();

  const gapData = gapDashboard as Record<string, any> ?? {};
  const aml = amlStats as Record<string, any> ?? {};
  const fraud = fraudStats as Record<string, any> ?? {};
  const sanctions = sanctionsStats as Record<string, any> ?? {};

  // Compute health score from available data
  const complianceScore = stats?.complianceScore ?? 0;
  const overdueCount = overdueGaps.length;
  const criticalGaps = stats?.criticalGaps ?? 0;
  const healthScore = Math.max(0, Math.min(100,
    complianceScore > 0 ? complianceScore : 85 - (overdueCount * 3) - (criticalGaps * 5)
  ));

  // Alert counts
  const openAmlAlerts = aml.openAlerts ?? aml.totalAlerts ?? 0;
  const openFraudAlerts = fraud.openAlerts ?? fraud.totalAlerts ?? 0;
  const pendingScreenings = sanctions.pendingReview ?? sanctions.totalScreenings ?? 0;
  const totalAlerts = openAmlAlerts + openFraudAlerts + pendingScreenings;

  return (
    <>
      <PageHeader title="Compliance & Risk Management" subtitle="Chief Compliance Officer command center" />

      <div className="page-container space-y-6">
        {/* Top Section: Health + Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Health Gauge */}
          <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Compliance Health</h3>
            <HealthGauge score={healthScore} />
            <p className="text-xs text-muted-foreground mt-3">Based on assessments, gap remediation, and alert posture</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Assessments" value={stats?.activeAssessments ?? 0} format="number" icon={Scale} loading={statsLoading} />
            <StatCard label="Open Gaps" value={stats?.openGaps ?? 0} format="number" icon={Target} loading={statsLoading} />
            <StatCard label="Critical Gaps" value={criticalGaps} format="number" icon={ShieldAlert} loading={statsLoading} />
            <StatCard label="Overdue" value={overdueCount} format="number" icon={AlertTriangle} loading={statsLoading} />
            <StatCard label="AML Alerts" value={openAmlAlerts} format="number" icon={ShieldAlert} loading={!amlStats} />
            <StatCard label="Fraud Alerts" value={openFraudAlerts} format="number" icon={AlertTriangle} loading={!fraudStats} />
            <StatCard label="Sanctions Pending" value={pendingScreenings} format="number" icon={Search} loading={!sanctionsStats} />
            <StatCard label="Total Open Alerts" value={totalAlerts} format="number" icon={Shield} loading={statsLoading} />
          </div>
        </div>

        {/* Critical Alert Banner */}
        {(overdueCount > 0 || totalAlerts > 10) && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Attention Required</p>
              <p className="text-xs text-red-600 dark:text-red-400/80">
                {overdueCount > 0 && `${overdueCount} overdue gap remediations. `}
                {totalAlerts > 10 && `${totalAlerts} open compliance alerts across AML, fraud, and sanctions.`}
              </p>
            </div>
          </div>
        )}

        {/* Module Quick Links */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Compliance Modules</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <QuickLinkCard icon={Scale} label="Assessments" description="Compliance assessment tracking and scoring" path="/compliance/assessments" badge={stats?.activeAssessments} />
            <QuickLinkCard icon={Target} label="Gap Analysis" description="Gap identification, remediation tracking" path="/compliance/gaps" badge={overdueCount} badgeColor="bg-red-100 text-red-700" />
            <QuickLinkCard icon={FileText} label="Regulatory Returns" description="Return calendar and submission workflow" path="/compliance/returns" />
            <QuickLinkCard icon={BarChart3} label="Report Definitions" description="Configure and generate regulatory reports" path="/compliance/definitions" />
            <QuickLinkCard icon={ShieldAlert} label="AML/CFT" description="Anti-money laundering monitoring" path="/compliance/aml" badge={openAmlAlerts} badgeColor="bg-amber-100 text-amber-700" />
            <QuickLinkCard icon={AlertTriangle} label="Fraud Detection" description="Transaction fraud monitoring" path="/compliance/fraud" badge={openFraudAlerts} badgeColor="bg-red-100 text-red-700" />
            <QuickLinkCard icon={Search} label="Sanctions Screening" description="Name screening and watchlist management" path="/compliance/sanctions" badge={pendingScreenings} />
            <QuickLinkCard icon={Eye} label="Audit Trail" description="System-wide audit log search" path="/compliance/audit" />
          </div>
        </div>

        {/* Status Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gap Remediation Progress */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Gap Remediation</h3>
              <button onClick={() => navigate('/compliance/gaps')} className="text-xs text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-2">
              {['IDENTIFIED', 'IN_PROGRESS', 'REMEDIATED', 'VERIFIED'].map((status) => {
                const count = (gapData as any)?.[`count_${status}`] ?? 0;
                return (
                  <div key={status} className="flex items-center justify-between py-1">
                    <StatusBadge status={status} size="sm" />
                    <span className="font-mono text-sm">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AML Summary */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">AML/CFT</h3>
              <button onClick={() => navigate('/compliance/aml')} className="text-xs text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Open Alerts</span><span className="font-mono font-medium">{aml.openAlerts ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Under Review</span><span className="font-mono">{aml.underReview ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SARs Filed</span><span className="font-mono">{aml.sarsFiled ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">False Positives</span><span className="font-mono">{aml.falsePositives ?? 0}</span></div>
            </div>
          </div>

          {/* Fraud Summary */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Fraud Detection</h3>
              <button onClick={() => navigate('/compliance/fraud')} className="text-xs text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Active Alerts</span><span className="font-mono font-medium">{fraud.activeAlerts ?? fraud.openAlerts ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Investigating</span><span className="font-mono">{fraud.investigating ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Confirmed Fraud</span><span className="font-mono text-red-600">{fraud.confirmedFraud ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Blocked</span><span className="font-mono">{fraud.blocked ?? 0}</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
