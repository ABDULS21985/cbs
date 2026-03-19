import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, TabsPage } from '@/components/shared';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Brain,
  TrendingDown,
  FileSearch,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  useCustomerRecommendations,
  useChurnScore,
  useGenerateRecommendations,
  useRespondToRecommendation,
  usePendingDocuments,
  useReviewDocument,
} from '../hooks/useIntelligence';

const DEMO_CUSTOMER_ID = 'CUST-000001';

// ---- Churn Gauge ----------------------------------------------------------------

function ChurnGauge({ score, riskLevel, segment }: { score: number; riskLevel: string; segment: string }) {
  const color =
    score < 30 ? 'text-green-600' : score < 60 ? 'text-amber-500' : 'text-red-600';
  const bgColor =
    score < 30 ? 'bg-green-50 border-green-200' : score < 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const barColor =
    score < 30 ? 'bg-green-500' : score < 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={cn('rounded-xl border p-6', bgColor)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Churn Risk Score</p>
          <p className="text-xs text-muted-foreground">Customer: {DEMO_CUSTOMER_ID}</p>
        </div>
        <StatusBadge status={riskLevel} />
      </div>
      <div className="flex items-end gap-4 mb-4">
        <span className={cn('text-6xl font-bold tabular-nums', color)}>{score}</span>
        <span className="text-2xl text-muted-foreground mb-1">/100</span>
      </div>
      <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low Risk</span>
        <span>Medium</span>
        <span>High Risk</span>
      </div>
      <div className="mt-4 pt-4 border-t border-black/10">
        <p className="text-xs text-muted-foreground">Segment</p>
        <p className="font-medium text-sm mt-0.5">{segment}</p>
      </div>
    </div>
  );
}

// ---- Feature Cards --------------------------------------------------------------

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  colorClass: string;
}

function FeatureCard({ icon: Icon, title, description, colorClass }: FeatureCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <button className="mt-auto flex items-center gap-1 text-xs text-primary font-medium hover:underline">
        Explore <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ---- Recommendations Tab --------------------------------------------------------

function RecommendationsTab() {
  const { data: recs = [], isLoading } = useCustomerRecommendations(DEMO_CUSTOMER_ID);
  const generate = useGenerateRecommendations();
  const respond = useRespondToRecommendation();

  const pending = recs.filter((r) => r.status === 'PENDING');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Product Recommendations</p>
          <p className="text-xs text-muted-foreground">AI-driven product matching for {DEMO_CUSTOMER_ID}</p>
        </div>
        <button
          onClick={() => generate.mutate(DEMO_CUSTOMER_ID)}
          disabled={generate.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', generate.isPending && 'animate-spin')} />
          Generate
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No pending recommendations. Click Generate to produce new ones.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{rec.productName}</span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                    Score: {rec.score}
                  </span>
                  <StatusBadge status={rec.productType} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{rec.reason}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() =>
                    respond.mutate({ id: rec.id, customerId: DEMO_CUSTOMER_ID, action: 'ACCEPT' })
                  }
                  disabled={respond.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3" /> Accept
                </button>
                <button
                  onClick={() =>
                    respond.mutate({ id: rec.id, customerId: DEMO_CUSTOMER_ID, action: 'DECLINE' })
                  }
                  disabled={respond.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Documents Tab --------------------------------------------------------------

function DocumentsTab() {
  const { data: docs = [], isLoading } = usePendingDocuments();
  const review = useReviewDocument();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Document Processing Queue</p>
          <p className="text-xs text-muted-foreground">OCR jobs pending human review</p>
        </div>
        {docs.length > 0 && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
            {docs.filter((d) => d.status === 'REVIEW_NEEDED').length} need review
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 rounded-lg bg-muted animate-pulse" />
      ) : docs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No documents pending review.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Document Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{doc.jobId}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{doc.documentType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.status} dot />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === 'REVIEW_NEEDED' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            review.mutate({ jobId: doc.jobId, action: 'APPROVE' })
                          }
                          disabled={review.isPending}
                          className="px-2 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            review.mutate({ jobId: doc.jobId, action: 'REJECT' })
                          }
                          disabled={review.isPending}
                          className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {doc.status === 'PROCESSING' ? 'Processing...' : 'Done'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Churn Tab ------------------------------------------------------------------

function ChurnTab() {
  const { data: churn, isLoading } = useChurnScore(DEMO_CUSTOMER_ID);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!churn) {
    return (
      <div className="p-4 py-12 text-center text-muted-foreground text-sm">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
        Churn score unavailable for this customer.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChurnGauge score={churn.score} riskLevel={churn.riskLevel} segment={churn.segment} />
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm font-medium mb-4">Contributing Factors</p>
          {churn.factors && churn.factors.length > 0 ? (
            <div className="space-y-3">
              {churn.factors.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{f.name}</span>
                    <span className="font-medium">{(f.impact * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(f.impact * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No factor breakdown available.</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Computed: {formatDate(churn.computedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function IntelligencePage() {
  const { data: docs = [] } = usePendingDocuments();
  const { data: recs = [] } = useCustomerRecommendations(DEMO_CUSTOMER_ID);

  const pendingRecs = recs.filter((r) => r.status === 'PENDING').length;
  const pendingDocs = docs.filter((d) => d.status === 'REVIEW_NEEDED').length;

  return (
    <>
      <PageHeader
        title="Intelligence & Analytics"
        subtitle="AI-powered behavioural analytics, cash-flow forecasting, and document intelligence"
      />
      <div className="page-container space-y-6">
        {/* Feature overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={Brain}
            title="Behaviour Analytics"
            description="Churn prediction and AI-driven product recommendations powered by transaction history and behavioural signals."
            colorClass="bg-purple-600"
          />
          <FeatureCard
            icon={TrendingDown}
            title="Cash Flow Forecasting"
            description="Generate short-to-medium horizon cash-flow projections for any entity using ML-based pattern recognition."
            colorClass="bg-blue-600"
          />
          <FeatureCard
            icon={FileSearch}
            title="Document Intelligence"
            description="Automated OCR extraction, field classification, and human-in-the-loop review for uploaded banking documents."
            colorClass="bg-teal-600"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Pending Recommendations" value={pendingRecs} format="number" icon={Brain} />
          <StatCard label="Docs Needing Review" value={pendingDocs} format="number" icon={FileSearch} />
          <StatCard label="Forecasts This Month" value={0} format="number" icon={TrendingDown} />
          <StatCard label="Customers Analysed" value={0} format="number" icon={Brain} />
        </div>

        {/* Main tabs */}
        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'recommendations',
              label: 'Recommendations',
              badge: pendingRecs || undefined,
              content: <RecommendationsTab />,
            },
            {
              id: 'churn',
              label: 'Churn Risk',
              content: <ChurnTab />,
            },
            {
              id: 'documents',
              label: 'Document Queue',
              badge: pendingDocs || undefined,
              content: <DocumentsTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
