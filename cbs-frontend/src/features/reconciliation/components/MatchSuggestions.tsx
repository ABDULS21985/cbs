import { useMemo } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry } from '../api/reconciliationApi';

// ─── Scoring ──────────────────────────────────────────────────────────────────

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.abs(Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

interface ScoredCandidate {
  entry: ReconciliationEntry;
  amountDiff: number;
  dateDiff: number;
  score: number;
}

function scoreCandidates(
  selected: ReconciliationEntry,
  candidates: ReconciliationEntry[],
  tolerance: number,
): ScoredCandidate[] {
  return candidates
    .map((entry) => {
      const amountDiff = Math.abs(selected.amount - entry.amount);
      const dateDiff = daysBetween(selected.date, entry.date);
      // Lower is better: weight amount more heavily than date
      const amountScore = amountDiff;
      const dateScore = dateDiff * 500; // each day costs 500 points
      const score = amountScore + dateScore;
      return { entry, amountDiff, dateDiff, score };
    })
    .filter((c) => tolerance === 0 ? c.amountDiff < 0.01 : c.amountDiff <= tolerance)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MatchSuggestionsProps {
  selectedEntry: ReconciliationEntry;
  candidateEntries: ReconciliationEntry[];
  tolerance: number;
  onAccept: (candidate: ReconciliationEntry) => void;
}

export function MatchSuggestions({ selectedEntry, candidateEntries, tolerance, onAccept }: MatchSuggestionsProps) {
  const suggestions = useMemo(
    () => scoreCandidates(selectedEntry, candidateEntries, tolerance),
    [selectedEntry, candidateEntries, tolerance],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-2 right-2 z-30 mt-1 surface-card shadow-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Suggested Matches
        </span>
      </div>
      <div className="divide-y">
        {suggestions.map((s) => (
          <div
            key={s.entry.id}
            className="px-3 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors group"
          >
            <div className="flex-1 min-w-0 grid grid-cols-4 gap-x-3 text-xs">
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-mono">{formatDate(s.entry.date)}</span>
                {s.dateDiff > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-1">({s.dateDiff}d)</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Ref: </span>
                <span className="font-mono text-[11px]">{s.entry.reference}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className={cn(
                  'font-mono font-semibold',
                  s.entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : '',
                )}>
                  {s.entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(s.entry.amount)}
                </span>
              </div>
              <div>
                {s.amountDiff < 0.01 ? (
                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Exact
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Diff: {formatMoney(s.amountDiff)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onAccept(s.entry)}
              className="flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
            >
              Match
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
