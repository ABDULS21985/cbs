import { useState } from 'react';
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

const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

// ─── Component ──────────────────────────────────────────────────────────────

export function WebhookConfigForm({ open, onClose, onSubmit, isPending }: WebhookConfigFormProps) {
  const [form, setForm] = useState<WebhookFormData>({
    url: '',
    events: [],
    authType: 'NONE',
    secretKey: '',
  });
  const [showSecret, setShowSecret] = useState(false);

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
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Slide-over sheet */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Register Webhook</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* URL */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
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
          </div>

          {/* Events */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Events ({form.events.length} selected)
            </label>
            <div className="space-y-3">
              {Object.entries(groupedEvents).map(([group, events]) => (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {events.map((event) => (
                      <label
                        key={event.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                          form.events.includes(event.id)
                            ? 'bg-primary/5 border-primary/30'
                            : 'hover:bg-muted',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={form.events.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                          className="rounded border-border"
                        />
                        <div>
                          <span className="text-sm font-medium">{event.label}</span>
                          <span className="text-xs text-muted-foreground ml-2 font-mono">
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

          {/* Auth Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Authentication Type
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

          {/* Secret Key */}
          {form.authType !== 'NONE' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Secret Key
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                >
                  {showSecret ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Retry Policy */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Retry Policy
            </label>
            <div className="rounded-lg border bg-muted/30 p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-1.5 font-medium">Attempt</th>
                    <th className="text-left pb-1.5 font-medium">Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {RETRY_POLICY.map((r) => (
                    <tr key={r.attempt} className="border-t border-border/50">
                      <td className="py-1.5 tabular-nums">{r.attempt}</td>
                      <td className="py-1.5">{r.delay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || form.events.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
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
