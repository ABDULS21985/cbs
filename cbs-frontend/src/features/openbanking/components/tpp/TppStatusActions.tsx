import { useState } from 'react';
import { Pause, Play, Loader2, AlertTriangle } from 'lucide-react';
import type { TppClient } from '../../api/openBankingApi';

interface TppStatusActionsProps {
  client: TppClient;
  onSuspend: () => void;
  onReactivate: () => void;
  isPending?: boolean;
}

export function TppStatusActions({ client, onSuspend, onReactivate, isPending }: TppStatusActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isSuspend = client.status === 'ACTIVE';

  const handleConfirm = () => {
    if (isSuspend) {
      onSuspend();
    } else {
      onReactivate();
    }
    setShowConfirm(false);
  };

  return (
    <>
      {isSuspend ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
          Suspend
        </button>
      ) : client.status === 'SUSPENDED' ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-300 text-green-700 dark:text-green-400 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Reactivate
        </button>
      ) : null}

      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">
                      {isSuspend ? 'Suspend TPP Client' : 'Reactivate TPP Client'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isSuspend
                        ? `Suspending "${client.name}" will immediately revoke all active API access. Active consents will be paused.`
                        : `Reactivating "${client.name}" will restore API access. Paused consents will resume.`}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                      isSuspend ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSuspend ? 'Suspend' : 'Reactivate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
