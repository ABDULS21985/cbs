import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage, SummaryBar } from '@/components/shared';
import { WidgetCard } from '@/features/dashboard/components/WidgetCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Landmark, TrendingUp, Calendar, Clock } from 'lucide-react';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { mockHoldings, mockCoupons } from '../api/mockTreasuryData';
import type { ColumnDef } from '@tanstack/react-table';
import type { SecurityHolding, CouponEvent } from '../types/treasury';

const maturityData = [
  { month: 'Apr', tBills: 8000, fgnBonds: 0, corporate: 0, sukuk: 0 },
  { month: 'May', tBills: 2500, fgnBonds: 0, corporate: 500, sukuk: 0 },
  { month: 'Jun', tBills: 3000, fgnBonds: 0, corporate: 0, sukuk: 800 },
  { month: 'Jul', tBills: 5500, fgnBonds: 0, corporate: 0, sukuk: 0 },
  { month: 'Aug', tBills: 4200, fgnBonds: 0, corporate: 1200, sukuk: 0 },
  { month: 'Sep', tBills: 6000, fgnBonds: 2000, corporate: 0, sukuk: 0 },
];

const holdingCols: ColumnDef<SecurityHolding, any>[] = [
  { accessorKey: 'isin', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isin}</span> },
  { accessorKey: 'securityName', header: 'Name' },
  { accessorKey: 'securityType', header: 'Type', cell: ({ row }) => <StatusBadge status={row.original.securityType} /> },
  { accessorKey: 'faceValue', header: 'Face Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.faceValue)}</span> },
  { accessorKey: 'marketValue', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.marketValue)}</span> },
  { accessorKey: 'couponRate', header: 'Coupon', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.couponRate)}</span> },
  { accessorKey: 'yieldToMaturity', header: 'YTM', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.yieldToMaturity)}</span> },
  { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => formatDate(row.original.maturityDate) },
  { accessorKey: 'duration', header: 'Duration', cell: ({ row }) => <span className="font-mono text-sm">{row.original.duration.toFixed(1)}y</span> },
  { accessorKey: 'unrealizedPnl', header: 'P&L', cell: ({ row }) => <span className={`font-mono text-sm font-medium ${row.original.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatMoney(row.original.unrealizedPnl)}</span> },
];

const couponCols: ColumnDef<CouponEvent, any>[] = [
  { accessorKey: 'eventDate', header: 'Date', cell: ({ row }) => formatDate(row.original.eventDate) },
  { accessorKey: 'securityName', header: 'Security' },
  { accessorKey: 'eventType', header: 'Event', cell: ({ row }) => <StatusBadge status={row.original.eventType} /> },
  { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono text-sm">{formatMoney(row.original.amount)}</span> },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} dot /> },
];

const totalFace = mockHoldings.reduce((s, h) => s + h.faceValue, 0);
const totalMarket = mockHoldings.reduce((s, h) => s + h.marketValue, 0);
const avgYield = mockHoldings.reduce((s, h) => s + h.yieldToMaturity, 0) / mockHoldings.length;
const totalCoupon30d = mockCoupons.filter((c) => c.eventType === 'COUPON').reduce((s, c) => s + c.amount, 0);
const totalMaturing90d = mockCoupons.filter((c) => c.eventType === 'MATURITY').reduce((s, c) => s + c.amount, 0);

export function FixedIncomePage() {
  return (
    <>
      <PageHeader title="Fixed Income & Securities" subtitle="Bond portfolio management, coupon schedule, maturity ladder" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Bond Portfolio" value={totalFace} format="money" compact icon={Landmark} />
          <StatCard label="Market Value" value={totalMarket} format="money" compact />
          <StatCard label="Avg Yield" value={avgYield} format="percent" icon={TrendingUp} />
          <StatCard label="Coupons Due (30d)" value={totalCoupon30d} format="money" compact icon={Calendar} />
          <StatCard label="Maturing (90d)" value={totalMaturing90d} format="money" compact icon={Clock} />
        </div>

        <WidgetCard title="Maturity Ladder (₦M — Next 6 Months)" colSpan={12}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={maturityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v}M`} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="tBills" name="T-Bills" fill="hsl(217, 91%, 60%)" stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="fgnBonds" name="FGN Bonds" fill="hsl(221, 83%, 53%)" stackId="stack" />
              <Bar dataKey="corporate" name="Corporate" fill="hsl(43, 74%, 49%)" stackId="stack" />
              <Bar dataKey="sukuk" name="Sukuk" fill="hsl(142, 71%, 45%)" stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </WidgetCard>

        <TabsPage syncWithUrl tabs={[
          { id: 'holdings', label: 'Holdings', badge: mockHoldings.length, content: (
            <div className="p-4">
              <SummaryBar items={[
                { label: 'Total Face', value: totalFace, format: 'money' },
                { label: 'Market Value', value: totalMarket, format: 'money' },
                { label: 'Unrealized P&L', value: mockHoldings.reduce((s, h) => s + h.unrealizedPnl, 0), format: 'money', color: 'success' },
              ]} />
              <div className="mt-2"><DataTable columns={holdingCols} data={mockHoldings} enableGlobalFilter enableExport exportFilename="fixed-income-holdings" /></div>
            </div>
          )},
          { id: 'coupons', label: 'Coupon Calendar', badge: mockCoupons.length, content: (
            <div className="p-4"><DataTable columns={couponCols} data={mockCoupons} enableGlobalFilter enableExport exportFilename="coupon-calendar" /></div>
          )},
          { id: 'yield', label: 'Yield Curve', content: <div className="p-8 text-center text-muted-foreground">Interactive yield curve visualization coming soon</div> },
          { id: 'repos', label: 'Repos & Lending', content: <div className="p-8 text-center text-muted-foreground">Repo and securities lending tracking coming soon</div> },
        ]} />
      </div>
    </>
  );
}
