import { cn } from '@/lib/utils';

interface CountryEntry {
  country: string;
  countryCode: string;
  tppCount: number;
  callCount: number;
}

interface GeographicDistributionMapProps {
  data: CountryEntry[];
  loading?: boolean;
}

// ─── Flag Emoji Helper ──────────────────────────────────────────────────────

function countryFlag(code: string): string {
  if (code.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset,
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GeographicDistributionMap({
  data,
  loading,
}: GeographicDistributionMapProps) {
  if (loading) {
    return (
      <div className="surface-card p-5">
        <div className="h-4 w-48 bg-muted rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxTpps = Math.max(...data.map((d) => d.tppCount), 1);
  const sorted = [...data].sort((a, b) => b.tppCount - a.tppCount);

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-semibold mb-4">Geographic Distribution</h3>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No geographic data available.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_3fr] gap-2 px-2 text-[10px] font-medium uppercase text-muted-foreground">
            <span>Country</span>
            <span className="text-right">TPPs</span>
            <span className="text-right">API Calls</span>
            <span />
          </div>

          {/* Rows */}
          {sorted.map((entry) => {
            const barWidth = (entry.tppCount / maxTpps) * 100;
            return (
              <div
                key={entry.countryCode}
                className="grid grid-cols-[2fr_1fr_1fr_3fr] gap-2 items-center px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">
                    {countryFlag(entry.countryCode)}
                  </span>
                  <span className="text-sm font-medium truncate">{entry.country}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-right">
                  {entry.tppCount.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums text-right">
                  {entry.callCount.toLocaleString()}
                </span>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500 bg-blue-500')}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
