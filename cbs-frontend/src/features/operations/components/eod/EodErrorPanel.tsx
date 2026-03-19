import { useState } from 'react';
import { AlertTriangle, RotateCcw, SkipForward, Undo2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared';
import { EodRollbackDialog } from './EodRollbackDialog';
import type { EodStep } from '../../api/eodApi';

interface EodErrorPanelProps {
  step: EodStep | null;
  runId: string;
  onRetry: () => void;
  onSkip: (reason: string) => void;
  onRollback: () => void;
  isRetrying?: boolean;
  isSkipping?: boolean;
  isRollingBack?: boolean;
}

export function EodErrorPanel({
  step,
  runId,
  onRetry,
  onSkip,
  onRollback,
  isRetrying,
  isSkipping,
  isRollingBack,
}: EodErrorPanelProps) {
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  if (!step) return null;

  return (
    <>
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
              Step Failed: {step.label}
            </h3>
            {step.errorMessage && (
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">{step.errorMessage}</p>
            )}
            {step.affectedCount !== undefined && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Affected records: <strong>{step.affectedCount.toLocaleString()}</strong>
              </p>
            )}
          </div>
        </div>

        {step.errorDetail && (
          <pre className="text-xs font-mono bg-red-100 dark:bg-red-900/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700 max-h-40">
            {step.errorDetail}
          </pre>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRetryConfirm(true)}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Step
          </button>
          <button
            onClick={() => setShowSkipConfirm(true)}
            disabled={isSkipping}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip & Continue
          </button>
          <button
            onClick={() => setShowRollbackDialog(true)}
            disabled={isRollingBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Rollback EOD
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showRetryConfirm}
        onClose={() => setShowRetryConfirm(false)}
        onConfirm={() => {
          setShowRetryConfirm(false);
          onRetry();
        }}
        title={`Retry Step: ${step.label}`}
        description="This will re-execute the failed step from the beginning. Any partial work from the failed attempt will be rolled back before retrying."
        confirmLabel="Retry Step"
        isLoading={isRetrying}
      />

      {showSkipConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowSkipConfirm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <SkipForward className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Skip Step: {step.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Skipping this step will continue the EOD run without executing it. Please provide a reason.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason for skipping</label>
                <input
                  type="text"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="e.g. Non-critical step, manual override approved by manager"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSkipConfirm(false);
                    onSkip(skipReason || 'No reason provided');
                    setSkipReason('');
                  }}
                  disabled={isSkipping}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  Skip Step
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <EodRollbackDialog
        open={showRollbackDialog}
        onClose={() => setShowRollbackDialog(false)}
        onConfirm={() => {
          setShowRollbackDialog(false);
          onRollback();
        }}
        isLoading={isRollingBack ?? false}
      />
    </>
  );
}
