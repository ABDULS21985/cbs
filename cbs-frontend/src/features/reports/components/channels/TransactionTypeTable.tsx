import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoneyCompact } from '@/lib/formatters';
import type { TransactionType } from '../../api/channelAnalyticsApi';

interface TransactionTypeTableProps {
  types: TransactionType[];
  isLoading?: boolean;
}

const CHANNEL_MIX_COLORS: Record<string, string> = {
  Mobile:  '#3b82f6',
  Web:     '#8b5cf6',
  Branch:  '#6b7280',
  ATM:     '#f59e0b',
  USSD:    '#10b981',
  POS:     '#ef4444',
  Agent:   '#f97316',
};

function ChannelMixBar({ mix }: { mix: string }) {
  // Parse "Mobile 55%, Web 30%, Branch 15%" into segments
  const segments = mix.split(',').map((s) => {
    const m = s.trim().match(/^(.+?)\s+(\d+)%$/);
    if (!m) return null;
    return { label: m[1].trim(), pct: parseInt(m[2], 10) };
  }).filter(Boolean) as { label: string; pct: number }[];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-2 w-24 rounded-full overflow-hidden">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="h-full"
            style={{
              width: `${seg.pct}%`,
              backgroundColor: CHANNEL_MIX_COLORS[seg.label] || '#6b7280',
            }}
            title={`${seg.label}: ${seg.pct}%`}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={mix}>
        {mix}
      </span>
    </div>
  );
}

export function TransactionTypeTable({ types, isLoading }: TransactionTypeTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalCount = types.reduce((s, t) => s + t.count, 0);
  const totalValue = types.reduce((s, t) => s + t.value, 0);

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Transaction Types</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sorted by volume — includes channel mix and period growth
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-border bg-muted/30">
              {['Type', 'Count', 'Value', 'Avg Amount', 'Channel Mix', 'Growth'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.type} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{t.label}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {t.count.toLocaleString()}
                </td>
                <td className="px-4 py-3 tabular-nums font-medium">
                  {formatMoneyCompact(t.value)}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {formatMoneyCompact(t.avgAmount)}
                </td>
                <td className="px-4 py-3">
                  <ChannelMixBar mix={t.channelMix} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-semibold tabular-nums',
                      t.growthPct >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {t.growthPct >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {t.growthPct > 0 ? '+' : ''}{t.growthPct.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40">
              <td className="px-4 py-3 font-semibold text-xs text-muted-foreground">TOTAL</td>
              <td className="px-4 py-3 font-semibold tabular-nums">{totalCount.toLocaleString()}</td>
              <td className="px-4 py-3 font-semibold tabular-nums">{formatMoneyCompact(totalValue)}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">—</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
