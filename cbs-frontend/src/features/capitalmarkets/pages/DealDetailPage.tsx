import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, StatusBadge, DataTable, EmptyState, AuditTimeline } from '@/components/shared';
import { formatMoney, formatDate } from '@/lib/formatters';
import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Plus,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  useCapitalMarketsDeal,
  useInvestorBook,
  useAddInvestor,
  usePriceDeal,
  useAllotDeal,
  useSettleDeal,
} from '../hooks/useCapitalMarkets';
import type {
  CapitalMarketsDeal,
  Investor,
  InvestorInput,
  PricingInput,
  DealStatus,
} from '../api/capitalMarketsApi';

// ─── Deal Status Timeline ─────────────────────────────────────────────────────

const ALL_STAGES: DealStatus[] = [
  'ORIGINATION',
  'STRUCTURING',
  'MARKETING',
  'PRICING',
  'ALLOTMENT',
  'SETTLED',
];

function StatusTimeline({ status }: { status: DealStatus }) {
  const currentIdx = ALL_STAGES.indexOf(status);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ALL_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage} className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : done
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {stage}
            </span>
            {i < ALL_STAGES.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Investor Form ────────────────────────────────────────────────────────

function AddInvestorForm({
  dealId,
  onClose,
}: {
  dealId: number;
  onClose: () => void;
}) {
  const addInvestor = useAddInvestor(dealId);
  const [form, setForm] = useState<InvestorInput>({ name: '', bidAmount: 0, bidPrice: undefined });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addInvestor.mutate(form, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Add Investor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Investor Name</label>
            <input
              className="w-full mt-1 input"
              placeholder="Investor name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Bid Amount</label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="0"
              value={form.bidAmount || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, bidAmount: parseFloat(e.target.value) || 0 }))
              }
              required
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Bid Price <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="0.00"
              value={form.bidPrice ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bidPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                }))
              }
              step="0.01"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={addInvestor.isPending} className="btn-primary">
              {addInvestor.isPending ? 'Adding...' : 'Add Investor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pricing Form ─────────────────────────────────────────────────────────────

function PricingForm({ deal, onClose }: { deal: CapitalMarketsDeal; onClose: () => void }) {
  const priceDeal = usePriceDeal();
  const [form, setForm] = useState<PricingInput>({
    finalPrice: 0,
    yieldRate: 0,
    allotmentDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    priceDeal.mutate({ code: deal.code, input: form }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Execute Pricing</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Final Price</label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="0.00"
              value={form.finalPrice || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, finalPrice: parseFloat(e.target.value) || 0 }))
              }
              required
              step="0.01"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Yield Rate (%)</label>
            <input
              type="number"
              className="w-full mt-1 input"
              placeholder="0.00"
              value={form.yieldRate || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, yieldRate: parseFloat(e.target.value) || 0 }))
              }
              required
              step="0.01"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Allotment Date</label>
            <input
              type="date"
              className="w-full mt-1 input"
              value={form.allotmentDate}
              onChange={(e) => setForm((f) => ({ ...f, allotmentDate: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={priceDeal.isPending} className="btn-primary">
              {priceDeal.isPending ? 'Pricing...' : 'Execute Pricing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Investor Book Table ──────────────────────────────────────────────────────

const investorColumns: ColumnDef<Investor, any>[] = [
  {
    accessorKey: 'name',
    header: 'Investor',
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'bidAmount',
    header: 'Bid Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatMoney(row.original.bidAmount)}</span>
    ),
  },
  {
    accessorKey: 'bidPrice',
    header: 'Bid Price',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.bidPrice != null ? row.original.bidPrice.toFixed(4) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'allocatedAmount',
    header: 'Allocated',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.allocatedAmount != null
          ? formatMoney(row.original.allocatedAmount)
          : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'allocationStatus',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.allocationStatus ?? 'PENDING'} dot />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Added',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

// ─── Deal Summary Card ────────────────────────────────────────────────────────

function DealSummaryCard({ deal }: { deal: CapitalMarketsDeal }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Deal Code</p>
          <p className="font-mono font-semibold text-lg">{deal.code}</p>
        </div>
        <div className="flex gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              deal.type === 'ECM'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}
          >
            {deal.type}
          </span>
          <StatusBadge status={deal.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Issuer</p>
          <p className="font-medium">{deal.issuer}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Target Amount</p>
          <p className="font-mono font-medium">
            {formatMoney(deal.targetAmount, deal.currency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Currency</p>
          <p className="font-medium">{deal.currency}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tenor</p>
          <p className="font-medium">{deal.tenor}</p>
        </div>
        {deal.finalPrice != null && (
          <div>
            <p className="text-muted-foreground">Final Price</p>
            <p className="font-mono font-medium">{deal.finalPrice.toFixed(4)}</p>
          </div>
        )}
        {deal.yieldRate != null && (
          <div>
            <p className="text-muted-foreground">Yield Rate</p>
            <p className="font-mono font-medium">{deal.yieldRate.toFixed(2)}%</p>
          </div>
        )}
        {deal.coverageRatio != null && (
          <div>
            <p className="text-muted-foreground">Coverage Ratio</p>
            <p className="font-mono font-medium">{deal.coverageRatio.toFixed(2)}x</p>
          </div>
        )}
        {deal.allotmentDate && (
          <div>
            <p className="text-muted-foreground">Allotment Date</p>
            <p className="font-medium">{formatDate(deal.allotmentDate)}</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Deal Progress</p>
        <StatusTimeline status={deal.status} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DealDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const { data: deal, isLoading: dealLoading } = useCapitalMarketsDeal(code);
  const { data: investors = [], isLoading: investorsLoading } = useInvestorBook(
    deal?.id ?? 0,
  );
  const allotDeal = useAllotDeal();
  const settleDeal = useSettleDeal();

  const timelineEvents = deal
    ? [
        { id: '1', action: 'Deal Created', performedBy: deal.leadManager ?? 'System', performedAt: deal.createdAt },
        ...(deal.finalPrice != null
          ? [{ id: '2', action: 'Pricing Executed', performedBy: 'Banker', performedAt: deal.updatedAt }]
          : []),
        ...(deal.status === 'SETTLED'
          ? [{ id: '3', action: 'Deal Settled', performedBy: 'Operations', performedAt: deal.settlementDate ?? deal.updatedAt }]
          : []),
      ]
    : [];

  if (dealLoading) {
    return (
      <>
        <PageHeader title="Deal Detail" backTo="/capital-markets" />
        <div className="page-container">
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
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

  return (
    <>
      {showAddInvestor && deal && (
        <AddInvestorForm dealId={deal.id} onClose={() => setShowAddInvestor(false)} />
      )}
      {showPricing && deal && (
        <PricingForm deal={deal} onClose={() => setShowPricing(false)} />
      )}

      <PageHeader
        title={`Deal: ${deal.code}`}
        subtitle={`${deal.issuer} · ${deal.type} · ${deal.currency}`}
        backTo="/capital-markets"
        actions={
          <div className="flex items-center gap-2">
            {deal.status === 'MARKETING' && (
              <button
                onClick={() => setShowAddInvestor(true)}
                className="flex items-center gap-1.5 btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Investor
              </button>
            )}
            {deal.status === 'PRICING' && (
              <button
                onClick={() => setShowPricing(true)}
                className="flex items-center gap-1.5 btn-primary text-sm"
              >
                <BarChart3 className="w-4 h-4" />
                Execute Pricing
              </button>
            )}
            {deal.status === 'ALLOTMENT' && (
              <button
                onClick={() => allotDeal.mutate(deal.code)}
                disabled={allotDeal.isPending}
                className="flex items-center gap-1.5 btn-primary text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {allotDeal.isPending ? 'Allotting...' : 'Execute Allotment'}
              </button>
            )}
            {(deal.status === 'ALLOTMENT' || deal.status === 'PRICING') && (
              <button
                onClick={() => settleDeal.mutate(deal.code)}
                disabled={settleDeal.isPending}
                className="flex items-center gap-1.5 btn-secondary text-sm"
              >
                {settleDeal.isPending ? 'Settling...' : 'Settle'}
              </button>
            )}
          </div>
        }
      />

      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Target Amount"
            value={deal.targetAmount}
            format="money"
            currency={deal.currency}
            compact
            icon={DollarSign}
          />
          <StatCard
            label="Total Bids"
            value={deal.totalBids ?? investors.length}
            format="number"
            icon={Users}
          />
          <StatCard
            label="Coverage Ratio"
            value={deal.coverageRatio ?? 0}
            format="number"
            icon={BarChart3}
          />
          <StatCard
            label="Fees Earned"
            value={deal.feesEarned ?? 0}
            format="money"
            compact
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DealSummaryCard deal={deal} />

            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Investor Book</h3>
                <span className="text-sm text-muted-foreground">{investors.length} investors</span>
              </div>
              <div className="p-4">
                <DataTable
                  columns={investorColumns}
                  data={investors}
                  isLoading={investorsLoading}
                  enableGlobalFilter
                  emptyMessage="No investors in book yet"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {deal.finalPrice != null && (
              <div className="card p-6">
                <h3 className="font-semibold mb-4">Pricing Summary</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Final Price</dt>
                    <dd className="font-mono font-medium">{deal.finalPrice.toFixed(4)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Yield Rate</dt>
                    <dd className="font-mono font-medium">{deal.yieldRate?.toFixed(2)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Coverage</dt>
                    <dd className="font-mono font-medium">{deal.coverageRatio?.toFixed(2)}x</dd>
                  </div>
                  {deal.allotmentDate && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Allotment Date</dt>
                      <dd className="font-medium">{formatDate(deal.allotmentDate)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <div className="card p-6">
              <h3 className="font-semibold mb-4">Transaction Timeline</h3>
              {timelineEvents.length > 0 ? (
                <AuditTimeline events={timelineEvents} />
              ) : (
                <p className="text-sm text-muted-foreground">No timeline events yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
