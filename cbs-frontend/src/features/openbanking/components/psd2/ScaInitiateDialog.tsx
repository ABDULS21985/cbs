import { useState } from 'react';
import { X, Loader2, ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInitiateSca } from '../../hooks/usePsd2';
import { usePsd2Tpps } from '../../hooks/usePsd2';
import { toast } from 'sonner';
import type { Psd2ScaSession } from '../../api/psd2Api';

interface ScaInitiateDialogProps {
  open: boolean;
  onClose: () => void;
}

const SCA_METHODS = [
  { value: 'SMS_OTP', label: 'SMS OTP' },
  { value: 'PUSH', label: 'Push Notification' },
  { value: 'BIOMETRIC', label: 'Biometric' },
  { value: 'TOTP', label: 'TOTP' },
  { value: 'FIDO2', label: 'FIDO2' },
] as const;

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

const SCA_METHOD_LABELS: Record<string, string> = {
  SMS_OTP: 'SMS OTP',
  PUSH: 'Push Notification',
  BIOMETRIC: 'Biometric',
  TOTP: 'TOTP',
  FIDO2: 'FIDO2',
  PHOTO_TAN: 'Photo TAN',
  CHIP_TAN: 'Chip TAN',
};

export function ScaInitiateDialog({ open, onClose }: ScaInitiateDialogProps) {
  const { mutate: initiateSca, isPending } = useInitiateSca();
  const { data: tpps = [] } = usePsd2Tpps();
  const activeTpps = tpps.filter((t) => t.status === 'ACTIVE');

  const [form, setForm] = useState({
    customerId: '',
    tppId: '',
    scaMethod: 'SMS_OTP',
    consentId: '',
  });

  const [result, setResult] = useState<Psd2ScaSession | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    initiateSca(
      {
        customerId: parseInt(form.customerId, 10),
        tppId: form.tppId,
        scaMethod: form.scaMethod,
        consentId: form.consentId || undefined,
      },
      {
        onSuccess: (session) => {
          toast.success('SCA session initiated');
          setResult(session);
        },
        onError: () => {
          toast.error('Failed to initiate SCA session');
        },
      },
    );
  };

  const handleCopySessionId = () => {
    if (result) {
      navigator.clipboard.writeText(result.sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setResult(null);
    setForm({ customerId: '', tppId: '', scaMethod: 'SMS_OTP', consentId: '' });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold">Initiate SCA Session</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {result ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    SCA Session Created
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                    Status: {result.scaStatus}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Session ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono break-all">
                    {result.sessionId}
                  </code>
                  <button
                    onClick={handleCopySessionId}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">SCA Method</span>
                  <p className="font-medium mt-0.5">{SCA_METHOD_LABELS[result.scaMethod] ?? result.scaMethod}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expires At</span>
                  <p className="font-medium mt-0.5">
                    {new Date(result.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
                {result.exemptionType && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Exemption</span>
                    <p className="font-medium mt-0.5">{result.exemptionType}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Customer ID *
                </label>
                <input
                  required
                  type="number"
                  className={inputCls}
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                  placeholder="e.g. 10001"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  TPP *
                </label>
                <select
                  required
                  className={inputCls}
                  value={form.tppId}
                  onChange={(e) => setForm((f) => ({ ...f, tppId: e.target.value }))}
                >
                  <option value="">Select a TPP...</option>
                  {activeTpps.map((tpp) => (
                    <option key={tpp.tppId} value={tpp.tppId}>
                      {tpp.tppName} ({tpp.tppId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  SCA Method *
                </label>
                <select
                  required
                  className={inputCls}
                  value={form.scaMethod}
                  onChange={(e) => setForm((f) => ({ ...f, scaMethod: e.target.value }))}
                >
                  {SCA_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Consent ID (optional)
                </label>
                <input
                  className={inputCls}
                  value={form.consentId}
                  onChange={(e) => setForm((f) => ({ ...f, consentId: e.target.value }))}
                  placeholder="e.g. CST-abc123..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !form.tppId || !form.customerId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  Initiate SCA
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
