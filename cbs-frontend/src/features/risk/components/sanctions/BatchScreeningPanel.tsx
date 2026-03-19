import { useState } from 'react';
import { Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { useRunBatchScreen } from '../../hooks/useSanctions';
import type { BatchScreeningResult, SanctionsMatch } from '../../types/sanctions';
import { PendingMatchTable } from './PendingMatchTable';

interface Props {
  onMatchClick: (match: SanctionsMatch) => void;
}

export function BatchScreeningPanel({ onMatchClick }: Props) {
  const [batchResult, setBatchResult] = useState<BatchScreeningResult | null>(null);
  const runBatch = useRunBatchScreen();

  const handleRun = async () => {
    const response = await runBatch.mutateAsync();
    setBatchResult(response.data.data);
  };

  const progressPct =
    batchResult && batchResult.totalRecords > 0
      ? Math.round((batchResult.processedRecords / batchResult.totalRecords) * 100)
      : 0;

  const isRunning = batchResult?.status === 'RUNNING' || batchResult?.status === 'PENDING';
  const isCompleted = batchResult?.status === 'COMPLETED';
  const isFailed = batchResult?.status === 'FAILED';

  return (
    <div className="p-6 space-y-6">
      {/* Launch section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Full Batch Screening</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Screen all active customers against all loaded watchlists simultaneously.
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={runBatch.isPending || isRunning}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              isRunning
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Full Screen</>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {batchResult && (isRunning || isCompleted) && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {batchResult.processedRecords.toLocaleString()} / {batchResult.totalRecords.toLocaleString()} records
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isCompleted ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="mt-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            Batch screening failed. Please try again.
          </div>
        )}
      </div>

      {/* Completed summary */}
      {isCompleted && batchResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 p-4 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <div className="font-semibold text-green-700 dark:text-green-300">Batch Screening Complete</div>
            <div className="text-sm text-green-600 dark:text-green-400 mt-0.5">
              {batchResult.newMatches > 0
                ? `${batchResult.newMatches} new match${batchResult.newMatches !== 1 ? 'es' : ''} found`
                : 'No new matches found'}
              {batchResult.completedAt && ` · Completed ${formatDate(batchResult.completedAt)}`}
            </div>
          </div>
        </div>
      )}

      {/* New matches table — shown when completed with matches */}
      {isCompleted && batchResult && batchResult.newMatches > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">New Matches from This Run</h3>
          <PendingMatchTable
            data={[]}
            isLoading={false}
            onRowClick={onMatchClick}
          />
        </div>
      )}
    </div>
  );
}
