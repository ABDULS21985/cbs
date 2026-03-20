import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import { Check, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import type { TradeConfirmation } from '../../api/tradeOpsApi';

interface ConfirmationMatchPanelProps {
  ourConfirmations: TradeConfirmation[];
  allegedConfirmations: TradeConfirmation[];
  isLoading: boolean;
  onMatch: (ourRef: string, theirRef: string) => void;
  isMatching: boolean;
}

function ConfirmationCard({
  item,
  selected,
  onClick,
  isSuggested,
}: {
  item: TradeConfirmation;
  selected: boolean;
  onClick: () => void;
  isSuggested?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-primary/30',
        isSuggested && !selected && 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs font-medium text-primary">{item.tradeRef}</span>
        {isSuggested && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
            <Sparkles className="w-3 h-3" /> Suggested
          </span>
        )}
      </div>
      <div className="text-sm font-medium">{item.instrumentCode}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{item.counterpartyName}</div>
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className={cn('font-semibold', item.side === 'BUY' ? 'text-green-600' : 'text-red-600')}>
          {item.side}
        </span>
        <span className="tabular-nums">{item.quantity.toLocaleString()} @ {item.price.toFixed(2)}</span>
        <span className="tabular-nums font-medium">{formatMoney(item.amount, item.currency)}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Trade: {formatDate(item.tradeDate)} | Settle: {formatDate(item.settlementDate)}
      </div>
    </button>
  );
}

export function ConfirmationMatchPanel({
  ourConfirmations,
  allegedConfirmations,
  isLoading,
  onMatch,
  isMatching,
}: ConfirmationMatchPanelProps) {
  const [selectedOur, setSelectedOur] = useState<string | null>(null);
  const [selectedTheir, setSelectedTheir] = useState<string | null>(null);

  // Auto-match suggestions: same instrument + similar amount + same date
  const suggestions = useMemo(() => {
    const map = new Map<string, string[]>();
    ourConfirmations.forEach((ours) => {
      const matches = allegedConfirmations.filter(
        (theirs) =>
          theirs.instrumentCode === ours.instrumentCode &&
          Math.abs(theirs.amount - ours.amount) < 0.01 &&
          theirs.tradeDate === ours.tradeDate,
      );
      if (matches.length > 0) {
        map.set(ours.tradeRef, matches.map((m) => m.tradeRef));
      }
    });
    return map;
  }, [ourConfirmations, allegedConfirmations]);

  const suggestedTheirRefs = selectedOur ? suggestions.get(selectedOur) ?? [] : [];

  const handleMatch = () => {
    if (selectedOur && selectedTheir) {
      onMatch(selectedOur, selectedTheir);
      setSelectedOur(null);
      setSelectedTheir(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* Our confirmations */}
        <div>
          <p className="text-sm font-medium mb-2">
            Our Confirmations{' '}
            <span className="text-muted-foreground font-normal">({ourConfirmations.length})</span>
          </p>
          <div className="space-y-2 max-h-[500px] overflow-auto">
            {ourConfirmations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No unmatched confirmations</p>
            ) : (
              ourConfirmations.map((item) => (
                <ConfirmationCard
                  key={item.tradeRef}
                  item={item}
                  selected={selectedOur === item.tradeRef}
                  onClick={() => setSelectedOur(item.tradeRef === selectedOur ? null : item.tradeRef)}
                />
              ))
            )}
          </div>
        </div>

        {/* Match button */}
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <button
            onClick={handleMatch}
            disabled={!selectedOur || !selectedTheir || isMatching}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4" />
            {isMatching ? 'Matching...' : 'Match'}
          </button>
          {suggestions.size > 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {suggestions.size} auto-match suggestion{suggestions.size !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Counterparty (alleged) confirmations */}
        <div>
          <p className="text-sm font-medium mb-2">
            Counterparty Confirmations{' '}
            <span className="text-muted-foreground font-normal">({allegedConfirmations.length})</span>
          </p>
          <div className="space-y-2 max-h-[500px] overflow-auto">
            {allegedConfirmations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No alleged confirmations</p>
            ) : (
              allegedConfirmations.map((item) => (
                <ConfirmationCard
                  key={item.tradeRef}
                  item={item}
                  selected={selectedTheir === item.tradeRef}
                  onClick={() => setSelectedTheir(item.tradeRef === selectedTheir ? null : item.tradeRef)}
                  isSuggested={suggestedTheirRefs.includes(item.tradeRef)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
