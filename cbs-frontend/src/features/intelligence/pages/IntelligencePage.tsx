import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/shared';
import {
  Brain,
  TrendingDown,
  FileSearch,
  LayoutDashboard,
  ChevronRight,
  Activity,
  Users,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePendingDocuments,
  useAllForecasts,
  useAllDashboards,
} from '../hooks/useIntelligence';

// ---- Feature Card ---------------------------------------------------------------

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  colorClass: string;
  path: string;
  stats?: { label: string; value: number | string }[];
}

function FeatureCard({ icon: Icon, title, description, colorClass, path, stats }: FeatureCardProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      {stats && stats.length > 0 && (
        <div className="flex gap-4 mt-1">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => navigate(path)}
        className="mt-auto flex items-center gap-1 text-xs text-primary font-medium hover:underline"
      >
        Open <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function IntelligencePage() {
  const { data: pendingDocs = [] } = usePendingDocuments();
  const { data: forecasts = [] } = useAllForecasts();
  const { data: dashboards = [] } = useAllDashboards();

  const pendingReview = pendingDocs.filter(
    (d) => d.verificationStatus === 'MANUAL_REVIEW' || d.verificationStatus === 'EXTRACTED',
  ).length;
  const pendingApproval = forecasts.filter((f) => f.status === 'GENERATED').length;

  return (
    <>
      <PageHeader
        title="Intelligence & Analytics"
        subtitle="AI-powered behavioural analytics, cash-flow forecasting, document intelligence, and configurable dashboards"
      />
      <div className="page-container space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Docs Pending Review" value={pendingReview} format="number" icon={FileSearch} />
          <StatCard label="Forecasts Pending" value={pendingApproval} format="number" icon={TrendingDown} />
          <StatCard label="BI Dashboards" value={dashboards.length} format="number" icon={LayoutDashboard} />
          <StatCard label="Total Forecasts" value={forecasts.length} format="number" icon={BarChart3} />
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard
            icon={Brain}
            title="Behaviour Analytics"
            description="Customer event tracking, AI product recommendations, and churn risk scoring."
            colorClass="bg-purple-600"
            path="/intelligence/behaviour"
          />
          <FeatureCard
            icon={FileSearch}
            title="Document Intelligence"
            description="OCR/NLP extraction, classification, verification, and human-in-the-loop review."
            colorClass="bg-teal-600"
            path="/intelligence/documents"
            stats={pendingReview > 0 ? [{ label: 'Pending Review', value: pendingReview }] : undefined}
          />
          <FeatureCard
            icon={TrendingDown}
            title="Cash Flow Forecasting"
            description="ML-powered cash flow projections with confidence intervals and category breakdown."
            colorClass="bg-blue-600"
            path="/intelligence/cashflow"
            stats={pendingApproval > 0 ? [{ label: 'Awaiting Approval', value: pendingApproval }] : undefined}
          />
          <FeatureCard
            icon={LayoutDashboard}
            title="BI Dashboards"
            description="Configurable real-time dashboards with 13 widget types and role-based access control."
            colorClass="bg-amber-600"
            path="/intelligence/dashboards"
            stats={[{ label: 'Dashboards', value: dashboards.length }]}
          />
        </div>

        {/* Quick access section */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-sm font-semibold mb-3">Quick Access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickLink
              icon={Users}
              label="Analyse Customer"
              description="Churn & recommendations"
              path="/intelligence/behaviour"
            />
            <QuickLink
              icon={FileSearch}
              label="Review Documents"
              description={`${pendingReview} pending`}
              path="/intelligence/documents?tab=pending"
            />
            <QuickLink
              icon={TrendingDown}
              label="New Forecast"
              description="Generate projection"
              path="/intelligence/cashflow"
            />
            <QuickLink
              icon={LayoutDashboard}
              label="Manage Dashboards"
              description="Create & configure"
              path="/intelligence/dashboards"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function QuickLink({
  icon: Icon,
  label,
  description,
  path,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  path: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left w-full"
    >
      <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
