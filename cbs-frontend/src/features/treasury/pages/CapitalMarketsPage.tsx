import { useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { TrendingUp, Briefcase, CheckCircle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type DealStage = 'PIPELINE' | 'MANDATED' | 'BOOKBUILDING' | 'ALLOCATED' | 'CLOSED';
type DealType = 'EQUITY' | 'BOND' | 'SUKUK' | 'MTN' | 'IPO' | 'RIGHTS';

interface CapitalMarketsDeal {
  id: number;
  name: string;
  type: DealType;
  issuer: string;
  targetAmount: number;
  stage: DealStage;
  leadManager: string;
  pricingDate?: string;
  currency: string;
  bookrunner?: string;
  yieldOrPrice?: string;
}

// ─── Backend → Frontend Mapping ───────────────────────────────────────────────

/** Maps backend CapitalMarketDeal entity fields to the frontend CapitalMarketsDeal interface */
const BACKEND_STATUS_TO_STAGE: Record<string, DealStage> = {
  PIPELINE: 'PIPELINE',
  MANDATE: 'MANDATED', MANDATED: 'MANDATED',
  BOOKBUILD: 'BOOKBUILDING', BOOKBUILDING: 'BOOKBUILDING',
  ALLOCATED: 'ALLOCATED',
  CLOSED: 'CLOSED', SETTLED: 'CLOSED', CANCELLED: 'CLOSED',
};

function mapCapitalMarketsDeal(raw: Record<string, any>): CapitalMarketsDeal {
  return {
    id: raw.id ?? 0,
    name: raw.dealCode ?? String(raw.dealType ?? 'Deal'),
    type: (raw.dealType as DealType) ?? 'BOND',
    issuer: raw.issuerName ?? '',
    targetAmount: Number(raw.targetAmount ?? 0),
    stage: BACKEND_STATUS_TO_STAGE[raw.status?.toUpperCase?.()] ?? 'PIPELINE',
    leadManager: raw.ourRole ?? '',
    pricingDate: raw.pricingDate,
    currency: raw.currency ?? 'NGN',
    bookrunner: undefined,
    yieldOrPrice: raw.issuePrice != null ? String(raw.issuePrice) : undefined,
  };
}

// ─── Stage Config ─────────────────────────────────────────────────────────────

const STAGES: { id: DealStage; label: string; color: string; headerBg: string }[] = [
  { id: 'PIPELINE',     label: 'Pipeline',     color: 'text-slate-600',   headerBg: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'MANDATED',     label: 'Mandated',     color: 'text-blue-600',    headerBg: 'bg-blue-50 dark:bg-blue-900/30' },
  { id: 'BOOKBUILDING', label: 'Book Building', color: 'text-violet-600',  headerBg: 'bg-violet-50 dark:bg-violet-900/30' },
  { id: 'ALLOCATED',    label: 'Allocated',    color: 'text-amber-600',   headerBg: 'bg-amber-50 dark:bg-amber-900/30' },
  { id: 'CLOSED',       label: 'Closed',       color: 'text-green-600',   headerBg: 'bg-green-50 dark:bg-green-900/30' },
];

const TYPE_COLORS: Record<DealType, string> = {
  EQUITY:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  BOND:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  SUKUK:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  MTN:     'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  IPO:     'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  RIGHTS:  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({ deal }: { deal: CapitalMarketsDeal }) {
  return (
    <div className="surface-card p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{deal.name}</p>
        <span className={cn('shrink-0 text-xs font-medium px-1.5 py-0.5 rounded', TYPE_COLORS[deal.type])}>
          {deal.type}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{deal.issuer}</p>
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-xs font-mono font-semibold">{deal.currency} {formatMoney(deal.targetAmount)}</span>
        {deal.pricingDate && (
          <span className="text-xs text-muted-foreground">Pricing: {formatDate(deal.pricingDate)}</span>
        )}
      </div>
      {deal.leadManager && (
        <p className="text-xs text-muted-foreground truncate">
          Lead: <span className="text-foreground font-medium">{deal.leadManager}</span>
        </p>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
}: {
  stage: (typeof STAGES)[number];
  deals: CapitalMarketsDeal[];
}) {
  const totalValue = deals.reduce((s, d) => s + d.targetAmount, 0);

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      <div className={cn('rounded-t-lg px-3 py-2.5 border border-b-0', stage.headerBg)}>
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-semibold uppercase tracking-wider', stage.color)}>
            {stage.label}
          </span>
          <span className="text-xs bg-background rounded-full px-1.5 py-0.5 border font-mono">
            {deals.length}
          </span>
        </div>
        {deals.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {formatMoney(totalValue)}
          </p>
        )}
      </div>
      <div className="flex-1 rounded-b-lg border border-t-0 bg-muted/20 p-2 space-y-2 min-h-[120px]">
        {deals.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
            No deals
          </div>
        ) : (
          deals.map((d) => <DealCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CapitalMarketsPage() {
  useEffect(() => { document.title = 'Capital Markets | CBS'; }, []);
  const { data: deals = [], isLoading, isError } = useQuery({
    queryKey: ['treasury', 'capital-markets', 'deals'],
    queryFn: async () => {
      const raw = await apiGet<any[]>('/api/v1/capital-markets/deals');
      return (Array.isArray(raw) ? raw : []).map(mapCapitalMarketsDeal);
    },
    staleTime: 30_000,
  });

  const byStage = useMemo(() => {
    const map = new Map<DealStage, CapitalMarketsDeal[]>(STAGES.map((s) => [s.id, []]));
    deals.forEach((d) => map.get(d.stage)?.push(d));
    return map;
  }, [deals]);

  const pipelineValue = deals
    .filter((d) => d.stage !== 'CLOSED')
    .reduce((s, d) => s + d.targetAmount, 0);
  const activeMandates = deals.filter((d) =>
    ['MANDATED', 'BOOKBUILDING', 'ALLOCATED'].includes(d.stage),
  ).length;
  const closedYtd = deals.filter((d) => d.stage === 'CLOSED').length;

  return (
    <>
      <PageHeader
        title="Capital Markets"
        subtitle="Deal pipeline — PIPELINE → MANDATED → BOOKBUILDING → ALLOCATED → CLOSED"
      />
      <div className="page-container space-y-6">
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load capital-markets deals from the backend.
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pipeline Value"
            value={pipelineValue}
            format="money"
            compact
            icon={DollarSign}
            loading={isLoading}
          />
          <StatCard
            label="Active Deals"
            value={deals.filter((d) => d.stage !== 'CLOSED').length}
            format="number"
            icon={Briefcase}
            loading={isLoading}
          />
          <StatCard
            label="Active Mandates"
            value={activeMandates}
            format="number"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Closed YTD"
            value={closedYtd}
            format="number"
            icon={CheckCircle}
            loading={isLoading}
          />
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-5 gap-3">
            {STAGES.map((s) => (
              <div key={s.id} className="rounded-lg border bg-muted/30 h-64 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {STAGES.map((stage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  deals={byStage.get(stage.id) ?? []}
                />
              ))}
            </div>
          </div>
        )}

        {/* Deal Detail Table (collapsed view) */}
        {deals.length > 0 && (
          <div className="surface-card">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-semibold">All Deals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Flat list view of all {deals.length} deals</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {['Deal Name','Type','Issuer','Size','Stage','Lead Manager','Pricing'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{deal.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', TYPE_COLORS[deal.type])}>{deal.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{deal.issuer}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{deal.currency} {formatMoney(deal.targetAmount)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={deal.stage} dot /></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{deal.leadManager}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{deal.pricingDate ? formatDate(deal.pricingDate) : '—'}</td>
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
