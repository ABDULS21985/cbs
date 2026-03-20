import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { FileText, Users, DollarSign, BarChart3, Check, Clock, AlertCircle } from 'lucide-react';
import type { CapitalMarketsDeal, Investor } from '../../api/capitalMarketsApi';

interface TimelineEvent {
  id: string;
  icon: typeof FileText;
  iconColor: string;
  title: string;
  actor: string;
  timestamp: string;
  detail?: string;
}

interface DealTimelineProps {
  deal: CapitalMarketsDeal;
  investors: Investor[];
}

export function DealTimeline({ deal, investors }: DealTimelineProps) {
  const events: TimelineEvent[] = [];

  events.push({
    id: 'created',
    icon: FileText,
    iconColor: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    title: 'Deal Created (ORIGINATION)',
    actor: deal.leadManager ?? 'System',
    timestamp: deal.createdAt,
    detail: `${deal.type} deal for ${deal.issuer} — Target: ${deal.currency} ${deal.targetAmount.toLocaleString()}`,
  });

  // Investor bids
  investors.forEach((inv) => {
    events.push({
      id: `inv-${inv.id}`,
      icon: Users,
      iconColor: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
      title: `Investor Added: ${inv.name}`,
      actor: 'Book Runner',
      timestamp: inv.createdAt,
      detail: `Bid: ${deal.currency} ${inv.bidAmount.toLocaleString()}${inv.bidPrice != null ? ` at ${inv.bidPrice.toFixed(2)}` : ''}`,
    });
  });

  if (deal.finalPrice != null) {
    events.push({
      id: 'priced',
      icon: BarChart3,
      iconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
      title: 'Pricing Executed',
      actor: 'Banker',
      timestamp: deal.updatedAt,
      detail: `Final Price: ${deal.finalPrice.toFixed(2)} — Yield: ${deal.yieldRate?.toFixed(2)}% — Coverage: ${deal.coverageRatio?.toFixed(2)}x`,
    });
  }

  if (deal.totalAllocated != null && deal.totalAllocated > 0) {
    const allocatedCount = investors.filter((i) => i.allocationStatus === 'ALLOCATED').length;
    events.push({
      id: 'allotted',
      icon: DollarSign,
      iconColor: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      title: 'Allotment Completed',
      actor: 'Operations',
      timestamp: deal.updatedAt,
      detail: `${allocatedCount} investors allocated — Total: ${deal.currency} ${deal.totalAllocated.toLocaleString()}`,
    });
  }

  if (deal.status === 'SETTLED') {
    events.push({
      id: 'settled',
      icon: Check,
      iconColor: 'text-green-700 bg-green-100 dark:bg-green-900/30',
      title: 'Deal Settled',
      actor: 'Operations',
      timestamp: deal.settlementDate ?? deal.updatedAt,
      detail: `Settlement confirmed — Fees earned: ${deal.currency} ${(deal.feesEarned ?? 0).toLocaleString()}`,
    });
  }

  if (deal.status === 'CANCELLED') {
    events.push({
      id: 'cancelled',
      icon: AlertCircle,
      iconColor: 'text-red-600 bg-red-100 dark:bg-red-900/30',
      title: 'Deal Cancelled',
      actor: 'System',
      timestamp: deal.updatedAt,
    });
  }

  // Sort by timestamp desc
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-1">
      {events.map((event, i) => {
        const Icon = event.icon;
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', event.iconColor)}>
                <Icon className="w-4 h-4" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-4 pt-1">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.actor} — {formatDateTime(event.timestamp)}</p>
              {event.detail && <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
