import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import type { CallbackRequest } from '../types/contactRouting';

interface CallbackCardProps {
  callback: CallbackRequest;
  onAttempt: (id: number) => void;
}

export function CallbackCard({ callback, onAttempt }: CallbackCardProps) {
  const urgencyColor = callback.urgency === 'HIGH' || callback.urgency === 'URGENT'
    ? 'text-red-600' : callback.urgency === 'NORMAL' ? 'text-amber-600' : 'text-green-600';
  const isPast = new Date(callback.preferredTime) < new Date();

  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-2', isPast && 'border-amber-300 dark:border-amber-800/40')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">Customer #{callback.customerId}</p>
          <p className="text-xs font-mono text-muted-foreground">{callback.callbackNumber}</p>
        </div>
        <span className={cn('text-xs font-bold', urgencyColor)}>{callback.urgency}</span>
      </div>
      <p className="text-xs text-muted-foreground">{callback.contactReason}</p>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(isPast ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
          {formatDate(callback.preferredTime)}
        </span>
        <span className="text-muted-foreground">
          Attempts: {callback.attemptCount}/{callback.maxAttempts}
        </span>
      </div>
      {callback.lastOutcome && (
        <p className="text-xs text-muted-foreground">Last: {callback.lastOutcome}</p>
      )}
      {callback.assignedAgentId && (
        <p className="text-xs text-muted-foreground">Assigned: {callback.assignedAgentId}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAttempt(callback.id)}
          disabled={callback.status === 'COMPLETED' || callback.status === 'FAILED' || callback.status === 'CANCELLED'}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Phone className="w-3 h-3" /> Attempt Call
        </button>
      </div>
    </div>
  );
}
