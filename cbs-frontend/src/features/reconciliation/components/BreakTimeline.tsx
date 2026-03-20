import { useState } from 'react';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { BreakTimelineEvent } from '../api/reconciliationApi';

interface BreakTimelineProps {
  events: BreakTimelineEvent[];
  onAddNote: (notes: string) => Promise<void>;
}

const typeColors: Record<BreakTimelineEvent['type'], { dot: string; line: string; bg: string }> = {
  INFO: { dot: 'bg-blue-500', line: 'bg-blue-200 dark:bg-blue-800', bg: 'bg-blue-50 dark:bg-blue-900/10' },
  ACTION: { dot: 'bg-amber-500', line: 'bg-amber-200 dark:bg-amber-800', bg: 'bg-amber-50 dark:bg-amber-900/10' },
  RESOLVED: { dot: 'bg-green-500', line: 'bg-green-200 dark:bg-green-800', bg: 'bg-green-50 dark:bg-green-900/10' },
  ESCALATED: { dot: 'bg-red-500', line: 'bg-red-200 dark:bg-red-800', bg: 'bg-red-50 dark:bg-red-900/10' },
};

export function BreakTimeline({ events, onAddNote }: BreakTimelineProps) {
  const [noteText, setNoteText] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleAdd = async () => {
    if (!noteText.trim()) return;
    setAdding(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText('');
      setShowInput(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* Timeline */}
      <div className="relative pl-6">
        {events.map((event, idx) => {
          const colors = typeColors[event.type];
          const isLast = idx === events.length - 1;

          return (
            <div key={event.id} className="relative pb-5 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div className={cn('absolute left-[-16px] top-3 w-0.5 h-full', colors.line)} />
              )}

              {/* Dot */}
              <div
                className={cn(
                  'absolute left-[-20px] top-1.5 w-3 h-3 rounded-full ring-2 ring-background',
                  colors.dot,
                )}
              />

              {/* Content */}
              <div className={cn('rounded-lg border px-3.5 py-2.5 text-xs', colors.bg)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{event.action}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(event.timestamp)}</span>
                </div>
                <p className="text-muted-foreground mt-0.5">by {event.actor}</p>
                {event.notes && <p className="mt-1.5 text-foreground">{event.notes}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Note */}
      <div className="mt-4 pt-3 border-t">
        {!showInput ? (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Add Note
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add investigation note..."
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setShowInput(false);
                  setNoteText('');
                }}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !noteText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {adding && <Loader2 className="w-3 h-3 animate-spin" />}
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
