import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, EmptyState } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users, DollarSign, TrendingUp, BarChart3, Plus, CheckCircle2,
  ArrowRight, Ban,
} from 'lucide-react';
import {
  useCapitalMarketsDeal,
  useInvestorBook,
  useAllotDeal,
  useSettleDeal,
} from '../hooks/useCapitalMarkets';
import type { DealStatus } from '../api/capitalMarketsApi';
import { DealHeader } from '../components/deal/DealHeader';
import { DealStageProgress } from '../components/deal/DealStageProgress';
import { InvestorBookTable } from '../components/deal/InvestorBookTable';
import { InvestorBidForm } from '../components/deal/InvestorBidForm';
import { PricingWorkflow } from '../components/deal/PricingWorkflow';
import { AllotmentWorkflow } from '../components/deal/AllotmentWorkflow';
import { SettlementPanel } from '../components/deal/SettlementPanel';
import { DealTimeline } from '../components/deal/DealTimeline';
import { PublicOfferingPanel } from '../components/deal/PublicOfferingPanel';
import { DealAnalyticsTab } from '../components/deal/DealAnalyticsTab';

type TabKey = 'investors' | 'pricing' | 'offering' | 'timeline' | 'analytics';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'investors', label: 'Investor Book' },
  { key: 'pricing', label: 'Pricing & Allotment' },
  { key: 'offering', label: 'Public Offering' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'analytics', label: 'Analytics' },
];

export function DealDetailPage() {
  const { id: code = '' } = useParams<{ id: string }>();
  const { data: deal, isLoading: dealLoading } = useCapitalMarketsDeal(code);
  const { data: investors = [], isLoading: investorsLoading } = useInvestorBook(deal?.id ?? 0);
  const allotDeal = useAllotDeal();
  const settleDeal = useSettleDeal();

  const [activeTab, setActiveTab] = useState<TabKey>('investors');
  const [showAddInvestor, setShowAddInvestor] = useState(false);

  if (dealLoading) {
    return (
      <>
        <PageHeader title="Deal Detail" backTo="/capital-markets" />
        <div className="page-container space-y-4">
          <div className="h-24 bg-muted animate-pulse rounded-xl" />
          <div className="h-16 bg-muted animate-pulse rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!deal) {
    return (
      <>
        <PageHeader title="Deal Not Found" backTo="/capital-markets" />
        <div className="page-container">
          <EmptyState title="Deal not found" description="The requested deal could not be found." />
        </div>
      </>
    );
  }

  const totalBids = investors.reduce((s, i) => s + i.bidAmount, 0);
  const coverageRatio = deal.targetAmount > 0 ? totalBids / deal.targetAmount : (deal.coverageRatio ?? 0);
  const coverageColor = coverageRatio >= 2 ? 'text-green-700' : coverageRatio >= 1 ? 'text-amber-700' : 'text-red-700';

  // Contextual action buttons based on stage
  const actionButtons = (
    <div className="flex items-center gap-2 flex-wrap">
      {deal.status === 'MARKETING' && (
        <button onClick={() => setShowAddInvestor(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Investor
        </button>
      )}
      {deal.status === 'PRICING' && (
        <button onClick={() => setActiveTab('pricing')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <BarChart3 className="w-4 h-4" /> Execute Pricing
        </button>
      )}
      {deal.status === 'ALLOTMENT' && (
        <>
          <button
            onClick={() => allotDeal.mutate({ code: deal.code }, { onSuccess: () => toast.success('Allotment executed') })}
            disabled={allotDeal.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> {allotDeal.isPending ? 'Allotting...' : 'Execute Allotment'}
          </button>
          <button
            onClick={() => settleDeal.mutate(deal.code, { onSuccess: () => toast.success('Deal settled') })}
            disabled={settleDeal.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
          >
            {settleDeal.isPending ? 'Settling...' : 'Settle Deal'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      {showAddInvestor && deal && (
        <InvestorBidForm dealId={deal.id} currency={deal.currency} onClose={() => setShowAddInvestor(false)} />
      )}

      <PageHeader title={`Deal: ${deal.code}`} subtitle={deal.issuer} backTo="/capital-markets" />

      <div className="page-container space-y-4">
        {/* Deal Header */}
        <DealHeader deal={deal} actions={actionButtons} />

        {/* Stage Progress Bar */}
        <DealStageProgress status={deal.status} />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="stat-card">
            <div className="stat-label">Target</div>
            <div className="stat-value text-sm font-mono">{formatMoney(deal.targetAmount, deal.currency)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Bids</div>
            <div className="stat-value text-sm font-mono">{formatMoney(totalBids, deal.currency)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cover Ratio</div>
            <div className={cn('stat-value text-sm font-mono', coverageColor)}>{coverageRatio.toFixed(2)}x</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Final Price</div>
            <div className="stat-value text-sm font-mono">{deal.finalPrice != null ? deal.finalPrice.toFixed(2) : '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Yield Rate</div>
            <div className="stat-value text-sm font-mono">{deal.yieldRate != null ? `${deal.yieldRate.toFixed(2)}%` : '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fees Earned</div>
            <div className="stat-value text-sm font-mono text-green-700">{formatMoney(deal.feesEarned ?? 0, deal.currency)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'investors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{investors.length} Investors</h3>
              {deal.status === 'MARKETING' && (
                <button onClick={() => setShowAddInvestor(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted">
                  <Plus className="w-4 h-4" /> Add Investor
                </button>
              )}
            </div>
            <InvestorBookTable
              investors={investors}
              isLoading={investorsLoading}
              targetAmount={deal.targetAmount}
              currency={deal.currency}
            />
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Pricing */}
            <div className="surface-card p-5">
              <h3 className="font-semibold mb-4">Pricing</h3>
              <PricingWorkflow deal={deal} investors={investors} />
            </div>

            {/* Allotment */}
            <div className="surface-card p-5">
              <h3 className="font-semibold mb-4">Allotment</h3>
              <AllotmentWorkflow deal={deal} investors={investors} />
            </div>

            {/* Settlement */}
            <div className="surface-card p-5">
              <h3 className="font-semibold mb-4">Settlement</h3>
              <SettlementPanel deal={deal} investors={investors} />
            </div>
          </div>
        )}

        {activeTab === 'offering' && (
          <PublicOfferingPanel dealId={deal.id} currency={deal.currency} />
        )}

        {activeTab === 'timeline' && (
          <div className="surface-card p-5">
            <h3 className="font-semibold mb-4">Deal Timeline</h3>
            <DealTimeline deal={deal} investors={investors} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <DealAnalyticsTab deal={deal} investors={investors} />
        )}
      </div>
    </>
  );
}
