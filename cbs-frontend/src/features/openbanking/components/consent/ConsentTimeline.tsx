import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import { Plus, CheckCircle2, Ban, Clock, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ConsentTimelineEvent {
  id: string;
  type: 'created' | 'authorised' | 'revoked' | 'expired' | 'extended' | 'updated';
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
}

interface ConsentTimelineProps {
  events: ConsentTimelineEvent[];
}

const EVENT_CONFIG: Record<string, { icon: LucideIcon; color: string; dotColor: string }> = {
  created: { icon: Plus, color: 'text-blue-600', dotColor: 'bg-blue-500' },
  authorised: { icon: CheckCircle2, color: 'text-green-600', dotColor: 'bg-green-500' },
  revoked: { icon: Ban, color: 'text-red-600', dotColor: 'bg-red-500' },
  expired: { icon: Clock, color: 'text-gray-500', dotColor: 'bg-gray-400' },
  extended: { icon: Clock, color: 'text-purple-600', dotColor: 'bg-purple-500' },
  updated: { icon: AlertTriangle, color: 'text-amber-600', dotColor: 'bg-amber-500' },
};

export function ConsentTimeline({ events }: ConsentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No timeline events
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event, index) => {
        const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.updated;
        const Icon = config.icon;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
            )}

            {/* Dot / Icon */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-card flex-shrink-0',
                config.dotColor,
              )}
            >
              <Icon className="w-3.5 h-3.5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <h4 className={cn('text-sm font-medium', config.color)}>{event.title}</h4>
                {event.actor && (
                  <span className="text-xs text-muted-foreground">by {event.actor}</span>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
              )}
              <p className="text-xs text-muted-foreground/70 mt-1">
                {formatDateTime(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
