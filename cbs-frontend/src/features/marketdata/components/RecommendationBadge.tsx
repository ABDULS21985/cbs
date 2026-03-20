import { cn } from '@/lib/utils';

export function RecommendationBadge({ rec }: { rec: string }) {
  const cls =
    rec === 'BUY'
      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : rec === 'SELL'
        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return (
    <span
      className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', cls)}
      aria-label={`Recommendation: ${rec}`}
    >
      {rec}
    </span>
  );
}
