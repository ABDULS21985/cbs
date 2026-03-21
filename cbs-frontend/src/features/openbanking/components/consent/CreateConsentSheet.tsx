import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TppScopeSelector } from '../tpp/TppScopeSelector';
import type { TppClient } from '../../api/openBankingApi';

interface CreateConsentSheetProps {
  open: boolean;
  onClose: () => void;
  tppClients: TppClient[];
  onSubmit: (
    payload: {
      clientId: string;
      customerId: number;
      consentType: string;
      permissions: string[];
      accountIds?: number[];
      validityMinutes: number;
    },
    callbacks: { onSuccess: () => void; onError: () => void },
  ) => void;
  isPending: boolean;
}

const EXPIRY_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: 'Custom', days: 0 },
];

export function CreateConsentSheet({ open, onClose, tppClients, onSubmit, isPending }: CreateConsentSheetProps) {
  const [form, setForm] = useState({
    clientId: '',
    customerId: '',
    scopes: [] as string[],
    accountIdsInput: '',
    expiryDays: 90,
    customExpiry: '',
  });

  if (!open) return null;

  const inputCls =
    'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

  const selectedTpp = tppClients.find((t) => t.clientId === form.clientId);

  const getValidityMinutes = (): number => {
    if (form.expiryDays === 0 && form.customExpiry) {
      const now = Date.now();
      const end = new Date(form.customExpiry).getTime();
      return Math.max(1, Math.round((end - now) / 60_000));
    }
    return (form.expiryDays || 90) * 24 * 60;
  };

  const parseAccountIds = (): number[] | undefined => {
    const parsed = form.accountIdsInput
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    return parsed.length ? parsed : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      {
        clientId: form.clientId,
        customerId: Number(form.customerId),
        consentType: selectedTpp?.clientType ?? 'TPP_AISP',
        permissions: form.scopes,
        accountIds: parseAccountIds(),
        validityMinutes: getValidityMinutes(),
      },
      {
        onSuccess: () => {
          toast.success('Consent created successfully');
          setForm({ clientId: '', customerId: '', scopes: [], accountIdsInput: '', expiryDays: 90, customExpiry: '' });
          onClose();
        },
        onError: () => toast.error('Failed to create consent'),
      },
    );
  };

  const handleClose = () => {
    setForm({ clientId: '', customerId: '', scopes: [], accountIdsInput: '', expiryDays: 90, customExpiry: '' });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleClose} />
      <div className="fixed inset-0 flex justify-end z-50">
        <div
          className="w-full max-w-lg bg-card shadow-2xl border-l flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold">Create Consent</h2>
            <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* TPP Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">TPP Client</label>
                <select
                  required
                  className={inputCls}
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                >
                  <option value="" disabled>Select a TPP client...</option>
                  {tppClients
                    .filter((t) => t.status === 'ACTIVE')
                    .map((t) => (
                      <option key={t.clientId} value={t.clientId}>
                        {t.name} ({t.clientId})
                      </option>
                    ))}
                </select>
              </div>

              {/* Customer ID */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer ID</label>
                <input
                  required
                  type="number"
                  className={inputCls}
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                  placeholder="e.g. 1001"
                />
              </div>

              {/* Account IDs */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Account IDs (optional)</label>
                <input
                  className={inputCls}
                  value={form.accountIdsInput}
                  onChange={(e) => setForm((f) => ({ ...f, accountIdsInput: e.target.value }))}
                  placeholder="e.g. 1002001,1002002"
                />
              </div>

              {/* Scopes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Scopes</label>
                <TppScopeSelector
                  selectedScopes={form.scopes}
                  onChange={(scopes) => setForm((f) => ({ ...f, scopes }))}
                  clientType={selectedTpp?.clientType}
                  autoSelect={false}
                />
              </div>

              {/* Expiry */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Consent Expiry</label>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, expiryDays: opt.days }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        form.expiryDays === opt.days
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.expiryDays === 0 && (
                  <input
                    type="date"
                    className={cn(inputCls, 'mt-2')}
                    value={form.customExpiry}
                    onChange={(e) => setForm((f) => ({ ...f, customExpiry: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !form.clientId ||
                    !form.customerId ||
                    form.scopes.length === 0 ||
                    (form.expiryDays === 0 && !form.customExpiry)
                  }
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Consent
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
