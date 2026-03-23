import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact, formatPercent } from '@/lib/formatters';
import { Trophy, Medal, Star, ArrowUpDown } from 'lucide-react';
import type { Advisor } from '../../api/wealthApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorLeaderboardProps {
  advisors: Advisor[];
}

type SortField = 'aum' | 'avgReturn' | 'clientCount' | 'satisfaction';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDAL_STYLES: Record<number, { icon: typeof Trophy; color: string; bg: string; label: string }> = {
  0: { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', label: 'Gold' },
  1: { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50', label: 'Silver' },
  2: { icon: Medal, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30', label: 'Bronze' },
};

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'aum', label: 'AUM' },
  { field: 'avgReturn', label: 'Return' },
  { field: 'clientCount', label: 'Clients' },
  { field: 'satisfaction', label: 'Rating' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPerformanceBand(rank: number, total: number): string {
  const quartile = rank / total;
  if (quartile <= 0.25) return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  if (quartile <= 0.75) return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
  return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />);
    } else if (i === full && hasHalf) {
      stars.push(
        <span key={i} className="relative inline-block w-3.5 h-3.5">
          <Star className="w-3.5 h-3.5 text-gray-300 absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </span>
        </span>,
      );
    } else {
      stars.push(<Star key={i} className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />);
    }
  }
  return stars;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisorLeaderboard({ advisors }: AdvisorLeaderboardProps) {
  const [sortField, setSortField] = useState<SortField>('aum');

  const sorted = useMemo(() => {
    return [...advisors].sort((a, b) => {
      switch (sortField) {
        case 'aum':
          return b.aum - a.aum;
        case 'avgReturn':
          return b.avgReturn - a.avgReturn;
        case 'clientCount':
          return b.clientCount - a.clientCount;
        case 'satisfaction':
          return (b.satisfaction ?? 0) - (a.satisfaction ?? 0);
        default:
          return 0;
      }
    });
  }, [advisors, sortField]);

  const top3 = sorted.slice(0, 3);

  return (
    <div className="surface-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold">Advisor Leaderboard</h3>
        </div>
      </div>

      {/* Sort buttons */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Sort by:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.field}
            onClick={() => setSortField(opt.field)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              sortField === opt.field
                ? 'bg-primary text-primary-foreground'
                : 'border hover:bg-muted',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Top 3 entries */}
      <div className="space-y-3">
        {top3.map((advisor, index) => {
          const medal = MEDAL_STYLES[index];
          const MedalIcon = medal.icon;
          const rankPosition = index + 1;
          const bandClass = getPerformanceBand(rankPosition, sorted.length);

          return (
            <div
              key={advisor.id}
              className={cn(
                'rounded-xl border p-4 flex items-center gap-4 transition-colors',
                bandClass,
              )}
            >
              {/* Medal rank */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  medal.bg,
                )}
              >
                <MedalIcon className={cn('w-5 h-5', medal.color)} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">#{rankPosition}</span>
                  <span className="font-semibold text-sm truncate">{advisor.name}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {renderStars(advisor.satisfaction ?? 0)}
                  <span className="text-xs text-muted-foreground ml-1">
                    {(advisor.satisfaction ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:grid grid-cols-3 gap-6 text-center shrink-0">
                <div>
                  <p className="text-sm font-bold font-mono">{formatMoneyCompact(advisor.aum)}</p>
                  <p className="text-xs text-muted-foreground">AUM</p>
                </div>
                <div>
                  <p
                    className={cn(
                      'text-sm font-bold font-mono',
                      advisor.avgReturn >= 12
                        ? 'text-green-600 dark:text-green-400'
                        : advisor.avgReturn < 10
                          ? 'text-red-600 dark:text-red-400'
                          : '',
                    )}
                  >
                    {formatPercent(advisor.avgReturn, 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Return</p>
                </div>
                <div>
                  <p className="text-sm font-bold font-mono">{advisor.clientCount}</p>
                  <p className="text-xs text-muted-foreground">Clients</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {advisors.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No advisors available</p>
        </div>
      )}
    </div>
  );
}
