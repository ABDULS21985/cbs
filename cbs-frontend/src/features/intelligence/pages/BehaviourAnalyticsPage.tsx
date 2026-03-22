import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, StatusBadge, StatCard, EmptyState, TabsPage } from '@/components/shared';
import { formatDate, formatDateTime, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Brain,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Users,
  Search,
  TrendingUp,
  Cpu,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useBehaviourEvents,
  useCustomerRecommendations,
  useChurnScore,
  useGenerateRecommendations,
  useRespondToRecommendation,
  type ProductRecommendation,
  type CustomerBehaviourEvent,
} from '../hooks/useIntelligence';
import { useCustomerBehaviorModels } from '../hooks/useIntelligenceExt';
import type { CustomerBehaviorModel } from '../types/customerBehavior';

// ---- Churn Gauge ----------------------------------------------------------------

function ChurnGauge({ score, riskLevel }: { score: number; riskLevel: string }) {
  const color =
    score < 30 ? 'text-green-600' : score < 60 ? 'text-amber-500' : 'text-red-600';
  const bgColor =
    score < 30 ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' :
    score < 60 ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' :
    'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';
  const barColor =
    score < 30 ? 'bg-green-500' : score < 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={cn('rounded-xl border p-6', bgColor)}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">Churn Risk Score</p>
        <StatusBadge status={riskLevel} />
      </div>
      <div className="flex items-end gap-4 mb-4">
        <span className={cn('text-6xl font-bold tabular-nums', color)}>{Math.round(score)}</span>
        <span className="text-2xl text-muted-foreground mb-1">/100</span>
      </div>
      <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mb-3">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${score}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Low Risk</span>
        <span>Medium</span>
        <span>High Risk</span>
      </div>
    </div>
  );
}

// ---- Churn Details ---------------------------------------------------------------

function ChurnDetails({ customerId }: { customerId: number }) {
  const { data: churn, isLoading } = useChurnScore(customerId);

  if (isLoading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  if (!churn) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
        Churn score unavailable. Ensure the customer has behaviour events tracked.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChurnGauge score={churn.churnScore} riskLevel={churn.riskLevel} />
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-medium mb-4">Activity Metrics (last 30/90 days)</p>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Logins (30d)</span>
            <span className="font-medium tabular-nums">{churn.logins30d}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transactions (30d)</span>
            <span className="font-medium tabular-nums">{churn.transactions30d}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Complaints (90d)</span>
            <span className="font-medium tabular-nums">{churn.complaints90d}</span>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Risk factors: Low logins (+30), No transactions (+25), Complaints (+10 each), Churn signals (+15 each), Was active now silent (+20)
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Recommendations Tab ---------------------------------------------------------

function RecommendationsTab({ customerId }: { customerId: number }) {
  const { data: recs = [], isLoading } = useCustomerRecommendations(customerId);
  const generate = useGenerateRecommendations();
  const respond = useRespondToRecommendation();

  const pending = recs.filter((r) => r.status === 'PENDING');

  const recTypeLabel: Record<string, string> = {
    CROSS_SELL: 'Cross-Sell',
    UP_SELL: 'Up-Sell',
    RETENTION: 'Retention',
    REACTIVATION: 'Reactivation',
    NEXT_BEST_ACTION: 'Next Best',
    LIFECYCLE: 'Lifecycle',
    CAMPAIGN: 'Campaign',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Product Recommendations</p>
          <p className="text-xs text-muted-foreground">
            AI-driven product matching for customer #{customerId}
          </p>
        </div>
        <button
          onClick={() => generate.mutate(customerId)}
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
        <EmptyState
          title="No Pending Recommendations"
          description="Click Generate to produce new AI-driven product recommendations based on customer behaviour."
          icon={Brain}
        />
      ) : (
        <div className="space-y-3">
          {pending.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{rec.recommendedProduct.replace(/_/g, ' ')}</span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-semibold">
                    Score: {Number(rec.score).toFixed(0)}
                  </span>
                  <StatusBadge status={recTypeLabel[rec.recommendationType] || rec.recommendationType} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{rec.reason}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => respond.mutate({ id: rec.id, customerId, accepted: true })}
                  disabled={respond.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3" /> Accept
                </button>
                <button
                  onClick={() => respond.mutate({ id: rec.id, customerId, accepted: false })}
                  disabled={respond.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All recommendations history */}
      {recs.length > pending.length && (
        <div className="mt-6">
          <p className="text-sm font-medium mb-3">Recommendation History</p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Score</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Responded</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recs.filter((r) => r.status !== 'PENDING').map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 text-sm">{rec.recommendedProduct.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-xs">{recTypeLabel[rec.recommendationType] || rec.recommendationType}</td>
                    <td className="px-4 py-2 text-sm tabular-nums">{Number(rec.score).toFixed(0)}</td>
                    <td className="px-4 py-2"><StatusBadge status={rec.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {rec.respondedAt ? formatRelative(rec.respondedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Models Tab ------------------------------------------------------------------

const MODEL_TYPE_LABELS: Record<string, string> = {
  CHURN_PREDICTION:      'Churn Prediction',
  CROSS_SELL_PROPENSITY: 'Cross-Sell Propensity',
  CREDIT_BEHAVIOR:       'Credit Behaviour',
  CHANNEL_PREFERENCE:    'Channel Preference',
  LIFECYCLE_STAGE:       'Lifecycle Stage',
  CLV_PREDICTION:        'CLV Prediction',
  FRAUD_PROPENSITY:      'Fraud Propensity',
  ENGAGEMENT_SCORE:      'Engagement Score',
  DORMANCY_RISK:         'Dormancy Risk',
  PRODUCT_AFFINITY:      'Product Affinity',
};

const SCORE_BAND_COLOR: Record<string, string> = {
  VERY_HIGH: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
  HIGH:      'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800',
  MEDIUM:    'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
  LOW:       'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
  VERY_LOW:  'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
};

function ModelCard({ model }: { model: CustomerBehaviorModel }) {
  const bandColor = SCORE_BAND_COLOR[model.scoreBand] ?? 'text-muted-foreground bg-muted border-border';
  const featureEntries = model.featureImportance
    ? Object.entries(model.featureImportance as Record<string, number>)
        .filter(([, v]) => typeof v === 'number')
        .sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold">{MODEL_TYPE_LABELS[model.modelType] ?? model.modelType}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{model.modelCode}</p>
        </div>
        <div className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold tabular-nums', bandColor)}>
          {Number(model.score).toFixed(1)} / 100
          <span className="ml-1.5 font-medium opacity-75">{model.scoreBand?.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p className="font-medium tabular-nums">{Number(model.confidencePct).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Predicted Outcome</p>
          <p className="font-medium truncate">{model.predictedOutcome || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Probability</p>
          <p className="font-medium tabular-nums">
            {model.predictedProbability != null
              ? `${(Number(model.predictedProbability) * 100).toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valid Until</p>
          <p className="font-medium">{model.validUntil ? formatDate(model.validUntil) : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Scored At</p>
          <p className="font-medium">{formatDateTime(model.scoredAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Version</p>
          <p className="font-medium font-mono">{model.modelVersion}</p>
        </div>
      </div>

      {/* Recommended action */}
      {model.recommendedAction && (
        <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
          <p className="text-xs font-medium text-primary">Recommended Action</p>
          <p className="text-xs text-muted-foreground mt-0.5">{model.recommendedAction}</p>
        </div>
      )}

      {/* Feature importance mini-bars */}
      {featureEntries.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Feature Importance</p>
          <div className="space-y-1.5">
            {featureEntries.slice(0, 5).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-36 text-muted-foreground truncate capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, val * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums">{(val * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModelsTab({ customerId }: { customerId: number }) {
  const { data: models = [], isLoading } = useCustomerBehaviorModels(customerId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <EmptyState
        title="No Behaviour Models"
        description="Generate product recommendations first — the system automatically computes and persists Churn Prediction, Engagement Score, and Cross-Sell Propensity models as a side-effect."
        icon={Cpu}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Customer Behaviour Models</p>
        <p className="text-xs text-muted-foreground">
          AI-scored behavioural models for customer #{customerId} — refreshed automatically when
          recommendations are generated.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {models.map((m) => (
          <ModelCard key={m.id} model={m} />
        ))}
      </div>
    </div>
  );
}

// ---- Events Tab ------------------------------------------------------------------

const eventColumns: ColumnDef<CustomerBehaviourEvent>[] = [
  {
    accessorKey: 'customerId',
    header: 'Customer ID',
    cell: ({ getValue }) => <span className="font-mono text-xs">#{String(getValue())}</span>,
  },
  {
    accessorKey: 'eventType',
    header: 'Event Type',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    cell: ({ getValue }) => <span className="text-sm">{String(getValue())}</span>,
  },
  {
    accessorKey: 'deviceType',
    header: 'Device',
    cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{String(getValue() || '—')}</span>,
  },
  {
    accessorKey: 'geoLocation',
    header: 'Location',
    cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{String(getValue() || '—')}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Timestamp',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{formatDateTime(String(getValue()))}</span>
    ),
  },
];

function EventsTab() {
  const { data: events = [], isLoading } = useBehaviourEvents();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Customer Behaviour Events</p>
        <p className="text-xs text-muted-foreground">
          All tracked customer interactions — logins, transactions, product views, complaints, and churn signals.
        </p>
      </div>
      <DataTable
        columns={eventColumns}
        data={events}
        isLoading={isLoading}
        enableGlobalFilter
      />
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------

export function BehaviourAnalyticsPage() {
  const [customerId, setCustomerId] = useState<number>(1);
  const [inputValue, setInputValue] = useState('1');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setCustomerId(parsed);
    }
  };

  return (
    <>
      <PageHeader
        title="Behaviour Analytics"
        subtitle="Customer event tracking, AI product recommendations, and churn risk scoring"
        backTo="/intelligence"
      />
      <div className="page-container space-y-6">
        {/* Customer selector */}
        <div className="rounded-xl border bg-card p-4">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Customer ID</label>
              <input
                type="number"
                min={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-32 px-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 1"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Search className="w-3.5 h-3.5" /> Analyse
            </button>
          </form>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Customer" value={`#${customerId}`} icon={Users} />
          <StatCard label="Analysis Engine" value="v1.0" icon={Brain} />
          <StatCard label="Event Tracking" value="Real-time" icon={Activity} />
          <StatCard label="ML Models" value="Behaviour" icon={TrendingUp} />
        </div>

        <TabsPage
          syncWithUrl
          tabs={[
            {
              id: 'recommendations',
              label: 'Recommendations',
              content: <RecommendationsTab customerId={customerId} />,
            },
            {
              id: 'churn',
              label: 'Churn Risk',
              content: <ChurnDetails customerId={customerId} />,
            },
            {
              id: 'models',
              label: 'Behaviour Models',
              content: <ModelsTab customerId={customerId} />,
            },
            {
              id: 'events',
              label: 'Event Log',
              content: <EventsTab />,
            },
          ]}
        />
      </div>
    </>
  );
}
