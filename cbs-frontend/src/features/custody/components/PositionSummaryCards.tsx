import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { SecuritiesPosition } from '../types/securitiesPosition';

interface PositionSummaryCardsProps {
  positions: SecuritiesPosition[];
  currency?: string;
}

export function PositionSummaryCards({ positions, currency = 'NGN' }: PositionSummaryCardsProps) {
  const totalMarketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const totalCostBasis = positions.reduce((s, p) => s + p.costBasis, 0);
  const totalPnL = positions.reduce((s, p) => s + p.unrealizedGainLoss, 0);
  const totalAccrued = positions.reduce((s, p) => s + p.accruedInterest, 0);
  const pendingSettle = positions.reduce((s, p) => s + p.settlementT0Count + p.settlementT1Count + p.settlementT2Count, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="stat-card">
        <div className="stat-label">Total Holdings</div>
        <div className="stat-value">{positions.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Market Value</div>
        <div className="stat-value text-sm font-mono">{formatMoney(totalMarketValue, currency)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Cost Basis</div>
        <div className="stat-value text-sm font-mono">{formatMoney(totalCostBasis, currency)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Unrealized P&L</div>
        <div className={cn('stat-value text-sm font-mono', totalPnL >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL, currency)}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Accrued Interest</div>
        <div className="stat-value text-sm font-mono">{formatMoney(totalAccrued, currency)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Pending Settle</div>
        <div className={cn('stat-value', pendingSettle > 0 ? 'text-amber-700 dark:text-amber-400' : '')}>{pendingSettle}</div>
      </div>
    </div>
  );
}
