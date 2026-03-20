import { useState } from 'react';
import { Ban, Loader2, AlertTriangle } from 'lucide-react';
import type { ApiConsent } from '../../api/openBankingApi';

interface RevokeConsentDialogProps {
  open: boolean;
  consent: ApiConsent | null;
  onClose: () => void;
  onRevoke: (consentId: string | number, reason?: string) => void;
  isPending: boolean;
}

export function RevokeConsentDialog({
  open,
  consent,
  onClose,
  onRevoke,
  isPending,
}: RevokeConsentDialogProps) {
  const [reason, setReason] = useState('');

  if (!open || !consent) return null;

  const handleRevoke = () => {
    onRevoke(consent.consentId, reason || undefined);
    setReason('');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Revoke Consent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Revoke access for <strong>{consent.tppClientName ?? `TPP #${consent.tppClientId}`}</strong>.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Revoking this consent will immediately terminate the TPP's access to customer data.
                Any in-flight API requests will be rejected.
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Reason (optional)
              </label>
              <textarea
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer request, fraud suspicion, compliance, etc."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Revoke
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
