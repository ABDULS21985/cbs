import { useState } from 'react';
import { ArrowUpCircle, Clock, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EscalationLevel, BreakItem } from '../api/reconciliationApi';

interface EscalationPanelProps {
  breakItem: BreakItem;
  onEscalate: (notes: string) => Promise<void>;
}

const ESCALATION_LEVELS: Array<{ level: EscalationLevel; label: string; slaHours: number }> = [
  { level: 'OFFICER', label: 'Reconciliation Officer', slaHours: 48 },
  { level: 'TEAM_LEAD', label: 'Team Lead', slaHours: 72 },
  { level: 'OPS_MANAGER', label: 'Operations Manager', slaHours: 120 },
  { level: 'CFO', label: 'Chief Financial Officer', slaHours: 168 },
];

const LEVEL_ORDER: EscalationLevel[] = ['OFFICER', 'TEAM_LEAD', 'OPS_MANAGER', 'CFO'];

function getLevelIndex(level: EscalationLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

function formatTimeRemaining(slaDeadline: string): string {
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return 'Overdue';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export function EscalationPanel({ breakItem, onEscalate }: EscalationPanelProps) {
  const [notes, setNotes] = useState('');
  const [escalating, setEscalating] = useState(false);

  const currentIndex = getLevelIndex(breakItem.escalationLevel);
  const isMaxLevel = currentIndex >= LEVEL_ORDER.length - 1;
  const timeRemaining = formatTimeRemaining(breakItem.slaDeadline);
  const isOverdue = timeRemaining === 'Overdue';

  const handleEscalate = async () => {
    if (!notes.trim()) return;
    setEscalating(true);
    try {
      await onEscalate(notes.trim());
      setNotes('');
    } finally {
      setEscalating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Step Indicator */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Escalation Level</p>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            {ESCALATION_LEVELS.map((level, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              const isFuture = idx > currentIndex;

              return (
                <div key={level.level} className="flex flex-col items-center flex-1 relative">
                  {/* Connector line */}
                  {idx > 0 && (
                    <div
                      className={cn(
                        'absolute top-4 right-1/2 w-full h-0.5',
                        isPast || isCurrent ? 'bg-primary' : 'bg-border',
                      )}
                    />
                  )}

                  {/* Circle */}
                  <div
                    className={cn(
                      'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                      isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                      isPast && 'bg-primary text-primary-foreground',
                      isFuture && 'bg-muted text-muted-foreground border-2 border-border',
                    )}
                  >
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={cn(
                      'text-[10px] mt-1.5 text-center leading-tight',
                      isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {level.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">SLA: {level.slaHours}h</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SLA Timer */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-3.5 py-3 text-xs font-medium border',
          isOverdue
            ? 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
            : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Clock className="w-4 h-4 flex-shrink-0" />
        )}
        <span>
          {isOverdue
            ? 'SLA breached. Auto-escalation will trigger shortly.'
            : `${timeRemaining} before auto-escalation to ${ESCALATION_LEVELS[currentIndex + 1]?.label ?? 'next level'}`}
        </span>
      </div>

      {/* Auto-escalation Rules */}
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs space-y-1.5">
        <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Auto-Escalation Rules</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>- Breaks unresolved for 48h are auto-escalated to Team Lead</li>
          <li>- Breaks over NGN 10M escalate immediately to Ops Manager</li>
          <li>- Any break aged &gt;30 days escalates to CFO for review</li>
          <li>- Nostro breaks in USD/EUR follow accelerated SLA (24h)</li>
        </ul>
      </div>

      {/* Escalate Action */}
      {!isMaxLevel && (
        <div className="space-y-3 pt-1">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escalation reason and investigation summary..."
            rows={3}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleEscalate}
            disabled={escalating || !notes.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {escalating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="w-4 h-4" />
            )}
            Escalate to {ESCALATION_LEVELS[currentIndex + 1]?.label}
          </button>
        </div>
      )}

      {isMaxLevel && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Maximum escalation level reached. This item is under CFO review.
        </div>
      )}
    </div>
  );
}
