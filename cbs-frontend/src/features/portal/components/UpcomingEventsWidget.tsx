import { Calendar, ArrowLeftRight, CreditCard, Landmark, Receipt } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { UpcomingEvent } from '../types/dashboard';

interface UpcomingEventsWidgetProps {
  events: UpcomingEvent[];
}

const EVENT_ICONS: Record<string, typeof Calendar> = {
  SCHEDULED_TRANSFER: ArrowLeftRight,
  BILL_PAYMENT: Receipt,
  CARD_PAYMENT: CreditCard,
  FD_MATURITY: Landmark,
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-blue-50 text-blue-700',
  DUE_SOON: 'bg-amber-50 text-amber-700',
  OVERDUE: 'bg-red-50 text-red-700',
};

export function UpcomingEventsWidget({ events }: UpcomingEventsWidgetProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Upcoming (Next 7 Days)</h3>
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <Calendar className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Nothing upcoming</p>
          <p className="text-xs">No scheduled events in the next 7 days</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">Upcoming (Next 7 Days)</h3>
      <div className="space-y-3">
        {events.map((event, i) => {
          const Icon = EVENT_ICONS[event.type] || Calendar;
          const statusStyle = STATUS_STYLES[event.status] || STATUS_STYLES.PENDING;
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <span className="text-xs font-mono font-medium flex-shrink-0">
                    {formatMoney(event.amount, event.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{formatDate(event.dueDate)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusStyle}`}>
                    {event.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
