import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegisterPsd2Tpp } from '../../hooks/usePsd2';
import { toast } from 'sonner';

interface TppRegistrationFormProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_ROLES = ['AISP', 'PISP', 'CBPII'] as const;

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

export function TppRegistrationForm({ open, onClose }: TppRegistrationFormProps) {
  const { mutate: registerTpp, isPending } = useRegisterPsd2Tpp();
  const [form, setForm] = useState({
    tppName: '',
    registrationNumber: '',
    nationalCompetentAuthority: '',
    eidasCertRef: '',
    roles: [] as string[],
    contactEmail: '',
    contactPhone: '',
  });

  const toggleRole = (role: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
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
          registrationNumber: '',
          nationalCompetentAuthority: '',
          eidasCertRef: '',
          roles: [],
          contactEmail: '',
          contactPhone: '',
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
            <h2 className="text-base font-semibold">Register TPP</h2>
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
                Registration Number *
              </label>
              <input
                required
                className={inputCls}
                value={form.registrationNumber}
                onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                placeholder="e.g. FRN-123456"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                National Competent Authority *
              </label>
              <input
                required
                className={inputCls}
                value={form.nationalCompetentAuthority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nationalCompetentAuthority: e.target.value }))
                }
                placeholder="e.g. FCA, BaFin, ACPR"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                eIDAS Certificate Reference
              </label>
              <input
                className={inputCls}
                value={form.eidasCertRef}
                onChange={(e) => setForm((f) => ({ ...f, eidasCertRef: e.target.value }))}
                placeholder="e.g. PSD2-CERT-00123"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Roles *
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      form.roles.includes(role)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border',
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                AISP = Account Information, PISP = Payment Initiation, CBPII = Card-Based Payment
                Instrument Issuer
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Contact Email *
              </label>
              <input
                required
                type="email"
                className={inputCls}
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="compliance@fintech.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Contact Phone
              </label>
              <input
                type="tel"
                className={inputCls}
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+44 20 1234 5678"
              />
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
              disabled={isPending || form.roles.length === 0 || !form.tppName || !form.registrationNumber}
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
