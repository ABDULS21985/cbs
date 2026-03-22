import { useState } from 'react';
import { Power, Loader2, AlertTriangle } from 'lucide-react';
import type { TppClient } from '../../api/openBankingApi';

interface TppStatusActionsProps {
  client: TppClient;
  onSuspend: () => void;
  onReactivate: () => void;
  isPending?: boolean;
}

export function TppStatusActions({ client, onSuspend, isPending }: TppStatusActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (client.status !== 'ACTIVE') return null;

  const handleConfirm = () => {
    onSuspend();
    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
        Deactivate
      </button>

      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Deactivate TPP Client</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deactivating &quot;{client.name}&quot; will immediately revoke all active API access. This action cannot be undone from the UI.
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
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Deactivate
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
