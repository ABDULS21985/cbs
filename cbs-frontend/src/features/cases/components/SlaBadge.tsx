import { AlertTriangle, Clock } from 'lucide-react';

interface Props {
  deadline: string;
  breached: boolean;
}

export function SlaBadge({ deadline, breached }: Props) {
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  const diffMins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));

  if (breached || diffMs < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <AlertTriangle className="w-3 h-3" />
        {diffHours}h {diffMins}m overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
      <Clock className="w-3 h-3" />
      {diffHours}h {diffMins}m left
    </span>
  );
}
