import { cn } from '@/lib/utils';

interface Props {
  score: number;
}

export function MatchScoreBadge({ score }: Props) {
  const getVariant = () => {
    if (score > 90) return { label: 'CRITICAL', classes: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (score >= 70) return { label: 'HIGH', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    return { label: 'MEDIUM', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  };

  const { label, classes } = getVariant();

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', classes)}>
      {score} - {label}
    </span>
  );
}
