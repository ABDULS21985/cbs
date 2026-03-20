import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, SummaryBar } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useSecurityHoldings, useCouponCalendar } from '../hooks/useTreasuryData';
import {
  useRunBatchAccrual,
  useRunBatchMtm,
  useRunBatchMaturity,
  useRunBatchCoupons,
} from '../../capitalmarkets/hooks/useCapitalMarketsExt';
import type { ColumnDef } from '@tanstack/react-table';
import type { SecurityHolding, CouponEvent } from '../types/treasury';

// ─── Table Columns ──────────────────────────────────────────────────────────

const holdingCols: ColumnDef<SecurityHolding, unknown>[] = [
  { accessorKey: 'isin', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin}</span> },
  { accessorKey: 'securityName', header: 'Name' },
  { accessorKey: 'securityType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.securityType} /> },
  { accessorKey: 'faceValue', header: 'Face Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.faceValue)}</span> },
  { accessorKey: 'bookValue', header: 'Book Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.bookValue)}</span> },
  { accessorKey: 'marketValue', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.marketValue)}</span> },
  { accessorKey: 'couponRate', header: 'Coupon', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.couponRate)}</span> },
  { accessorKey: 'yieldToMaturity', header: 'YTM', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.yieldToMaturity)}</span> },
  { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => formatDate(row.original.maturityDate) },
  { accessorKey: 'duration', header: 'Duration', cell: ({ row }) => <span className="font-mono text-sm">{row.original.duration.toFixed(1)}y</span> },
  { accessorKey: 'unrealizedPnl', header: 'P&L', cell: ({ row }) => <span className={cn('font-mono text-sm font-medium', row.original.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(row.original.unrealizedPnl)}</span> },
];

const couponCols: ColumnDef<CouponEvent, unknown>[] = [
  { accessorKey: 'eventDate', header: 'Date', cell: ({ row }) => formatDate(row.original.eventDate) },
  { accessorKey: 'securityName', header: 'Security' },
  { accessorKey: 'eventType', header: 'Event', cell: ({ row }) => <StatusBadge status={row.original.eventType} /> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

// ─── Batch Operation Card ────────────────────────────────────────────────────

function BatchOperationCard({
  title,
  description,
  lastRun,
  extraInfo,
  onRun,
  isPending,
}: {
  title: string;
  description: string;
  lastRun?: string;
  extraInfo?: string;
  onRun: () => void;
  isPending: boolean;
}) {
  const [completed, setCompleted] = useState(false);

  const handleRun = () => {
    setCompleted(false);
    onRun();
  };

  useEffect(() => {
    if (!isPending && completed) return;
    if (!isPending) setCompleted(true);
  }, [isPending]);

  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-3">
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {lastRun && (
        <p className="text-xs text-muted-foreground">Last run: <span className="font-medium text-foreground">{lastRun}</span></p>
      )}
      {extraInfo && (
        <p className="text-xs text-muted-foreground">{extraInfo}</p>
      )}
      <button
        onClick={handleRun}
        disabled={isPending}
        className="flex items-center justify-center gap-2 w-full mt-auto py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
        ) : (
          <><Play className="w-4 h-4" /> Run {title}</>
        )}
      </button>
    </div>
  );
}

// ─── Maturity Ladder ─────────────────────────────────────────────────────────

const MATURITY_BUCKETS = ['This Month', '1-3M', '3-6M', '6-12M', '1-2Y', '2-5Y', '5Y+'];

function getMaturityBucket(maturityDate: string): string {
  const today = new Date();
  const maturity = new Date(maturityDate);
  const diffDays = Math.floor((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'This Month';
  if (diffDays <= 90) return '1-3M';
  if (diffDays <= 180) return '3-6M';
  if (diffDays <= 365) return '6-12M';
  if (diffDays <= 730) return '1-2Y';
  if (diffDays <= 1825) return '2-5Y';
  return '5Y+';
}

// ─── Yield Curve ─────────────────────────────────────────────────────────────

const TENOR_ORDER = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];

function getTenorLabel(maturityDate: string): string {
  const today = new Date();
  const maturity = new Date(maturityDate);
  const years = (maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years <= 0.25) return '3M';
  if (years <= 0.75) return '6M';
  if (years <= 1.5) return '1Y';
  if (years <= 2.5) return '2Y';
  if (years <= 4) return '3Y';
  if (years <= 6) return '5Y';
  if (years <= 8.5) return '7Y';
  if (years <= 12.5) return '10Y';
  if (years <= 17.5) return '15Y';
  if (years <= 25) return '20Y';
  return '30Y';
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function FixedIncomePage() {
  useEffect(() => { document.title = 'Fixed Income | CBS'; }, []);

  const { data: holdings = [], isLoading: holdingsLoading } = useSecurityHoldings();
  const { data: coupons = [], isLoading: couponsLoading } = useCouponCalendar();

  const batchAccrual = useRunBatchAccrual();
  const batchMtm = useRunBatchMtm();
  const batchMaturity = useRunBatchMaturity();
  const batchCoupons = useRunBatchCoupons();

  const totalFace = holdings.reduce((s, h) => s + h.faceValue, 0);
  const totalMarket = holdings.reduce((s, h) => s + h.marketValue, 0);
  const avgYield = holdings.length > 0 ? holdings.reduce((s, h) => s + h.yieldToMaturity, 0) / holdings.length : 0;
  const totalUnrealized = holdings.reduce((s, h) => s + h.unrealizedPnl, 0);

  const today = new Date();
  const maturingIn30 = holdings.filter((h) => {
    const diff = (new Date(h.maturityDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  // Maturity ladder data
  const maturityLadderData = useMemo(() => {
    const buckets: Record<string, { couponBearing: number; zeroCoupon: number }> = {};
    MATURITY_BUCKETS.forEach((b) => { buckets[b] = { couponBearing: 0, zeroCoupon: 0 }; });
    holdings.forEach((h) => {
      const bucket = getMaturityBucket(h.maturityDate);
      if (h.couponRate > 0) {
        buckets[bucket].couponBearing += h.faceValue;
      } else {
        buckets[bucket].zeroCoupon += h.faceValue;
      }
    });
    return MATURITY_BUCKETS.map((b) => ({ bucket: b, ...buckets[b] }));
  }, [holdings]);

  // Yield curve data
  const yieldCurveData = useMemo(() => {
    const byTenor: Record<string, { yields: number[]; count: number }> = {};
    holdings.filter((h) => h.status === 'ACTIVE' && h.yieldToMaturity > 0).forEach((h) => {
      const tenor = getTenorLabel(h.maturityDate);
      if (!byTenor[tenor]) byTenor[tenor] = { yields: [], count: 0 };
      byTenor[tenor].yields.push(h.yieldToMaturity);
      byTenor[tenor].count++;
    });
    return TENOR_ORDER
      .filter((t) => byTenor[t])
      .map((tenor) => ({
        tenor,
        yield: byTenor[tenor].yields.reduce((s, y) => s + y, 0) / byTenor[tenor].count,
      }));
  }, [holdings]);

  return (
    <>
      <PageHeader title="Fixed Income Operations" subtitle="Bond portfolio management, batch operations, maturity ladder" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Holdings" value={holdings.length} format="number" icon={Landmark} />
          <StatCard label="Total Face Value" value={totalFace} format="money" compact icon={Landmark} />
          <StatCard label="Market Value" value={totalMarket} format="money" compact />
          <StatCard label="Avg Yield" value={avgYield} format="percent" icon={TrendingUp} />
          <StatCard label="Maturing < 30d" value={maturingIn30.length} format="number" icon={Clock} />
        </div>

        <TabsPage syncWithUrl tabs={[
          {
            id: 'holdings',
            label: 'Holdings',
            badge: holdings.length,
            content: (
              <div className="p-4">
                <SummaryBar items={[
                  { label: 'Total Face', value: totalFace, format: 'money' },
                  { label: 'Market Value', value: totalMarket, format: 'money' },
                  { label: 'Unrealized P&L', value: totalUnrealized, format: 'money', color: totalUnrealized >= 0 ? 'success' : 'danger' },
                ]} />
                <div className="mt-2">
                  <DataTable columns={holdingCols} data={holdings} isLoading={holdingsLoading} enableGlobalFilter enableExport exportFilename="fixed-income-holdings" />
                </div>
              </div>
            ),
          },
          {
            id: 'maturity-ladder',
            label: 'Maturity Ladder',
            content: (
              <div className="p-6 space-y-6">
                <div className="rounded-lg border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-4">Maturity Profile by Bucket</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maturityLadderData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `${(v / 1_000_000_000).toFixed(1)}B`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => formatMoney(v)} />
                        <Legend />
                        <Bar dataKey="couponBearing" name="Coupon Bearing" stackId="stack" fill="#3b82f6" />
                        <Bar dataKey="zeroCoupon" name="Zero Coupon" stackId="stack" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Upcoming maturities (next 90d) */}
                {maturingIn30.length > 0 && (
                  <div className="rounded-lg border bg-card p-5">
                    <h3 className="text-sm font-semibold mb-3">Upcoming Maturities (Next 30 days)</h3>
                    <div className="space-y-2">
                      {maturingIn30.map((h) => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">{h.securityName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{h.isin} · {formatDate(h.maturityDate)}</p>
                          </div>
                          <span className="font-mono text-sm font-semibold">{formatMoney(h.faceValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: 'batch',
            label: 'Batch Operations',
            content: (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <BatchOperationCard
                    title="Daily Accrual"
                    description="Calculate daily interest accrual for all active holdings"
                    lastRun="Today"
                    onRun={() => batchAccrual.mutate()}
                    isPending={batchAccrual.isPending}
                  />
                  <BatchOperationCard
                    title="Coupon Processing"
                    description="Process due coupon payments and update payment records"
                    lastRun={coupons.length > 0 ? formatDate(coupons[0].eventDate) : undefined}
                    extraInfo={`${coupons.filter((c) => c.eventType === 'COUPON' && c.status === 'PENDING').length} coupons pending`}
                    onRun={() => batchCoupons.mutate()}
                    isPending={batchCoupons.isPending}
                  />
                  <BatchOperationCard
                    title="Mark-to-Market"
                    description="Revalue all holdings at current market prices"
                    extraInfo={`Unrealized P&L: ${formatMoney(totalUnrealized)}`}
                    onRun={() => batchMtm.mutate()}
                    isPending={batchMtm.isPending}
                  />
                  <BatchOperationCard
                    title="Maturity Processing"
                    description="Process matured securities and settle principal"
                    extraInfo={`${maturingIn30.length} maturing within 30 days`}
                    onRun={() => batchMaturity.mutate()}
                    isPending={batchMaturity.isPending}
                  />
                </div>
              </div>
            ),
          },
          {
            id: 'yield-curve',
            label: 'Yield Curve',
            content: (
              <div className="p-6">
                <div className="rounded-lg border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-4">Yield Curve (from Portfolio Holdings)</h3>
                  {yieldCurveData.length >= 2 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yieldCurveData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="tenor" tick={{ fontSize: 11 }} />
                          <YAxis
                            tickFormatter={(v) => `${v.toFixed(1)}%`}
                            tick={{ fontSize: 11 }}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, 'Yield']} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="yield"
                            name="Current Yield"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      Not enough data points to render yield curve. Add more holdings with varying maturities.
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: 'coupons',
            label: 'Coupon Calendar',
            badge: coupons.length,
            content: (
              <div className="p-4">
                <DataTable columns={couponCols} data={coupons} isLoading={couponsLoading} enableGlobalFilter enableExport exportFilename="coupon-calendar" />
              </div>
            ),
          },
        ]} />
      </div>
    </>
  );
}
