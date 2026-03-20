import { StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { BankPortfolio } from '../../types/bankPortfolio';

export function BankPortfolioCard({ portfolio }: { portfolio: BankPortfolio }) {
  return (
    <div className="card p-5 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{portfolio.portfolioName}</p>
          <p className="text-xs text-muted-foreground font-mono">{portfolio.portfolioCode}</p>
        </div>
        <StatusBadge status={portfolio.portfolioType} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="font-mono font-semibold">{formatMoney(portfolio.totalValue, portfolio.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Unrealized P&L</p>
          <p className={cn('font-mono font-semibold', portfolio.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600')}>{formatMoney(portfolio.unrealizedPnl, portfolio.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">YTM</p>
          <p className="font-mono">{portfolio.yieldToMaturity?.toFixed(2) ?? '—'}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="font-mono">{portfolio.modifiedDuration?.toFixed(2) ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
