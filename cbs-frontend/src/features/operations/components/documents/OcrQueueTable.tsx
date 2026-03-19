import { Loader2, CheckCircle2, Clock, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/lib/formatters';
import type { OcrQueueItem, OcrStatus } from '../../api/documentApi';

interface OcrQueueTableProps {
  items: OcrQueueItem[];
  onReview: (item: OcrQueueItem) => void;
  onRequeue: (id: string) => void;
}

const STATUS_CONFIG: Record<
  OcrStatus,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  QUEUED: {
    label: 'Queued',
    icon: <Clock className="w-3.5 h-3.5" />,
    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  PROCESSING: {
    label: 'Processing',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  VERIFIED: {
    label: 'Verified',
    icon: <Shield className="w-3.5 h-3.5" />,
    badgeClass: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  FAILED: {
    label: 'Failed',
    icon: <XCircle className="w-3.5 h-3.5" />,
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

function AccuracyBar({ accuracy }: { accuracy?: number }) {
  if (accuracy === undefined) {
    return <span className="text-xs text-muted-foreground/50">—</span>;
  }
  const color =
    accuracy >= 95
      ? 'bg-green-500'
      : accuracy >= 80
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${accuracy}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums">{accuracy.toFixed(1)}%</span>
    </div>
  );
}

export function OcrQueueTable({ items, onReview, onRequeue }: OcrQueueTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">No items in OCR queue</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Document
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Uploaded
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pages
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              OCR Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Accuracy
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status];
            return (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                {/* Document Name */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium truncate max-w-[220px]">
                      {item.documentName}
                    </span>
                    {item.lowConfidenceWords && item.lowConfidenceWords.length > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          {item.lowConfidenceWords.length} uncertain word
                          {item.lowConfidenceWords.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {item.type}
                  </span>
                </td>

                {/* Uploaded */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(item.uploadedAt)}
                </td>

                {/* Pages */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {item.pages} {item.pages === 1 ? 'page' : 'pages'}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                      statusCfg.badgeClass,
                    )}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                  {item.processedAt && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDateTime(item.processedAt)}
                    </div>
                  )}
                </td>

                {/* Accuracy */}
                <td className="px-4 py-3">
                  <AccuracyBar accuracy={item.accuracy} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.status === 'COMPLETED' && (
                      <button
                        onClick={() => onReview(item)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 transition-colors"
                      >
                        Review
                      </button>
                    )}
                    {item.status === 'FAILED' && (
                      <button
                        onClick={() => onRequeue(item.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 transition-colors"
                      >
                        Re-queue
                      </button>
                    )}
                    {item.status === 'VERIFIED' && (
                      <button
                        onClick={() => onReview(item)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 transition-colors"
                      >
                        View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
