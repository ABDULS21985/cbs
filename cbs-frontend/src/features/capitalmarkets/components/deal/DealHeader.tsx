import { StatusBadge } from '@/components/shared';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CapitalMarketsDeal, DealStatus } from '../../api/capitalMarketsApi';

interface DealHeaderProps {
  deal: CapitalMarketsDeal;
  actions?: React.ReactNode;
}

export function DealHeader({ deal, actions }: DealHeaderProps) {
  const settled = deal.status === 'SETTLED';

  return (
    <div className={cn('rounded-xl border p-5', settled ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-card')}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{deal.issuer}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{deal.code}</span>
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-semibold',
              deal.type === 'ECM' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            )}>
              {deal.type}
            </span>
            <span>{formatMoney(deal.targetAmount, deal.currency)}</span>
            {deal.tenor && <span>{deal.tenor} Tenor</span>}
            <StatusBadge status={deal.status} />
            {settled && <span className="text-green-600 font-semibold text-xs">COMPLETED</span>}
          </div>
          {deal.leadManager && (
            <p className="text-xs text-muted-foreground">Lead: {deal.leadManager}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
