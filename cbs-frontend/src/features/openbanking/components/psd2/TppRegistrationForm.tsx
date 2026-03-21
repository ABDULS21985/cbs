import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegisterPsd2Tpp } from '../../hooks/usePsd2';
import { toast } from 'sonner';

interface TppRegistrationFormProps {
  open: boolean;
  onClose: () => void;
}

const TPP_TYPES = ['AISP', 'PISP', 'CBPII'] as const;
const SCA_APPROACHES = ['REDIRECT', 'EMBEDDED', 'DECOUPLED', 'OAUTH2'] as const;

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

export function TppRegistrationForm({ open, onClose }: TppRegistrationFormProps) {
  const { mutate: registerTpp, isPending } = useRegisterPsd2Tpp();
  const [form, setForm] = useState({
    tppName: '',
    tppType: 'AISP' as string,
    nationalAuthority: '',
    authorizationNumber: '',
    eidasCertificate: '',
    allowedScopes: [] as string[],
    scaApproach: 'REDIRECT' as string,
  });

  const AVAILABLE_SCOPES = ['accounts', 'payments', 'funds-confirmations'];

  const toggleScope = (scope: string) => {
    setForm((f) => ({
      ...f,
      allowedScopes: f.allowedScopes.includes(scope)
        ? f.allowedScopes.filter((s) => s !== scope)
        : [...f.allowedScopes, scope],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerTpp(form, {
      onSuccess: () => {
        toast.success('TPP registered successfully');
        onClose();
        setForm({
          tppName: '',
          tppType: 'AISP',
          nationalAuthority: '',
          authorizationNumber: '',
          eidasCertificate: '',
          allowedScopes: [],
          scaApproach: 'REDIRECT',
        });
      },
      onError: () => {
        toast.error('Failed to register TPP');
      },
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Slide-over sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md">
        <div className="h-full bg-card border-l shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-base font-semibold">Register PSD2 TPP</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                TPP Name *
              </label>
              <input
                required
                className={inputCls}
                value={form.tppName}
                onChange={(e) => setForm((f) => ({ ...f, tppName: e.target.value }))}
                placeholder="e.g. FinTech Payments Ltd"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                TPP Type *
              </label>
              <select
                required
                className={inputCls}
                value={form.tppType}
                onChange={(e) => setForm((f) => ({ ...f, tppType: e.target.value }))}
              >
                {TPP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                AISP = Account Information, PISP = Payment Initiation, CBPII = Card-Based Payment Instrument Issuer
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Authorization Number *
              </label>
              <input
                required
                className={inputCls}
                value={form.authorizationNumber}
                onChange={(e) => setForm((f) => ({ ...f, authorizationNumber: e.target.value }))}
                placeholder="e.g. FRN-123456"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                National Authority *
              </label>
              <input
                required
                className={inputCls}
                value={form.nationalAuthority}
                onChange={(e) => setForm((f) => ({ ...f, nationalAuthority: e.target.value }))}
                placeholder="e.g. FCA, BaFin, ACPR"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                eIDAS Certificate
              </label>
              <textarea
                className={cn(inputCls, 'resize-none h-20')}
                value={form.eidasCertificate}
                onChange={(e) => setForm((f) => ({ ...f, eidasCertificate: e.target.value }))}
                placeholder="Paste eIDAS certificate or reference..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Allowed Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      form.allowedScopes.includes(scope)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border',
                    )}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                SCA Approach
              </label>
              <select
                className={inputCls}
                value={form.scaApproach}
                onChange={(e) => setForm((f) => ({ ...f, scaApproach: e.target.value }))}
              >
                {SCA_APPROACHES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit as unknown as () => void}
              disabled={isPending || !form.tppName || !form.authorizationNumber || !form.nationalAuthority}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Register TPP
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
