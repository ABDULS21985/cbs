import { CheckCircle2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import type { ApiConsent } from '../../api/openBankingApi';

interface AuthoriseConsentDialogProps {
  open: boolean;
  consent: ApiConsent | null;
  onClose: () => void;
  onAuthorise: (consentId: string | number, customerId: number) => void;
  isPending: boolean;
}

export function AuthoriseConsentDialog({
  open,
  consent,
  onClose,
  onAuthorise,
  isPending,
}: AuthoriseConsentDialogProps) {
  if (!open || !consent) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-sm">
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Authorise Consent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authorise this consent to grant API access to the TPP.
                </p>
              </div>
            </div>

            {/* Consent details summary */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consent ID</span>
                <code className="font-mono">{consent.consentId}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TPP</span>
                <span className="font-medium">{consent.tppClientName ?? consent.clientId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>#{consent.customerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scopes</span>
                <div className="flex gap-1">
                  {consent.scopes.map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-muted font-mono">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span>{formatDate(consent.expiresAt)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onAuthorise(consent.consentId, consent.customerId)}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Authorise
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
