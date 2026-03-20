import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate, formatRelative } from '@/lib/formatters';
import { StatusBadge } from '@/components/shared';
import {
  Wallet, CreditCard, HandCoins, ArrowLeftRight, Headphones,
  FileText, Shield, Clock, Filter,
} from 'lucide-react';
import { useCustomerTimeline } from '../hooks/useCustomerIntelligence';
import type { TimelineEvent } from '../types/customer';

const MODULE_ICONS: Record<string, typeof Wallet> = {
  ACCOUNT: Wallet,
  LOAN: HandCoins,
  CARD: CreditCard,
  PAYMENT: ArrowLeftRight,
  CASE: Headphones,
  COMMUNICATION: FileText,
  KYC: Shield,
};

const MODULE_COLORS: Record<string, string> = {
  ACCOUNT: 'bg-blue-500',
  LOAN: 'bg-green-500',
  CARD: 'bg-purple-500',
  PAYMENT: 'bg-amber-500',
  CASE: 'bg-red-500',
  COMMUNICATION: 'bg-cyan-500',
  KYC: 'bg-teal-500',
};

const EVENT_TYPES = ['ALL', 'ACCOUNT', 'LOAN', 'CARD', 'PAYMENT', 'CASE', 'COMMUNICATION', 'KYC'];

function groupByDate(events: TimelineEvent[]): { label: string; events: TimelineEvent[] }[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];

  const groups = new Map<string, TimelineEvent[]>();

  events.forEach((e) => {
    const date = e.timestamp.split('T')[0];
    let label: string;
    if (date === today) label = 'Today';
    else if (date === yesterday) label = 'Yesterday';
    else if (date >= weekAgo) label = 'This Week';
    else label = formatDate(date);

    const existing = groups.get(label) ?? [];
    existing.push(e);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }));
}

interface CustomerTimelineProps {
  customerId: number;
}

export function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const [eventFilter, setEventFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const params = {
    page,
    size: 50,
    ...(eventFilter !== 'ALL' ? { eventType: eventFilter } : {}),
  };

  const {
    data: events = [],
    isLoading,
    isError,
  } = useCustomerTimeline(customerId, params);

  const grouped = useMemo(() => groupByDate(events), [events]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Customer timeline events could not be loaded from the backend.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { setEventFilter(type); setPage(0); }}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
              eventFilter === type
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card hover:bg-muted/40',
            )}
          >
            {type === 'ALL' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No timeline events found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{group.label}</p>
              <div className="space-y-1">
                {group.events.map((event) => {
                  const Icon = MODULE_ICONS[event.module] || Clock;
                  const dotColor = MODULE_COLORS[event.module] || 'bg-gray-500';
                  return (
                    <div key={event.id} className="flex items-start gap-3 py-2 border-b border-dashed last:border-0">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white', dotColor)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.status && <StatusBadge status={event.status} size="sm" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                        {event.amount != null && (
                          <p className="text-xs font-mono font-medium mt-0.5">
                            {formatMoney(event.amount, event.currency)}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatRelative(event.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {events.length >= 50 && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-2 text-xs text-primary hover:underline"
            >
              Load more events...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
