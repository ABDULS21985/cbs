import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Loader2, Plus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WebhookFormData {
  url: string;
  events: string[];
  authType: 'NONE' | 'BASIC' | 'BEARER' | 'HMAC';
  secretKey: string;
}

interface WebhookConfigFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WebhookFormData) => Promise<void>;
  isPending: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AVAILABLE_EVENTS = [
  { id: 'payment.completed', label: 'Payment Completed', group: 'Payments' },
  { id: 'consent.granted', label: 'Consent Granted', group: 'Consents' },
  { id: 'consent.revoked', label: 'Consent Revoked', group: 'Consents' },
  { id: 'account.updated', label: 'Account Updated', group: 'Accounts' },
  { id: 'transaction.created', label: 'Transaction Created', group: 'Transactions' },
  { id: 'tpp.registered', label: 'TPP Registered', group: 'TPP' },
] as const;

const AUTH_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'BASIC', label: 'Basic Auth' },
  { value: 'BEARER', label: 'Bearer Token' },
  { value: 'HMAC', label: 'HMAC Signature' },
] as const;

const RETRY_POLICY = [
  { attempt: 1, delay: 'Immediate' },
  { attempt: 2, delay: '1 minute' },
  { attempt: 3, delay: '5 minutes' },
  { attempt: 4, delay: '30 minutes' },
  { attempt: 5, delay: '2 hours' },
];

const inputCls = 'ob-page-input';

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhookConfigForm({ open, onClose, onSubmit, isPending }: WebhookConfigFormProps) {
  const [form, setForm] = useState<WebhookFormData>({
    url: '',
    events: [],
    authType: 'NONE',
    secretKey: '',
  });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      url: '',
      events: [],
      authType: 'NONE',
      secretKey: '',
    });
    setShowSecret(false);
  }, [open]);

  if (!open) return null;

  const toggleEvent = (eventId: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(eventId)
        ? f.events.filter((e) => e !== eventId)
        : [...f.events, eventId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url || form.events.length === 0) {
      toast.error('Please provide a URL and select at least one event');
      return;
    }
    if (form.authType !== 'NONE' && !form.secretKey) {
      toast.error('Please provide a secret key for the selected auth type');
      return;
    }
    await onSubmit(form);
  };

  const groupedEvents = AVAILABLE_EVENTS.reduce(
    (acc, event) => {
      if (!acc[event.group]) acc[event.group] = [];
      acc[event.group].push(event);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_EVENTS[number][]>,
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Register Webhook"
        className="ob-page-sheet flex animate-in flex-col slide-in-from-right duration-300"
      >
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ob-page-kicker">New registration</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Register Webhook
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Configure the live endpoint, delivery events, and authentication policy used for
                outbound notifications.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border/70 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form id="webhook-config-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            <div className="ob-page-soft-card">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Webhook URL
              </label>
              <input
                required
                type="url"
                className={inputCls}
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://api.example.com/webhooks"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                The destination must accept signed event payloads from the live marketplace service.
              </p>
            </div>

            <div className="ob-page-soft-card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Event coverage
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {form.events.length} event{form.events.length === 1 ? '' : 's'} selected.
                  </p>
                </div>
                <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                  Live topics
                </div>
              </div>
              <div className="space-y-4">
                {Object.entries(groupedEvents).map(([group, events]) => (
                  <div key={group}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {group}
                    </p>
                    <div className="space-y-2">
                      {events.map((event) => (
                        <label
                          key={event.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors',
                            form.events.includes(event.id)
                              ? 'border-primary/30 bg-primary/6'
                              : 'border-border/70 bg-background/70 hover:bg-muted/60',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={form.events.includes(event.id)}
                            onChange={() => toggleEvent(event.id)}
                            className="mt-1 rounded border-border"
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground">{event.label}</span>
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {event.id}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ob-page-soft-card space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Authentication type
                </label>
                <select
                  className={inputCls}
                  value={form.authType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      authType: e.target.value as WebhookFormData['authType'],
                    }))
                  }
                >
                  {AUTH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.authType !== 'NONE' && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Secret key
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      className={cn(inputCls, 'pr-10')}
                      value={form.secretKey}
                      onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))}
                      placeholder="Enter secret key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-[1.1rem] border border-border/70 bg-background/70 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Retry policy
                </label>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <th className="pb-2">Attempt</th>
                      <th className="pb-2">Delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RETRY_POLICY.map((r) => (
                      <tr key={r.attempt} className="border-t border-border/60">
                        <td className="py-2 tabular-nums text-foreground">{r.attempt}</td>
                        <td className="py-2 text-muted-foreground">{r.delay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-border/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="webhook-config-form"
            disabled={isPending || form.events.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Register Webhook
          </button>
        </div>
      </div>
    </>
  );
}
