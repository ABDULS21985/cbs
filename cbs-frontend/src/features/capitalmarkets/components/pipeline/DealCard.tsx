import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import type { CapitalMarketsDeal, DealStatus } from '../../api/capitalMarketsApi';

const STAGE_COLORS: Record<DealStatus, string> = {
  ORIGINATION: 'border-l-blue-500',
  STRUCTURING: 'border-l-indigo-500',
  MARKETING: 'border-l-amber-500',
  PRICING: 'border-l-purple-500',
  ALLOTMENT: 'border-l-emerald-500',
  SETTLED: 'border-l-green-600',
  CANCELLED: 'border-l-gray-400',
};

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function DealCard({ deal }: { deal: CapitalMarketsDeal }) {
  const navigate = useNavigate();
  const days = daysSince(deal.createdAt);

  return (
    <div
      onClick={() => navigate(`/capital-markets/${deal.code}`)}
      className={cn(
        'rounded-lg border bg-card p-3 space-y-2 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all border-l-4',
        STAGE_COLORS[deal.status],
      )}
      title={`${deal.issuer} — ${deal.code}\nTotal Bids: ${deal.totalBids ?? 0}\nFees: ${deal.feesEarned ?? 0}`}
    >
      {/* Top: code + type badge */}
      <div className="flex items-center justify-between gap-2">
        <code className="text-[10px] font-mono text-muted-foreground">{deal.code}</code>
        <span className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold',
          deal.type === 'ECM'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        )}>
          {deal.type}
        </span>
      </div>

      {/* Middle: issuer + amount */}
      <div>
        <p className="text-sm font-semibold truncate">{deal.issuer}</p>
        <p className="text-xs text-muted-foreground">{deal.currency} {formatMoneyCompact(deal.targetAmount, deal.currency)}</p>
      </div>

      {/* Bottom: avatar, days, coverage */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {deal.leadManager && (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
              {deal.leadManager.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span>Day {days}</span>
        </div>
        {deal.coverageRatio != null && deal.coverageRatio > 0 && (
          <span className={cn('font-semibold', deal.coverageRatio >= 2 ? 'text-green-600' : deal.coverageRatio >= 1 ? 'text-amber-600' : 'text-red-600')}>
            {deal.coverageRatio.toFixed(1)}x
          </span>
        )}
      </div>
    </div>
  );
}
