import { useState } from 'react';
import { formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ParameterAudit } from '../../api/parameterApi';

interface ParameterAuditTrailProps {
  history: ParameterAudit[];
}

export function ParameterAuditTrail({ history }: ParameterAuditTrailProps) {
  const [showAll, setShowAll] = useState(false);

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No change history available.
      </div>
    );
  }

  const visible = showAll ? history : history.slice(0, 5);

  return (
    <div className="space-y-0">
      {visible.map((item, i) => (
        <div key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            {i < visible.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className={cn('pb-4 flex-1 min-w-0', i === visible.length - 1 && 'pb-0')}>
            <div className="flex items-center gap-2 flex-wrap">
              {item.oldValue && (
                <>
                  <span className="text-xs font-mono bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded line-through">
                    {item.oldValue.length > 40 ? `${item.oldValue.slice(0, 40)}…` : item.oldValue}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                </>
              )}
              <span className="text-xs font-mono bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                {item.newValue.length > 40 ? `${item.newValue.slice(0, 40)}…` : item.newValue}
              </span>
            </div>
            {item.changeReason && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={item.changeReason}>
                {item.changeReason}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.changedBy} · {formatDateTime(item.createdAt)}
            </p>
          </div>
        </div>
      ))}
      {history.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-primary hover:underline mt-2"
        >
          {showAll ? 'Show less' : `Show all ${history.length} changes`}
        </button>
      )}
    </div>
  );
}
