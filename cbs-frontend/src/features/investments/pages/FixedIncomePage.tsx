import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, DataTable, StatusBadge, TabsPage } from '@/components/shared';
import { formatMoney, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { TrendingUp, DollarSign, Clock, BarChart3, Layers, Calendar } from 'lucide-react';
import { fixedIncomeApi, type BondHolding } from '../api/fixedIncomeApi';
import { MaturityLadderChart } from '../components/fixedincome/MaturityLadderChart';
import { YieldCurveChart } from '../components/fixedincome/YieldCurveChart';
import { BatchOperationsPanel } from '../components/fixedincome/BatchOperationsPanel';

export function FixedIncomePage() {
  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ['fi-holdings'],
    queryFn: () => fixedIncomeApi.getHoldings(),
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const totalFace = holdings.reduce((s, h) => s + h.faceValue, 0);
    const totalMarket = holdings.reduce((s, h) => s + (h.mtmValue || h.faceValue), 0);
    const totalAccrued = holdings.reduce((s, h) => s + h.accruedInterest, 0);
    const avgYtm = holdings.length > 0 ? holdings.reduce((s, h) => s + (h.purchaseYield || 0), 0) / holdings.length : 0;
    const today = Date.now();
    const maturing30d = holdings.filter((h) => {
      const days = Math.ceil((new Date(h.maturityDate).getTime() - today) / 86400000);
      return days > 0 && days <= 30;
    }).length;
    return { count: holdings.length, totalFace, totalMarket, totalAccrued, avgYtm, maturing30d };
  }, [holdings]);

  const holdingCols: ColumnDef<BondHolding, unknown>[] = [
    { accessorKey: 'isinCode', header: 'ISIN', cell: ({ row }) => <span className="font-mono text-xs">{row.original.isinCode || '—'}</span> },
    { accessorKey: 'securityName', header: 'Instrument', cell: ({ row }) => <span className="text-sm font-medium truncate max-w-[180px] block">{row.original.securityName}</span> },
    { accessorKey: 'issuerName', header: 'Issuer', cell: ({ row }) => <span className="text-xs">{row.original.issuerName}</span> },
    { accessorKey: 'faceValue', header: 'Face Value', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.faceValue, row.original.currencyCode)}</span> },
    { accessorKey: 'mtmValue', header: 'Market Value', cell: ({ row }) => <span className="font-mono text-sm tabular-nums">{formatMoney(row.original.mtmValue || row.original.faceValue, row.original.currencyCode)}</span> },
    { accessorKey: 'couponRate', header: 'Coupon', cell: ({ row }) => <span className="font-mono text-sm">{formatPercent(row.original.couponRate)}</span> },
    { accessorKey: 'purchaseYield', header: 'YTM', cell: ({ row }) => <span className="font-mono text-sm">{row.original.purchaseYield ? formatPercent(row.original.purchaseYield) : '—'}</span> },
    { accessorKey: 'maturityDate', header: 'Maturity', cell: ({ row }) => <span className="text-xs">{formatDate(row.original.maturityDate)}</span> },
    { accessorKey: 'accruedInterest', header: 'Accrued Int.', cell: ({ row }) => <span className="font-mono text-xs">{formatMoney(row.original.accruedInterest, row.original.currencyCode)}</span> },
    {
      accessorKey: 'unrealisedGainLoss', header: 'P&L',
      cell: ({ row }) => {
        const v = row.original.unrealisedGainLoss;
        return <span className={cn('font-mono text-xs font-medium', v >= 0 ? 'text-green-600' : 'text-red-600')}>{v >= 0 ? '+' : ''}{formatMoney(v, row.original.currencyCode)}</span>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" /> },
  ];

  const tabs = [
    {
      id: 'holdings', label: 'Holdings', badge: holdings.length || undefined,
      content: <div className="p-4"><DataTable columns={holdingCols} data={holdings} isLoading={isLoading} enableGlobalFilter enableExport exportFilename="bond-holdings" emptyMessage="No bond holdings" /></div>,
    },
    {
      id: 'maturity', label: 'Maturity Ladder',
      content: <div className="p-4"><MaturityLadderChart holdings={holdings} /></div>,
    },
    {
      id: 'yield', label: 'Yield Curve',
      content: <div className="p-4"><YieldCurveChart holdings={holdings} /></div>,
    },
    {
      id: 'batch', label: 'Batch Operations',
      content: <div className="p-4"><BatchOperationsPanel /></div>,
    },
  ];

  return (
    <>
      <PageHeader title="Fixed Income Operations" subtitle="Bond holdings, maturity ladder, yield analysis, and batch operations" />
      <div className="page-container space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Holdings" value={stats.count} format="number" icon={Layers} loading={isLoading} />
          <StatCard label="Face Value" value={stats.totalFace} format="money" compact icon={DollarSign} loading={isLoading} />
          <StatCard label="Market Value" value={stats.totalMarket} format="money" compact icon={BarChart3} loading={isLoading} />
          <StatCard label="Accrued Interest" value={stats.totalAccrued} format="money" compact icon={TrendingUp} loading={isLoading} />
          <StatCard label="Avg YTM" value={stats.avgYtm} format="percent" icon={TrendingUp} loading={isLoading} />
          <StatCard label="Maturing <30d" value={stats.maturing30d} format="number" icon={Clock} loading={isLoading} />
        </div>
        <TabsPage tabs={tabs} syncWithUrl />
      </div>
    </>
  );
}
