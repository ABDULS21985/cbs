import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import { DealCard } from './DealCard';
import type { CapitalMarketsDeal, DealStatus } from '../../api/capitalMarketsApi';

const STAGES: { key: DealStatus; label: string; color: string }[] = [
  { key: 'ORIGINATION', label: 'Origination', color: 'bg-blue-500' },
  { key: 'STRUCTURING', label: 'Structuring', color: 'bg-indigo-500' },
  { key: 'MARKETING', label: 'Marketing', color: 'bg-amber-500' },
  { key: 'PRICING', label: 'Pricing', color: 'bg-purple-500' },
  { key: 'ALLOTMENT', label: 'Allotment', color: 'bg-emerald-500' },
  { key: 'SETTLED', label: 'Settled', color: 'bg-green-600' },
];

interface KanbanBoardProps {
  deals: CapitalMarketsDeal[];
  loading: boolean;
}

export function KanbanBoard({ deals, loading }: KanbanBoardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-6 gap-3">
        {STAGES.map((s) => (
          <div key={s.key} className="space-y-2">
            <div className="h-8 bg-muted rounded animate-pulse" />
            {[1, 2].map((i) => <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.status === stage.key);
        const totalValue = stageDeals.reduce((s, d) => s + d.targetAmount, 0);

        return (
          <div key={stage.key} className="flex-shrink-0 w-[220px] min-h-[400px]">
            {/* Column header */}
            <div className="sticky top-0 z-10 mb-2">
              <div className={cn('rounded-t-lg px-3 py-2 flex items-center justify-between', stage.color)}>
                <span className="text-xs font-bold text-white uppercase tracking-wide">{stage.label}</span>
                <span className="text-[10px] text-white/80 font-medium">{stageDeals.length}</span>
              </div>
              <div className="px-3 py-1.5 bg-muted/50 rounded-b-lg border border-t-0 text-[10px] text-muted-foreground">
                {formatMoneyCompact(totalValue, 'USD')} &middot; {stageDeals.length} deal{stageDeals.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {stageDeals.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No deals in this stage
                </div>
              ) : (
                stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
