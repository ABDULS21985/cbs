import { CheckCircle2, Link2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, formatDate } from '@/lib/formatters';
import type { ReconciliationEntry } from '../api/reconciliationApi';

interface MatchedItemsTableProps {
  entries: ReconciliationEntry[];
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 95 ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20' :
    confidence >= 70 ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' :
    'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
  return (
    <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full font-medium', color)}>
      {confidence}%
    </span>
  );
}

function MatchTypeBadge({ matchType }: { matchType?: string }) {
  const label = matchType === 'EXACT' ? 'EXACT' : 'FUZZY';
  const color = label === 'EXACT'
    ? 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
    : 'text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
  return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', color)}>{label}</span>;
}

export function MatchedItemsTable({ entries }: MatchedItemsTableProps) {
  const matched = entries.filter((e) => e.status === 'MATCHED' || e.status === 'PARTIAL');

  if (matched.length === 0) {
    return (
      <div className="surface-card">
        <div className="px-5 py-3.5 border-b">
          <h3 className="text-sm font-semibold">Matched Items</h3>
        </div>
        <div className="py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          No matched items yet.
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold">Matched Items</h3>
        </div>
        <span className="text-xs text-muted-foreground">{matched.length} item{matched.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Our Date</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Our Ref</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Bank Ref</span>
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground whitespace-nowrap">Amount</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">
                <span className="flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> Type</span>
              </th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {matched.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                  {formatDate(entry.date)}
                </td>
                <td className="px-4 py-2.5 font-mono whitespace-nowrap text-[11px]">
                  {entry.reference}
                </td>
                <td className="px-4 py-2.5 font-mono whitespace-nowrap text-[11px] text-muted-foreground">
                  {entry.matchedRef ?? '—'}
                </td>
                <td className="px-4 py-2.5 max-w-[200px]">
                  <span className="block truncate" title={entry.description}>{entry.description}</span>
                </td>
                <td className={cn(
                  'px-4 py-2.5 text-right font-mono tabular-nums font-medium whitespace-nowrap',
                  entry.type === 'CREDIT' ? 'text-green-700 dark:text-green-400' : 'text-foreground',
                )}>
                  {entry.type === 'CREDIT' ? '+' : '-'}{formatMoney(entry.amount)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <MatchTypeBadge matchType={entry.matchType} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <ConfidenceBadge confidence={entry.matchConfidence ?? 100} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
