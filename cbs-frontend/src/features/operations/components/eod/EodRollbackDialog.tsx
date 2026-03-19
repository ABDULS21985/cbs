import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface EodRollbackDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const CONSEQUENCES = [
  'All GL journal entries posted during this EOD run will be reversed',
  'Interest accruals for this business day will be cancelled',
  'Fee postings will be voided and credited back to accounts',
  'FX revaluation entries will be unwound',
  'Reports generated during this run will be marked as invalid',
  'The business date will revert to the previous day',
  'A full audit trail of the rollback will be created',
  'Operations staff will be notified via email',
];

export function EodRollbackDialog({ open, onClose, onConfirm, isLoading }: EodRollbackDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const canConfirm = confirmText === 'ROLLBACK';

  if (!open) return null;

  const handleClose = () => {
    if (isLoading) return;
    setConfirmText('');
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm || isLoading) return;
    onConfirm();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border border-red-200 dark:border-red-800 w-full max-w-lg p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Rollback EOD Run</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This will reverse all GL entries posted during this EOD run. This action cannot be undone without re-running EOD.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">
              Consequences of rollback:
            </p>
            <ul className="space-y-1">
              {CONSEQUENCES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <span className="mt-0.5 text-red-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              Type <span className="font-mono bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1 rounded">ROLLBACK</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ROLLBACK"
              disabled={isLoading}
              className="w-full rounded-lg border border-red-300 dark:border-red-700 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 bg-background disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Rollback EOD Run
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
