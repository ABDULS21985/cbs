import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared';
import { almReportApi, type LiquidityRatio } from '../../api/almReportApi';

interface LiquidityRatioCardsProps {
  asOfDate: string;
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  LCR: 'Liquidity Coverage Ratio — High-quality liquid assets / Net cash outflows over 30 days',
  NSFR: 'Net Stable Funding Ratio — Available stable funding / Required stable funding',
  CRR: 'Cash Reserve Ratio — Mandatory reserves with CBN as % of deposits',
  LDR: 'Loan-to-Deposit Ratio — Total loans / Total deposits',
  'Liquidity Ratio': 'Liquid assets as % of total liabilities',
  'Net Liquidity Gap': 'Cumulative funding gap as % of assets',
};

function RatioBar({ value, limit, status }: { value: number; limit: number; status: LiquidityRatio['status'] }) {
  const isAboveLimit = value >= limit;
  const pct = Math.min(Math.abs((value / limit) * 100), 150);
  const barColor =
    status === 'COMPLIANT' ? 'bg-green-500' :
    status === 'WARNING' ? 'bg-amber-500' :
    'bg-red-500';
  const trackColor =
    status === 'COMPLIANT' ? 'bg-green-100 dark:bg-green-900/20' :
    status === 'WARNING' ? 'bg-amber-100 dark:bg-amber-900/20' :
    'bg-red-100 dark:bg-red-900/20';

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>0</span>
        <span className="flex items-center gap-1">
          Limit: <span className="font-medium text-foreground">{limit}{isAboveLimit ? '' : '%'}</span>
        </span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden w-full', trackColor)}>
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function RatioCard({ ratio }: { ratio: LiquidityRatio }) {
  const statusMap: Record<LiquidityRatio['status'], string> = {
    COMPLIANT: 'COMPLIANT',
    WARNING: 'WARNING',
    BREACH: 'BREACH',
  };

  const valueColor =
    ratio.status === 'COMPLIANT' ? 'text-green-600 dark:text-green-400' :
    ratio.status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  const borderColor =
    ratio.status === 'COMPLIANT' ? 'border-green-200 dark:border-green-800' :
    ratio.status === 'WARNING' ? 'border-amber-200 dark:border-amber-700' :
    'border-red-200 dark:border-red-800';

  return (
    <div className={cn('surface-card p-4', borderColor)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <p className="text-sm font-semibold">{ratio.metric}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{STATUS_DESCRIPTIONS[ratio.metric] || ratio.metric}</p>
        </div>
        <StatusBadge status={statusMap[ratio.status]} />
      </div>
      <div className="flex items-end gap-1 mt-3">
        <span className={cn('text-3xl font-bold tabular-nums', valueColor)}>
          {ratio.value.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground mb-1">{ratio.unit}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Regulatory minimum: <span className="font-medium text-foreground">{ratio.limit}{ratio.unit}</span>
      </p>
      <RatioBar value={ratio.value} limit={ratio.limit} status={ratio.status} />
    </div>
  );
}

export function LiquidityRatioCards({ asOfDate }: LiquidityRatioCardsProps) {
  const { data: ratios = [], isLoading } = useQuery({
    queryKey: ['liquidity-ratios', asOfDate],
    queryFn: () => almReportApi.getLiquidityRatios(asOfDate),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="surface-card p-4 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-8 w-20 bg-muted rounded mt-3" />
            <div className="h-2 w-full bg-muted rounded mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Regulatory Liquidity Metrics</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ratios.map((ratio) => (
          <RatioCard key={ratio.metric} ratio={ratio} />
        ))}
      </div>
    </div>
  );
}
